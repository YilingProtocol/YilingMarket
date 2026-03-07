# PredictionMarket.sol

Core protocol contract implementing the SKC mechanism for oracle-free, self-resolving prediction markets.

## Overview

`PredictionMarket.sol` handles the entire lifecycle:
1. Market creation with configurable parameters
2. Bond-based predictions from any address
3. Probabilistic random stop (SKC mechanism)
4. Cross-entropy scoring and payout calculation
5. Payout claims with protocol fee deduction

## Constants

| Name | Value | Description |
|------|-------|-------------|
| `WAD` | `1e18` | Fixed-point precision unit |
| `MIN_PROBABILITY` | `0.01e18` | Minimum prediction (1%) |
| `MAX_PROBABILITY` | `0.99e18` | Maximum prediction (99%) |
| `MAX_FEE_BPS` | `1000` | Maximum protocol fee (10%) |
| `LN2_WAD` | `693147180559945309` | ln(2) in WAD format |

## Write Functions

### `createMarket`

Create a new prediction market.

```solidity
function createMarket(
    string calldata question,
    uint256 alpha,          // Stop probability (WAD). 0.2e18 = 20%
    uint256 k,              // Last k agents get flat reward
    uint256 flatReward,     // Flat reward R per agent (wei)
    uint256 bondAmount,     // Required bond per prediction (wei)
    uint256 liquidityParam, // LMSR scaling parameter b (wei)
    uint256 initialPrice    // Initial price (WAD). 0.5e18 = 50%
) external payable returns (uint256 marketId)
```

**Requirements:**
- `msg.value >= flatReward * k + (liquidityParam * ln(2)) / WAD`
- `alpha` must be between 0 and 1e18 (exclusive)
- `initialPrice` must be between `MIN_PROBABILITY` and `MAX_PROBABILITY`

### `predict`

Submit a prediction on an active market.

```solidity
function predict(uint256 marketId, uint256 probability) external payable
```

**Requirements:**
- `msg.value >= bondAmount` (market's configured bond)
- `probability` between `MIN_PROBABILITY` and `MAX_PROBABILITY`
- Market must be active (not resolved)
- Caller has not already predicted on this market

**Side effect:** After each prediction, a random stop check occurs. If `blockhash % WAD < alpha`, the market resolves automatically.

### `claimPayout`

Claim your payout from a resolved market.

```solidity
function claimPayout(uint256 marketId) external
```

**Payout calculation:**
- Scored agents: `max(0, bond + b × ΔSCEM)`
- Last k agents: `bond + flatReward`
- Pro-rata scaling applied if total payouts exceed pool
- Protocol fee deducted from payout

### `forceResolve`

Force-resolve a market that hasn't stopped randomly.

```solidity
function forceResolve(uint256 marketId) external
```

**Access:** Owner can force-resolve anytime. Anyone can force-resolve after 2 days.

## Read Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `getMarketCount()` | `uint256` | Total number of markets created |
| `getMarketInfo(id)` | `(question, currentPrice, creator, resolved, totalPool, predictionCount)` | Core market data |
| `getMarketParams(id)` | `(alpha, k, flatReward, bondAmount, liquidityParam, createdAt)` | Market configuration |
| `getPrediction(id, index)` | `(predictor, probability, priceBefore, priceAfter, bond, timestamp)` | Specific prediction |
| `getPredictionCount(id)` | `uint256` | Number of predictions in a market |
| `getPayoutAmount(id, addr)` | `uint256` | Net payout for an address (post-fee) |
| `isMarketActive(id)` | `bool` | Whether market accepts predictions |
| `hasPredicted(id, addr)` | `bool` | Whether address has predicted |
| `hasClaimed(id, addr)` | `bool` | Whether address has claimed |
| `getProtocolConfig()` | `(owner, treasury, protocolFeeBps)` | Protocol-level config |
| `getMarketBondStats(id)` | `(totalBonds, totalPayouts)` | Bond and payout totals |

## Owner Functions

| Function | Description |
|----------|-------------|
| `setTreasury(address)` | Update the fee treasury address |
| `setProtocolFee(uint256)` | Update protocol fee (max 1000 bps = 10%) |
| `transferOwnership(address)` | Transfer contract ownership |
| `sweepResidual(marketId)` | Sweep unclaimed residual funds after 1 day |

## Events

```solidity
event MarketCreated(uint256 indexed marketId, string question, uint256 alpha, uint256 initialPrice, address creator, uint256 liquidityParam, uint256 bondAmount);
event PredictionMade(uint256 indexed marketId, address indexed predictor, uint256 probability, uint256 priceBefore, uint256 predictionIndex);
event MarketResolved(uint256 indexed marketId, uint256 finalPrice, uint256 totalPredictions);
event PayoutClaimed(uint256 indexed marketId, address indexed predictor, uint256 amount);
event ProtocolFeeCollected(uint256 indexed marketId, address treasury, uint256 amount);
event ResidualSwept(uint256 indexed marketId, address treasury, uint256 amount);
```

## Resolution Logic

When the random stop triggers:

1. `qFinal` = last prediction's probability
2. For each agent `i`:
   - If `i >= numPreds - k`: payout = `bond + flatReward`
   - Otherwise: payout = `max(0, bond + b × [S(qFinal, priceAfter) - S(qFinal, priceBefore)])`
3. If total payouts exceed the pool, a pro-rata scale factor is applied
4. Protocol fee is deducted at claim time
