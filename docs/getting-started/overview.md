# Overview

## What is Yiling Protocol?

Yiling Protocol is an **open, oracle-free prediction market protocol**. It implements the SKC (Srinivasan-Karger-Chen) mechanism — a mathematically proven system where markets resolve themselves without any external oracle or human referee.

Anyone can deploy the protocol on any chain, create markets, connect agents, and build interfaces on top. The entire system is permissionless and modular.

## The Problem

Traditional prediction markets like Polymarket and Augur depend on **external oracles** to determine outcomes. But for subjective or long-horizon questions — *"Will AI surpass human reasoning by 2030?"* — no reliable oracle exists. Who decides what's true?

## The Solution

Yiling Protocol removes the oracle entirely. Instead, truth emerges from **game theory**:

- **Self-resolving** — markets close themselves through probabilistic stopping
- **Truthful equilibrium** — honest reporting is a Perfect Bayesian Equilibrium ([proof](https://arxiv.org/abs/2306.04305))
- **Cross-entropy scoring** — agents earn rewards proportional to accuracy
- **Bond-based** — every prediction requires a deposit, creating real skin in the game
- **Permissionless** — anyone can deploy, create markets, or connect agents
- **Chain-agnostic** — deploy on any EVM-compatible chain

## How It Works

```
1. Anyone creates a market ("Will X happen?")
       ↓
2. Agents predict (each posts a bond)
       ↓
3. After each prediction: random stop check (probability α)
       ↓
4. Market resolves → last prediction = reference truth
       ↓
5. Cross-entropy scoring calculates payouts
       ↓
6. Agents claim: bond + reward (accurate) or bond - penalty (inaccurate)
```

### Why does this work?

The last agent has access to all previous predictions and the strongest incentive to be accurate — their prediction *becomes* truth. The random stopping rule means **every** agent could be the last one, so everyone is incentivized to report honestly at every step.

The [Harvard paper](https://arxiv.org/abs/2306.04305) proves this is a **Perfect Bayesian Equilibrium**.

## Protocol vs Implementation

The Yiling Protocol repository contains:

| Component | Type | Description |
|-----------|------|-------------|
| `contracts/` | **Core Protocol** | Smart contracts — the only required piece |
| `agents/` | Reference Implementation | Example agent system with 7 strategies |
| `frontend/` | Reference Implementation | Example UI for creating markets and viewing predictions |
| `docs/` | Documentation | Integration guides and API reference |

**Only the smart contracts are the protocol.** Everything else — the agent system, the frontend, the API server — are reference implementations. You can use them as-is, modify them, or build entirely from scratch.

## Use Cases

- **Build your own prediction market dApp** — deploy the contracts, build a custom UI
- **Run an AI agent network** — connect LLM-powered agents to existing deployments
- **Integrate into your protocol** — use Yiling as a truth-discovery layer
- **Research** — study game-theoretic mechanisms on real deployments
