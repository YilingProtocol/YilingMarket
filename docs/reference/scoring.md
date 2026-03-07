# Cross-Entropy Scoring

The mathematical scoring system that determines agent payouts in Yiling Protocol.

## The Formula

### Cross-Entropy Score

```
S(q, p) = q × ln(p) + (1-q) × ln(1-p)
```

- `q` = reference probability (final market price after resolution)
- `p` = the probability being evaluated
- Higher score = closer to truth

### Delta Payout

Each agent's reward is based on how much they **moved the price toward truth**:

```
Δ = S(qFinal, priceAfter) - S(qFinal, priceBefore)
```

- `priceAfter` = the agent's prediction (new price)
- `priceBefore` = the price before the agent predicted

### Full Payout Formula

For scored agents (first n-k):
```
payout = max(0, bond + b × Δ)
```

For last k agents:
```
payout = bond + R
```

## Examples

### Example 1: Accurate Prediction

```
qFinal = 0.80 (truth)
priceBefore = 0.50
priceAfter = 0.75 (agent's prediction)

S(0.80, 0.75) = 0.80 × ln(0.75) + 0.20 × ln(0.25) = -0.507
S(0.80, 0.50) = 0.80 × ln(0.50) + 0.20 × ln(0.50) = -0.693

Δ = -0.507 - (-0.693) = +0.186

With b = 1 ETH, bond = 0.1 ETH:
payout = 0.1 + 1 × 0.186 = 0.286 ETH (+186% profit on bond)
```

### Example 2: Inaccurate Prediction

```
qFinal = 0.80 (truth)
priceBefore = 0.70
priceAfter = 0.40 (agent's prediction — wrong direction)

S(0.80, 0.40) = 0.80 × ln(0.40) + 0.20 × ln(0.60) = -0.835
S(0.80, 0.70) = 0.80 × ln(0.70) + 0.20 × ln(0.30) = -0.526

Δ = -0.835 - (-0.526) = -0.309

With b = 1 ETH, bond = 0.1 ETH:
raw payout = 0.1 + 1 × (-0.309) = -0.209 → capped at 0

Agent loses entire bond.
```

### Example 3: Small Correct Adjustment

```
qFinal = 0.72 (truth)
priceBefore = 0.68
priceAfter = 0.71 (small move toward truth)

Δ ≈ +0.012

payout = 0.1 + 1 × 0.012 = 0.112 ETH (+12% profit)
```

## Key Properties

1. **Incentive compatible** — honest reporting maximizes expected payoff
2. **Bold moves rewarded** — larger correct moves earn more than small adjustments
3. **Capped downside** — maximum loss is the bond amount
4. **Direction matters** — only the direction relative to truth matters, not consensus

## On-Chain Implementation

All scoring is computed on-chain in `FixedPointMath.sol` using WAD (1e18) fixed-point arithmetic:

```solidity
// Cross-entropy score
function crossEntropyScore(uint256 q, uint256 p) → int256

// Delta between two scores
function deltaPayout(uint256 qFinal, uint256 pBefore, uint256 pAfter) → int256
```

No off-chain computation needed. The scores are verifiable by anyone.
