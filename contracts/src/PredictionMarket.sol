// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./libraries/FixedPointMath.sol";

/// @title Yiling Protocol - PredictionMarket
/// @notice Oracle-free self-resolving prediction market using SKC (Srinivasan-Karger-Chen) mechanism
/// @dev Bond-based adaptation of the SKC mechanism:
///      - Agents post a bond (deposit) when predicting
///      - Resolution: payout = max(0, bond + b × SCEM(qFinal, q(t), q(t-1)))
///      - Last k agents: payout = bond + R (flat fee)
///      - Bond clipping means creator cost is NOT bounded by b×ln(2)
///      - Pro-rata scaling protects against pool insufficiency in zigzag scenarios
///      - Protocol fee and treasury are set at deploy time (not per-market)
contract PredictionMarket {
    using FixedPointMath for uint256;

    // ============ Constants ============
    uint256 public constant WAD = 1e18;
    uint256 public constant MIN_PROBABILITY = 0.01e18; // 1%
    uint256 public constant MAX_PROBABILITY = 0.99e18; // 99%
    uint256 public constant MAX_FEE_BPS = 1000;        // 10% max protocol fee
    uint256 public constant LN2_WAD = 693147180559945309; // ln(2) in WAD

    // ============ Protocol Config (set at deploy, owner can update) ============
    address public owner;
    address public treasury;
    uint256 public protocolFeeBps;

    // ============ Structs ============
    struct Market {
        string question;
        uint256 alpha;            // Stop probability per prediction (WAD)
        uint256 k;                // Last k agents get flat reward
        uint256 flatReward;       // R - flat reward amount in wei
        uint256 bondAmount;       // Required bond (deposit) per prediction
        uint256 liquidityParam;   // b - SCEM scaling parameter (in wei)
        uint256 currentPrice;     // Current market price (WAD: 0-1e18)
        uint256 createdAt;
        address creator;
        bool resolved;
        uint256 totalPool;        // Total funds available (creator funding + bonds)
        uint256 totalBonds;       // Sum of all bonds deposited
    }

    struct Prediction {
        address predictor;
        uint256 probability;   // WAD format (0-1e18)
        uint256 priceBefore;   // Price before this prediction
        uint256 priceAfter;    // Price after (= this prediction's probability)
        uint256 bond;          // Bond deposited for this prediction
        uint256 timestamp;
    }

    // ============ State ============
    uint256 public marketCount;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => Prediction[]) public predictions;
    mapping(uint256 => mapping(address => uint256)) public payouts;   // marketId => predictor => payout (unsigned, post-resolution)
    mapping(uint256 => mapping(address => bool)) public hasClaimed;   // marketId => predictor => claimed
    mapping(uint256 => uint256) public totalPayoutsAllocated;         // marketId => sum of all raw payouts
    mapping(uint256 => uint256) public totalPayoutsClaimed;          // marketId => sum of all claimed payouts
    mapping(uint256 => uint256) public payoutScaleFactor;            // marketId => WAD-scaled factor (WAD = no scaling)
    mapping(uint256 => mapping(address => bool)) public hasPredicted; // marketId => predictor => already predicted

    // ============ Events ============
    event MarketCreated(uint256 indexed marketId, string question, uint256 alpha, uint256 initialPrice, address creator, uint256 liquidityParam, uint256 bondAmount);
    event PredictionMade(uint256 indexed marketId, address indexed predictor, uint256 probability, uint256 priceBefore, uint256 predictionIndex);
    event MarketResolved(uint256 indexed marketId, uint256 finalPrice, uint256 totalPredictions);
    event PayoutClaimed(uint256 indexed marketId, address indexed predictor, uint256 amount);
    event ProtocolFeeCollected(uint256 indexed marketId, address treasury, uint256 amount);
    event ResidualSwept(uint256 indexed marketId, address treasury, uint256 amount);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event OwnerTransferred(address oldOwner, address newOwner);

    // ============ Modifiers ============
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ============ Constructor ============
    constructor(address _treasury, uint256 _protocolFeeBps) {
        require(_treasury != address(0), "Invalid treasury");
        require(_protocolFeeBps <= MAX_FEE_BPS, "Fee too high");
        owner = msg.sender;
        treasury = _treasury;
        protocolFeeBps = _protocolFeeBps;
    }

    // ============ Owner Functions ============

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function setProtocolFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "Fee too high");
        emit FeeUpdated(protocolFeeBps, _feeBps);
        protocolFeeBps = _feeBps;
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        emit OwnerTransferred(owner, _newOwner);
        owner = _newOwner;
    }

    // ============ Market Creation ============

    /// @notice Create a new prediction market
    /// @param question The question to predict on
    /// @param alpha Stop probability per prediction (WAD, e.g., 0.1e18 = 10%)
    /// @param k Number of last agents that receive flat reward
    /// @param flatReward Flat reward amount per agent (in wei)
    /// @param bondAmount Required bond per prediction (in wei)
    /// @param liquidityParam b - SCEM scaling parameter (in wei, e.g., 1e18 = 1 ETH)
    /// @param initialPrice Initial market price (WAD, e.g., 0.5e18 = 50%)
    function createMarket(
        string calldata question,
        uint256 alpha,
        uint256 k,
        uint256 flatReward,
        uint256 bondAmount,
        uint256 liquidityParam,
        uint256 initialPrice
    ) external payable returns (uint256 marketId) {
        require(alpha > 0 && alpha < WAD, "Invalid alpha");
        require(initialPrice >= MIN_PROBABILITY && initialPrice <= MAX_PROBABILITY, "Invalid initial price");
        require(liquidityParam > 0, "Invalid liquidity param");
        require(bondAmount > 0, "Invalid bond amount");
        require(msg.value >= flatReward * k + (liquidityParam * LN2_WAD) / WAD, "Insufficient funding");

        marketId = marketCount++;

        Market storage m = markets[marketId];
        m.question = question;
        m.alpha = alpha;
        m.k = k;
        m.flatReward = flatReward;
        m.bondAmount = bondAmount;
        m.liquidityParam = liquidityParam;
        m.currentPrice = initialPrice;
        m.createdAt = block.timestamp;
        m.creator = msg.sender;
        m.totalPool = msg.value;

        emit MarketCreated(marketId, question, alpha, initialPrice, msg.sender, liquidityParam, bondAmount);
    }

    /// @notice Make a prediction on a market
    /// @param marketId The market to predict on
    /// @param probability The predicted probability (WAD format, 0.01e18 to 0.99e18)
    function predict(uint256 marketId, uint256 probability) external payable {
        Market storage m = markets[marketId];
        require(!m.resolved, "Market already resolved");
        require(m.createdAt > 0, "Market does not exist");
        require(msg.value >= m.bondAmount, "Insufficient bond");
        require(probability >= MIN_PROBABILITY && probability <= MAX_PROBABILITY, "Probability out of range");
        require(!hasPredicted[marketId][msg.sender], "Already predicted in this market");

        hasPredicted[marketId][msg.sender] = true;
        uint256 bond = msg.value;

        uint256 priceBefore = m.currentPrice;

        Prediction memory pred = Prediction({
            predictor: msg.sender,
            probability: probability,
            priceBefore: priceBefore,
            priceAfter: probability,
            bond: bond,
            timestamp: block.timestamp
        });

        uint256 predIndex = predictions[marketId].length;
        predictions[marketId].push(pred);

        // Update current price — full bond goes to pool (fee deducted at claim)
        m.currentPrice = probability;
        m.totalPool += bond;
        m.totalBonds += bond;

        emit PredictionMade(marketId, msg.sender, probability, priceBefore, predIndex);

        // Random stop check using blockhash
        uint256 randomValue = uint256(
            keccak256(abi.encodePacked(blockhash(block.number - 1), marketId, predIndex))
        ) % WAD;

        if (randomValue < m.alpha) {
            _resolveMarket(marketId);
        }
    }

    // ============ Resolution ============

    /// @notice Internal market resolution using SKC mechanism
    /// @dev For each agent i:
    ///   - If i < numPreds - k: payout = max(0, bond + b × SCEM(qFinal, q(i), q(i-1)))
    ///   - If i >= numPreds - k: payout = bond + R (flat fee for last k agents)
    function _resolveMarket(uint256 marketId) internal {
        Market storage m = markets[marketId];
        m.resolved = true;

        Prediction[] storage preds = predictions[marketId];
        uint256 numPreds = preds.length;

        if (numPreds == 0) {
            emit MarketResolved(marketId, m.currentPrice, 0);
            return;
        }

        // qFinal = last prediction's probability (the "truth" in SKC)
        uint256 qFinal = preds[numPreds - 1].probability;

        // kActual: can't have more flat-reward agents than total predictions
        uint256 kActual = m.k < numPreds ? m.k : numPreds;

        uint256 totalAllocated = 0;

        for (uint256 i = 0; i < numPreds; i++) {
            Prediction storage pred = preds[i];
            uint256 payout;

            if (i >= numPreds - kActual) {
                // Last k agents: bond returned + flat reward R
                payout = pred.bond + m.flatReward;
            } else {
                // Scored agents: bond + b × SCEM(qFinal, q(i), q(i-1))
                int256 scemDelta = FixedPointMath.deltaPayout(
                    qFinal,
                    pred.priceBefore,
                    pred.priceAfter
                );

                // Scale by liquidity parameter b: scoredPayout = b × SCEM / WAD
                int256 scoredPayout = (int256(m.liquidityParam) * scemDelta) / int256(WAD);

                // payout = max(0, bond + scoredPayout)
                int256 rawPayout = int256(pred.bond) + scoredPayout;
                payout = rawPayout > 0 ? uint256(rawPayout) : 0;
            }

            // Store payout for this predictor
            payouts[marketId][pred.predictor] += payout;
            totalAllocated += payout;
        }

        totalPayoutsAllocated[marketId] = totalAllocated;

        // Pro-rata scaling: if payouts exceed pool, scale all payouts proportionally
        if (totalAllocated > m.totalPool) {
            payoutScaleFactor[marketId] = (m.totalPool * WAD) / totalAllocated;
        } else {
            payoutScaleFactor[marketId] = WAD; // 1.0 — no scaling needed
        }

        emit MarketResolved(marketId, qFinal, numPreds);
    }

    /// @notice Force-resolve an unresolved market (owner anytime, anyone after 2 days)
    /// @dev Uses the same SKC payout logic as random resolution
    function forceResolve(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(!m.resolved, "Already resolved");
        require(m.createdAt > 0, "Market does not exist");
        require(
            msg.sender == owner || block.timestamp >= m.createdAt + 2 days,
            "Not authorized or too early"
        );

        _resolveMarket(marketId);
    }

    // ============ Claims ============

    /// @notice Claim your payout from a resolved market
    /// @param marketId The market to claim from
    function claimPayout(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(m.resolved, "Market not resolved");
        require(!hasClaimed[marketId][msg.sender], "Already claimed");

        uint256 rawPayout = payouts[marketId][msg.sender];
        require(rawPayout > 0, "No payout available");

        // Apply pro-rata scaling (WAD = no scaling, < WAD = pool was insufficient)
        uint256 payout = (rawPayout * payoutScaleFactor[marketId]) / WAD;

        // Protocol fee deducted from payout (not from bond deposit)
        uint256 fee = 0;
        if (protocolFeeBps > 0) {
            fee = (payout * protocolFeeBps) / 10000;
        }
        uint256 netPayout = payout - fee;

        hasClaimed[marketId][msg.sender] = true;

        // Safety cap at available pool
        if (netPayout + fee > m.totalPool) {
            // Scale down proportionally if pool can't cover full amount
            netPayout = (m.totalPool * (10000 - protocolFeeBps)) / 10000;
            fee = m.totalPool - netPayout;
        }
        m.totalPool -= (netPayout + fee);
        totalPayoutsClaimed[marketId] += (netPayout + fee);

        // Send fee to treasury
        if (fee > 0) {
            (bool feeSuccess, ) = treasury.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
            emit ProtocolFeeCollected(marketId, treasury, fee);
        }

        // Send payout to agent
        (bool success, ) = msg.sender.call{value: netPayout}("");
        require(success, "Transfer failed");

        emit PayoutClaimed(marketId, msg.sender, netPayout);
    }

    // ============ Sweep ============

    /// @notice Sweep residual funds from a resolved market to treasury
    /// @param marketId The market to sweep
    function sweepResidual(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(m.resolved, "Market not resolved");
        require(block.timestamp >= m.createdAt + 1 days, "Too early to sweep");
        require(m.totalPool > 0, "Nothing to sweep");

        // Protect unclaimed payouts: only sweep the true residual
        // Use scaled total (actual amount to be paid) not raw total
        uint256 scaledTotal = (totalPayoutsAllocated[marketId] * payoutScaleFactor[marketId]) / WAD;
        uint256 unclaimed = scaledTotal > totalPayoutsClaimed[marketId]
            ? scaledTotal - totalPayoutsClaimed[marketId]
            : 0;
        uint256 residual = m.totalPool > unclaimed ? m.totalPool - unclaimed : 0;
        require(residual > 0, "Nothing to sweep");

        m.totalPool -= residual;

        (bool success, ) = treasury.call{value: residual}("");
        require(success, "Sweep transfer failed");

        emit ResidualSwept(marketId, treasury, residual);
    }

    // ============ View Functions ============

    /// @notice Get market info (part 1: core data)
    function getMarketInfo(uint256 marketId) external view returns (
        string memory question,
        uint256 currentPrice,
        address creator,
        bool resolved,
        uint256 totalPool,
        uint256 predictionCount
    ) {
        Market storage m = markets[marketId];
        return (
            m.question,
            m.currentPrice,
            m.creator,
            m.resolved,
            m.totalPool,
            predictions[marketId].length
        );
    }

    /// @notice Get market params (part 2: configuration)
    function getMarketParams(uint256 marketId) external view returns (
        uint256 alpha,
        uint256 k,
        uint256 flatReward,
        uint256 bondAmount,
        uint256 liquidityParam,
        uint256 createdAt
    ) {
        Market storage m = markets[marketId];
        return (m.alpha, m.k, m.flatReward, m.bondAmount, m.liquidityParam, m.createdAt);
    }

    /// @notice Get protocol-level fee config
    function getProtocolConfig() external view returns (
        address _owner,
        address _treasury,
        uint256 _protocolFeeBps
    ) {
        return (owner, treasury, protocolFeeBps);
    }

    /// @notice Get market bond stats
    function getMarketBondStats(uint256 marketId) external view returns (
        uint256 totalBonds,
        uint256 totalPayouts
    ) {
        Market storage m = markets[marketId];
        return (m.totalBonds, totalPayoutsAllocated[marketId]);
    }

    /// @notice Get a specific prediction
    function getPrediction(uint256 marketId, uint256 index) external view returns (
        address predictor,
        uint256 probability,
        uint256 priceBefore,
        uint256 priceAfter,
        uint256 bond,
        uint256 timestamp
    ) {
        Prediction storage pred = predictions[marketId][index];
        return (pred.predictor, pred.probability, pred.priceBefore, pred.priceAfter, pred.bond, pred.timestamp);
    }

    /// @notice Get total prediction count for a market
    function getPredictionCount(uint256 marketId) external view returns (uint256) {
        return predictions[marketId].length;
    }

    /// @notice Get payout for an address in a market
    function getPayoutAmount(uint256 marketId, address predictor) external view returns (uint256) {
        uint256 rawPayout = payouts[marketId][predictor];
        uint256 scale = payoutScaleFactor[marketId];
        if (scale == 0) return rawPayout; // market not yet resolved
        uint256 scaledPayout = (rawPayout * scale) / WAD;
        // Return post-fee amount (what the agent will actually receive)
        uint256 fee = (scaledPayout * protocolFeeBps) / 10000;
        return scaledPayout - fee;
    }

    /// @notice Check if market is active
    function isMarketActive(uint256 marketId) external view returns (bool) {
        Market storage m = markets[marketId];
        return m.createdAt > 0 && !m.resolved;
    }

    /// @notice Get all market IDs (simple pagination)
    function getMarketCount() external view returns (uint256) {
        return marketCount;
    }

    /// @notice Allow contract to receive ETH
    receive() external payable {}
}
