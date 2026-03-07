# SKC Mechanism

The SKC (Srinivasan-Karger-Chen) mechanism is a self-resolving prediction market design from [Harvard research](https://arxiv.org/abs/2306.04305). It eliminates the need for external oracles by using game theory to make honest reporting the dominant strategy.

## How It Works

### 1. Market Creation

Anyone creates a market with a question and parameters:
- **α (alpha)** — probability that the market stops after each prediction
- **k** — number of last agents that receive a flat reward
- **R** — flat reward amount
- **b** — liquidity parameter (LMSR scaling)
- **bond** — required deposit per prediction

### 2. Prediction Phase

Agents arrive and submit probability predictions:
- Each agent pays a bond
- The market price updates to the agent's prediction
- Agent can see all previous predictions before deciding

### 3. Random Stop

After each prediction, a random check occurs:
```
random_value = hash(blockhash, marketId, predictionIndex) % WAD
if random_value < alpha → market resolves
```

With α = 20%, each prediction has a 20% chance of being the last one. This means on average ~5 predictions per market.

### 4. Resolution

When the market stops:
- The **last prediction becomes the reference forecast** (qFinal)
- All agents are scored against qFinal using cross-entropy
- Payouts are calculated and made available for claiming

## Why It Works

The key insight: **every agent could be the last one**.

- The last agent's prediction *becomes* truth
- The last agent has seen all previous predictions
- The last agent has maximum incentive to be accurate
- But any agent could be last (random stop)
- Therefore **every agent is incentivized to be honest at every step**

The paper proves this is a **Perfect Bayesian Equilibrium** — no agent can improve their expected payoff by deviating from honest reporting, regardless of what other agents do.

## Scoring

Two types of payouts:

### Scored Agents (first n-k agents)
```
payout = max(0, bond + b × [S(qFinal, priceAfter) - S(qFinal, priceBefore)])
```

Where `S(q, p) = q × ln(p) + (1-q) × ln(1-p)` is the cross-entropy score.

- **Positive delta**: you moved price toward truth → reward
- **Negative delta**: you moved price away → penalty (capped at bond)

### Last k Agents
```
payout = bond + R
```

The last k agents always get their bond back plus a flat reward. This incentivizes honest final predictions.

## Parameters

| Parameter | Symbol | Effect |
|-----------|--------|--------|
| Stop probability | α | Lower = more predictions per market |
| Flat reward count | k | Higher = more agents guaranteed profit |
| Flat reward | R | Higher = stronger incentive for final agents |
| Liquidity | b | Higher = larger scoring rewards/penalties |
| Bond | bond | Higher = more skin in the game |

See [Parameters](parameters.md) for recommended values.

## Pro-Rata Scaling

In extreme cases (zigzag predictions), total calculated payouts might exceed the pool. The protocol handles this with pro-rata scaling:

```
scaleFactor = totalPool / totalAllocated
actualPayout = rawPayout × scaleFactor
```

This ensures the protocol is always solvent.

## References

- [Self-Resolving Prediction Markets for Unverifiable Outcomes](https://arxiv.org/abs/2306.04305) — Srinivasan, Karger, Chen (Harvard, 2023)
