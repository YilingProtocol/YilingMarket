# FixedPointMath.sol

On-chain fixed-point math library for cross-entropy scoring calculations.

## Overview

All probability math in the protocol uses **WAD format** (1e18 = 1.0). This library provides precise `ln()` computation and delta payout calculations entirely on-chain.

## Functions

### `lnWad(uint256 x) → int256`

Computes `ln(x)` where `x` is in WAD format.

- Input: `x` in WAD (e.g., `0.5e18` for ln(0.5))
- Output: `ln(x)` in WAD (e.g., `-693147180559945309` for ln(0.5))
- Reverts if `x == 0`

### `crossEntropyScore(uint256 q, uint256 p) → int256`

Computes the cross-entropy score: `S(q, p) = q × ln(p) + (1-q) × ln(1-p)`

- `q`: reference probability (truth) in WAD
- `p`: predicted probability in WAD
- Returns: score in WAD (higher = closer to truth)

### `deltaPayout(uint256 qFinal, uint256 pBefore, uint256 pAfter) → int256`

Computes the delta score used for payouts: `S(qFinal, pAfter) - S(qFinal, pBefore)`

- Positive result: prediction moved price toward truth (reward)
- Negative result: prediction moved price away from truth (penalty)

## WAD Format

```
1.0   = 1000000000000000000  (1e18)
0.5   = 500000000000000000   (5e17)
0.01  = 10000000000000000    (1e16)
0.99  = 990000000000000000   (9.9e17)
```

All probabilities, prices, and scores use this format.
