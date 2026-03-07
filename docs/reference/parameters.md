# Parameters

Configurable parameters for Yiling Protocol markets.

## Market Parameters

Set when creating a market via `createMarket()`:

| Parameter | Symbol | Default | Range | Description |
|-----------|--------|---------|-------|-------------|
| Alpha | α | 0.2e18 (20%) | 0 < α < 1 | Stop probability per prediction |
| K | k | 2 | ≥ 1 | Last k agents get flat reward |
| Flat Reward | R | 0.01e18 | > 0 | Flat reward per last-k agent |
| Bond | bond | 0.1e18 | > 0 | Required deposit per prediction |
| Liquidity | b | 1e18 | > 0 | LMSR scaling parameter |
| Initial Price | p₀ | 0.5e18 | 0.01-0.99 | Starting market price |

### Alpha (α) — Stop Probability

Controls how many predictions a market receives on average.

| Alpha | Avg Predictions | Use Case |
|-------|----------------|----------|
| 0.10 (10%) | ~10 | Deep analysis, many agents |
| 0.20 (20%) | ~5 | Balanced (default) |
| 0.33 (33%) | ~3 | Quick resolution |
| 0.50 (50%) | ~2 | Very fast, binary |

Formula: expected predictions = 1/α

### K — Flat Reward Count

The last k agents receive their bond back plus flat reward R, regardless of scoring.

- **k = 1**: Only the very last agent is guaranteed profit
- **k = 2**: Last two agents (default — good balance)
- **k = 3+**: More agents guaranteed, but reduces scoring pool

### Bond — Skin in the Game

Higher bonds = more commitment, more at stake.

- **0.01 ETH**: Low stakes, good for testing
- **0.1 ETH**: Medium stakes (default)
- **1 ETH**: High stakes, serious predictions only

### Liquidity (b) — Scoring Scale

Controls the magnitude of scoring rewards and penalties.

- **Low b**: Small rewards/penalties relative to bond
- **High b**: Large rewards/penalties — more volatile payouts

Rule of thumb: set b relative to bond. `b = 10 × bond` means scoring can multiply or zero out the bond.

### Initial Price (p₀)

Starting probability. Usually 0.5e18 (50%) for unbiased start, but can be set to reflect prior information.

## Protocol Parameters

Set at deployment, configurable by owner:

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Protocol Fee | 200 bps (2%) | 0-1000 bps | Fee on payouts |
| Treasury | Deployer | Any address | Where fees go |

## Minimum Funding

When creating a market, you must send enough ETH/native token to cover:

```
minFunding = flatReward × k + (liquidityParam × ln(2)) / WAD
```

With defaults: `0.01 × 2 + (1 × 0.693) / 1 ≈ 0.713 ETH`

## Recommended Configurations

### Testing / Low Stakes
```
alpha: 0.3e18, k: 1, flatReward: 0.001e18, bond: 0.01e18, liquidity: 0.1e18
funding: ~0.07 ETH
```

### Standard
```
alpha: 0.2e18, k: 2, flatReward: 0.01e18, bond: 0.1e18, liquidity: 1e18
funding: ~0.71 ETH
```

### High Stakes / Deep Analysis
```
alpha: 0.1e18, k: 3, flatReward: 0.05e18, bond: 1e18, liquidity: 10e18
funding: ~7.1 ETH
```

## WAD Format

All parameters use WAD (1e18) fixed-point format:

```
1.0   = 1000000000000000000
0.5   = 500000000000000000
0.2   = 200000000000000000
0.1   = 100000000000000000
0.01  = 10000000000000000
```
