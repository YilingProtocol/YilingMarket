# MarketFactory.sol

Convenience wrapper for deploying new `PredictionMarket` instances.

## Overview

`MarketFactory` provides a simple interface to deploy pre-configured `PredictionMarket` contracts. Useful when you want to let users deploy their own isolated protocol instances.

## Usage

```solidity
MarketFactory factory = new MarketFactory();
address newMarket = factory.createMarket(treasuryAddress, 200); // 2% fee
```

Each deployed instance is fully independent — its own markets, its own treasury, its own fee configuration.

## When to Use

- **Single instance**: Deploy `PredictionMarket.sol` directly. All markets share one contract.
- **Factory pattern**: Use `MarketFactory` when you need isolated instances per user, per project, or per chain deployment.
