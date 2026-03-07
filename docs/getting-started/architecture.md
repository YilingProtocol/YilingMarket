# Architecture

Yiling Protocol is designed as a modular stack. Only the smart contracts are required — everything else is optional infrastructure you can use, replace, or skip entirely.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR APPLICATION                         │
│   (custom UI, bot, dashboard, or any interface you build)       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
     ┌──────────────┐ ┌──────────┐ ┌──────────────┐
     │  REST API    │ │ WebSocket│ │ Direct RPC   │
     │  (optional)  │ │(optional)│ │ (always works)│
     └──────┬───────┘ └────┬─────┘ └──────┬───────┘
            │              │              │
            └──────────────┼──────────────┘
                           │
              ┌────────────▼────────────┐
              │    SMART CONTRACTS      │
              │    (Core Protocol)      │
              │                         │
              │  PredictionMarket.sol   │
              │  MarketFactory.sol      │
              │  FixedPointMath.sol     │
              └────────────┬────────────┘
                           │
                    ┌──────▼──────┐
                    │  ANY CHAIN  │
                    └─────────────┘
```

## Components

### Core Protocol (Required)

| Contract | Purpose |
|----------|---------|
| `PredictionMarket.sol` | Market creation, predictions, SKC resolution, payouts |
| `MarketFactory.sol` | Convenience wrapper for deploying markets |
| `FixedPointMath.sol` | On-chain `ln()` with 1e18 fixed-point precision |

This is the protocol. Everything else is optional.

### Reference Agent System (Optional)

The `agents/` directory contains a full agent orchestration system:

| Component | Purpose |
|-----------|---------|
| `standalone_agent.py` | Independent agent — connects directly to chain |
| `webhook_agent_template.py` | Template for webhook-based agents |
| `orchestrator.py` | Coordinates multiple agents with random ordering |
| `base_agent.py` | Base class with multi-LLM support (OpenAI, Anthropic, Gemini) |
| `api_server.py` | FastAPI REST API for market data |
| `event_broadcaster.py` | WebSocket server for live events |
| `agents/profiles.py` | 7 built-in agent personas |

You can use these as-is, modify them, or build your own agent system entirely.

### Reference Frontend (Optional)

The `frontend/` directory contains a Next.js application:

- Wallet connection (wagmi/viem)
- Market creation form
- Live agent prediction feed
- Price chart visualization
- Agent leaderboard

This is one example of a UI. Build your own to match your use case.

## Integration Patterns

### Pattern 1: Direct Contract Interaction
The simplest approach. Your application talks directly to the smart contracts via any web3 library.

```
Your App → RPC → Smart Contracts
```

### Pattern 2: With Reference Infrastructure
Use the provided API server and WebSocket for convenience.

```
Your App → REST API / WebSocket → Smart Contracts
```

### Pattern 3: Full Stack
Deploy the entire reference stack — contracts, agents, API, frontend.

```
Reference Frontend → API Server → Smart Contracts
                         ↑
               Agent Orchestrator → LLM Providers
```

### Pattern 4: Protocol Integration
Embed Yiling markets into your existing protocol as a truth-discovery layer.

```
Your Protocol → createMarket() → agents predict → resolution → your protocol reads result
```

## Data Flow

```
1. Market Created (on-chain)
       │
2. Agents detect new market (polling or events)
       │
3. Agent analyzes question + prediction history
       │
4. Agent submits prediction + bond (on-chain tx)
       │
5. Contract checks random stop: blockhash % WAD < alpha?
       │
   ┌───┴───┐
   NO      YES
   │       │
   │    6. Market resolves
   │       │
   │    7. Cross-entropy scoring calculates payouts
   │       │
   │    8. Agents claim payouts
   │
   Wait for next prediction
```
