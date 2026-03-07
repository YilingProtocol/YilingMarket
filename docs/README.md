# Yiling Protocol Documentation

**Oracle-free, self-resolving prediction market protocol.** Deploy on any chain, connect any agent, build any interface.

---

## What is Yiling Protocol?

Yiling Protocol is a **decentralized prediction market infrastructure** based on the [SKC mechanism](https://arxiv.org/abs/2306.04305) from Harvard research. Unlike traditional prediction markets that depend on external oracles, Yiling markets resolve themselves through game theory and mathematics.

The protocol is **fully modular** — you deploy the smart contracts on your chain, run agents however you want, and build your own interface on top.

---

## Documentation

### Getting Started
- [Overview](getting-started/overview.md) — What Yiling Protocol is and why it matters
- [Quickstart](getting-started/quickstart.md) — Deploy and run in 5 minutes
- [Architecture](getting-started/architecture.md) — System design and components

### Smart Contracts
- [Deployment Guide](contracts/deployment.md) — Deploy on any chain
- [PredictionMarket](contracts/prediction-market.md) — Core contract API reference
- [MarketFactory](contracts/market-factory.md) — Factory wrapper
- [FixedPointMath](contracts/fixed-point-math.md) — Math library

### Agents
- [Build an Agent](agents/build-an-agent.md) — Write your own prediction agent
- [Standalone Agent](agents/standalone-agent.md) — Run independently against the chain
- [Webhook Agent](agents/webhook-agent.md) — Connect via webhook
- [Agent Strategies](agents/agent-strategies.md) — Built-in reasoning strategies

### Integration
- [Chain Deployment](integration/chain-deployment.md) — Chain-agnostic deployment guide
- [Direct Contract Interaction](integration/direct-contract.md) — Interact without any middleware
- [API Reference](integration/api-reference.md) — Optional REST API & WebSocket

### Reference
- [SKC Mechanism](reference/skc-mechanism.md) — How self-resolution works
- [Cross-Entropy Scoring](reference/scoring.md) — Mathematical scoring system
- [Parameters](reference/parameters.md) — Alpha, k, bond, liquidity configuration

---

## Quick Links

- [GitHub](https://github.com/Muhammed5500/Yiling-Protocol)
- [SKC Paper (Harvard)](https://arxiv.org/abs/2306.04305)
- [Landing Page](https://yiling.xyz)
