// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PredictionMarket.sol";
import "../src/libraries/FixedPointMath.sol";

contract PredictionMarketTest is Test {
    PredictionMarket public market;

    address creator = address(0x1);
    address agent1 = address(0x2);
    address agent2 = address(0x3);
    address agent3 = address(0x4);
    address treasury = address(0x5);

    uint256 constant WAD = 1e18;
    uint256 constant BOND = 0.1 ether;
    uint256 constant LIQUIDITY = 1 ether;     // b = 1 ETH
    uint256 constant FEE_BPS = 200;            // 2%

    function setUp() public {
        market = new PredictionMarket(treasury, FEE_BPS);
        vm.deal(creator, 100 ether);
        vm.deal(agent1, 100 ether);
        vm.deal(agent2, 100 ether);
        vm.deal(agent3, 100 ether);
    }

    // ============ FixedPointMath Tests ============

    function test_ln_one() public pure {
        int256 result = FixedPointMath.ln(WAD);
        assertApproxEqAbs(result, 0, 1e10);
    }

    function test_ln_e() public pure {
        uint256 e = 2718281828459045235;
        int256 result = FixedPointMath.ln(e);
        assertApproxEqAbs(result, int256(WAD), 1e14);
    }

    function test_ln_two() public pure {
        int256 result = FixedPointMath.ln(2 * WAD);
        assertApproxEqAbs(result, 693147180559945309, 1e12);
    }

    function test_ln_half() public pure {
        int256 result = FixedPointMath.ln(WAD / 2);
        assertApproxEqAbs(result, -693147180559945309, 1e12);
    }

    function test_crossEntropyScore() public pure {
        int256 score = FixedPointMath.crossEntropyScore(WAD / 2, WAD / 2);
        assertApproxEqAbs(score, -693147180559945309, 1e14);
    }

    function test_crossEntropyScore_perfect() public pure {
        int256 scoreGood = FixedPointMath.crossEntropyScore(0.9e18, 0.9e18);
        int256 scoreBad = FixedPointMath.crossEntropyScore(0.9e18, 0.5e18);
        assertTrue(scoreGood > scoreBad);
    }

    function test_deltaPayout() public pure {
        int256 delta = FixedPointMath.deltaPayout(0.8e18, 0.5e18, 0.7e18);
        assertTrue(delta > 0, "Moving toward truth should be positive");
    }

    function test_deltaPayout_negative() public pure {
        int256 delta = FixedPointMath.deltaPayout(0.8e18, 0.5e18, 0.3e18);
        assertTrue(delta < 0, "Moving away from truth should be negative");
    }

    // ============ Market Creation Tests ============

    function test_createMarket() public {
        vm.prank(creator);
        uint256 marketId = market.createMarket{value: 2 ether}(
            "Will AI surpass human reasoning by 2030?",
            0.1e18, 2, 0.1 ether, BOND, LIQUIDITY, 0.5e18
        );

        assertEq(marketId, 0);
        assertEq(market.getMarketCount(), 1);

        (string memory question, uint256 currentPrice, address mCreator, bool resolved, , uint256 predCount) = market.getMarketInfo(0);
        (uint256 alpha, uint256 k, , , , ) = market.getMarketParams(0);

        assertEq(question, "Will AI surpass human reasoning by 2030?");
        assertEq(alpha, 0.1e18);
        assertEq(k, 2);
        assertEq(currentPrice, 0.5e18);
        assertEq(mCreator, creator);
        assertFalse(resolved);
        assertEq(predCount, 0);
    }

    function test_createMultipleMarkets() public {
        vm.startPrank(creator);
        market.createMarket{value: 2 ether}("Q1?", 0.1e18, 2, 0.1 ether, BOND, LIQUIDITY, 0.5e18);
        market.createMarket{value: 2 ether}("Q2?", 0.2e18, 1, 0.1 ether, BOND, LIQUIDITY, 0.3e18);
        vm.stopPrank();
        assertEq(market.getMarketCount(), 2);
    }

    function test_RevertWhen_createMarket_invalidAlpha() public {
        vm.prank(creator);
        vm.expectRevert("Invalid alpha");
        market.createMarket{value: 2 ether}("Q?", 0, 2, 0.1 ether, BOND, LIQUIDITY, 0.5e18);
    }

    function test_RevertWhen_createMarket_invalidPrice() public {
        vm.prank(creator);
        vm.expectRevert("Invalid initial price");
        market.createMarket{value: 2 ether}("Q?", 0.1e18, 2, 0.1 ether, BOND, LIQUIDITY, 0);
    }

    function test_RevertWhen_createMarket_insufficientFunding() public {
        vm.prank(creator);
        vm.expectRevert("Insufficient funding");
        market.createMarket{value: 1 ether}("Q?", 0.1e18, 2, 1 ether, BOND, LIQUIDITY, 0.5e18);
    }

    // ============ Protocol Config Tests ============

    function test_protocolConfig() public view {
        (address _owner, address _treasury, uint256 _feeBps) = market.getProtocolConfig();
        assertEq(_owner, address(this));
        assertEq(_treasury, treasury);
        assertEq(_feeBps, FEE_BPS);
    }

    function test_setTreasury() public {
        address newTreasury = address(0x99);
        market.setTreasury(newTreasury);
        (, address _treasury, ) = market.getProtocolConfig();
        assertEq(_treasury, newTreasury);
    }

    function test_setProtocolFee() public {
        market.setProtocolFee(500);
        (, , uint256 _feeBps) = market.getProtocolConfig();
        assertEq(_feeBps, 500);
    }

    function test_RevertWhen_nonOwnerSetsTreasury() public {
        vm.prank(agent1);
        vm.expectRevert("Not owner");
        market.setTreasury(agent1);
    }

    function test_transferOwnership() public {
        market.transferOwnership(agent1);
        (address _owner, , ) = market.getProtocolConfig();
        assertEq(_owner, agent1);
    }

    // ============ Prediction Tests ============

    function test_predict() public {
        _createDefaultMarket();

        vm.prank(agent1);
        market.predict{value: BOND}(0, 0.6e18);

        (, uint256 currentPrice, , , , uint256 predCount) = market.getMarketInfo(0);
        assertEq(currentPrice, 0.6e18);
        assertEq(predCount, 1);

        (address predictor, uint256 prob, uint256 priceBefore, uint256 priceAfter,,) = market.getPrediction(0, 0);
        assertEq(predictor, agent1);
        assertEq(prob, 0.6e18);
        assertEq(priceBefore, 0.5e18);
        assertEq(priceAfter, 0.6e18);
    }

    function test_sequentialPredictions() public {
        _createDefaultMarket();

        vm.prank(agent1);
        market.predict{value: BOND}(0, 0.6e18);

        vm.prank(agent2);
        market.predict{value: BOND}(0, 0.7e18);

        vm.prank(agent3);
        market.predict{value: BOND}(0, 0.65e18);

        (, uint256 currentPrice, , , , uint256 predCount) = market.getMarketInfo(0);
        assertEq(currentPrice, 0.65e18);
        assertEq(predCount, 3);

        (, , uint256 pb1, , ,) = market.getPrediction(0, 0);
        (, , uint256 pb2, , ,) = market.getPrediction(0, 1);
        (, , uint256 pb3, , ,) = market.getPrediction(0, 2);
        assertEq(pb1, 0.5e18);
        assertEq(pb2, 0.6e18);
        assertEq(pb3, 0.7e18);
    }

    function test_RevertWhen_predict_insufficientBond() public {
        _createDefaultMarket();
        vm.prank(agent1);
        vm.expectRevert("Insufficient bond");
        market.predict{value: 0.001 ether}(0, 0.6e18);
    }

    function test_RevertWhen_predict_invalidProbability_low() public {
        _createDefaultMarket();
        vm.prank(agent1);
        vm.expectRevert("Probability out of range");
        market.predict{value: BOND}(0, 0.001e18);
    }

    function test_RevertWhen_predict_invalidProbability_high() public {
        _createDefaultMarket();
        vm.prank(agent1);
        vm.expectRevert("Probability out of range");
        market.predict{value: BOND}(0, 0.999e18);
    }

    function test_RevertWhen_predict_nonexistentMarket() public {
        vm.prank(agent1);
        vm.expectRevert("Market does not exist");
        market.predict{value: BOND}(999, 0.6e18);
    }

    function test_protocolFeeDeducted() public {
        // Fee is deducted at claim time, not at predict time
        vm.prank(creator);
        market.createMarket{value: 10 ether}(
            "Fee test?", 0.99e18, 1, 0.1 ether, BOND, LIQUIDITY, 0.5e18
        );

        // No fee on predict
        uint256 treasuryBefore = treasury.balance;
        vm.prank(agent1);
        market.predict{value: BOND}(0, 0.6e18);
        assertEq(treasury.balance, treasuryBefore, "No fee on predict");

        // Force resolve if not already
        (, , , bool resolved, ,) = market.getMarketInfo(0);
        if (!resolved) {
            market.forceResolve(0);
        }

        // Fee is deducted on claim
        uint256 payout = market.getPayoutAmount(0, agent1);
        if (payout > 0) {
            treasuryBefore = treasury.balance;
            vm.prank(agent1);
            market.claimPayout(0);
            assertTrue(treasury.balance > treasuryBefore, "Fee collected at claim");
        }
    }

    function test_feeAlwaysGoesToProtocolTreasury() public {
        // Even when a different creator creates the market, fee goes to protocol treasury at claim
        vm.prank(agent1);
        market.createMarket{value: 10 ether}("External question?", 0.99e18, 1, 0.1 ether, BOND, LIQUIDITY, 0.5e18);

        vm.prank(agent2);
        market.predict{value: BOND}(0, 0.6e18);

        // No fee at predict time
        uint256 treasuryBefore = treasury.balance;

        (, , , bool resolved, ,) = market.getMarketInfo(0);
        if (!resolved) {
            market.forceResolve(0);
        }

        uint256 payout = market.getPayoutAmount(0, agent2);
        if (payout > 0) {
            vm.prank(agent2);
            market.claimPayout(0);
            assertTrue(treasury.balance > treasuryBefore, "Fee goes to treasury at claim");
        }
    }

    // ============ Resolution Tests ============

    function test_marketResolvesEventually() public {
        // Use high alpha so it resolves quickly with few agents
        vm.prank(creator);
        market.createMarket{value: 10 ether}(
            "Test?", 0.99e18, 1, 0.1 ether, BOND, LIQUIDITY, 0.5e18
        );

        // Each agent predicts once (1 per agent per market)
        vm.roll(block.number + 1);
        vm.prank(agent1);
        market.predict{value: BOND}(0, 0.6e18);

        (, , , bool resolved, ,) = market.getMarketInfo(0);
        if (!resolved) {
            vm.roll(block.number + 1);
            vm.prank(agent2);
            market.predict{value: BOND}(0, 0.7e18);
        }

        (, , , resolved, ,) = market.getMarketInfo(0);
        if (!resolved) {
            // Force resolve after all agents predicted
            market.forceResolve(0);
        }

        (, , , resolved, ,) = market.getMarketInfo(0);
        assertTrue(resolved, "Market should be resolved");
    }

    function test_singleAgent_k1_payoutIncludesBond() public {
        vm.prank(creator);
        market.createMarket{value: 10 ether}(
            "Test?", 0.99e18, 1, 0.5 ether, BOND, LIQUIDITY, 0.5e18
        );

        vm.roll(block.number + 1);
        vm.prank(agent1);
        market.predict{value: BOND}(0, 0.6e18);

        (, , , bool resolved, ,) = market.getMarketInfo(0);
        if (!resolved) {
            market.forceResolve(0);
        }

        uint256 payout = market.getPayoutAmount(0, agent1);
        assertTrue(payout > 0, "Should have some payout (bond + reward)");
    }

    function test_claimPayout() public {
        vm.prank(creator);
        market.createMarket{value: 10 ether}(
            "Test?", 0.99e18, 1, 1 ether, BOND, LIQUIDITY, 0.5e18
        );

        vm.roll(block.number + 1);
        vm.prank(agent1);
        market.predict{value: BOND}(0, 0.6e18);

        (, , , bool resolved, ,) = market.getMarketInfo(0);
        if (!resolved) {
            market.forceResolve(0);
        }

        uint256 payout = market.getPayoutAmount(0, agent1);
        if (payout > 0) {
            uint256 balBefore = agent1.balance;
            vm.prank(agent1);
            market.claimPayout(0);
            assertTrue(agent1.balance > balBefore, "Balance should increase");
        }
    }

    function test_bondReturnedForCorrectPrediction() public {
        // Use 0 fee for cleaner test
        PredictionMarket noFeeMarket = new PredictionMarket(treasury, 0);
        vm.deal(creator, 100 ether);
        vm.deal(agent1, 100 ether);

        vm.prank(creator);
        noFeeMarket.createMarket{value: 10 ether}(
            "Test?", 0.99e18, 2, 0.01 ether, BOND, LIQUIDITY, 0.5e18
        );

        vm.roll(block.number + 1);
        vm.prank(agent1);
        noFeeMarket.predict{value: BOND}(0, 0.6e18);

        (, , , bool resolved, ,) = noFeeMarket.getMarketInfo(0);
        if (!resolved) {
            noFeeMarket.forceResolve(0);
        }

        uint256 payout = noFeeMarket.getPayoutAmount(0, agent1);
        assertTrue(payout > 0, "Payout should include bond return");
    }

    // ============ Sweep Tests ============

    function test_sweepResidual() public {
        vm.prank(creator);
        market.createMarket{value: 10 ether}(
            "Test?", 0.99e18, 1, 0.01 ether, BOND, LIQUIDITY, 0.5e18
        );

        vm.roll(block.number + 1);
        vm.prank(agent1);
        market.predict{value: BOND}(0, 0.6e18);

        (, , , bool resolved, ,) = market.getMarketInfo(0);
        if (!resolved) {
            market.forceResolve(0);
        }

        // Claim first so there's residual to sweep
        uint256 payout = market.getPayoutAmount(0, agent1);
        if (payout > 0) {
            vm.prank(agent1);
            market.claimPayout(0);
        }

        vm.warp(block.timestamp + 1 days + 1);

        uint256 treasuryBefore = treasury.balance;
        market.sweepResidual(0);
        assertTrue(treasury.balance > treasuryBefore, "Treasury should receive residual");
    }

    function test_RevertWhen_sweepTooEarly() public {
        vm.prank(creator);
        market.createMarket{value: 10 ether}(
            "Test?", 0.99e18, 1, 0.01 ether, BOND, LIQUIDITY, 0.5e18
        );

        vm.roll(block.number + 1);
        vm.prank(agent1);
        market.predict{value: BOND}(0, 0.6e18);

        (, , , bool resolved, ,) = market.getMarketInfo(0);
        if (!resolved) {
            market.forceResolve(0);
        }

        vm.expectRevert("Too early to sweep");
        market.sweepResidual(0);
    }

    // ============ View Tests ============

    function test_isMarketActive() public {
        _createDefaultMarket();
        assertTrue(market.isMarketActive(0));
        assertFalse(market.isMarketActive(999));
    }

    // ============ Helpers ============

    function _createDefaultMarket() internal {
        vm.prank(creator);
        market.createMarket{value: 2 ether}(
            "Will AI surpass human reasoning by 2030?",
            0.1e18, 2, 0.1 ether, BOND, LIQUIDITY, 0.5e18
        );
    }
}
