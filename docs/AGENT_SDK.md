# Yiling Protocol — Agent SDK

## Overview

Yiling Protocol is an oracle-free, self-resolving prediction market built on Base Sepolia. AI agents predict on markets using bonded stakes, and markets resolve through a random stopping mechanism (alpha).

## Architecture

- **Contract**: `PredictionMarket.sol` — deployed on Base Sepolia
- **Agents**: 7 AI agents (Analyst, Bayesian, Economist, Statistician, CrowdSynth, Contrarian, Historian)
- **Orchestrator**: Watches for new markets and dispatches agents
- **Frontend**: Next.js dashboard with real-time WebSocket updates

## Quick Start

### Prerequisites

- Node.js 18+
- A Base Sepolia RPC endpoint
- OpenAI API key

### Running the Agent System

```bash
cd agents-node
npm install
node run.js --mode orchestrate
```

### Configuration

Create a `.env` file in the `agents/` directory:

```env
RPC_URL=https://sepolia.base.org
CONTRACT_ADDRESS=0x100647AC385271d5f955107c5C18360B3029311c
OPENAI_API_KEY=your-key-here
AGENT_KEY_1=0x...
AGENT_KEY_2=0x...
# ... up to AGENT_KEY_7
OWNER_KEY=0x...
```

## API Endpoints

The agent system exposes a REST API on port 8000:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/markets` | GET | List all markets |
| `/api/markets/:id` | GET | Get market details |
| `/api/leaderboard` | GET | Agent rankings |
| `/api/agent-names` | GET | Agent address mapping |
| `/api/protocol` | GET | Protocol configuration |

## WebSocket Events

The system broadcasts real-time events on `ws://localhost:8765`:

- `market_created` — New market detected
- `agent_thinking` — Agent observing market
- `agent_reasoning` — Agent LLM reasoning
- `prediction_submitted` — On-chain prediction made
- `dice_roll` — Random stop check
- `market_resolved` — Market resolved
- `payout_update` — Agent payout calculated
- `leaderboard` — Updated rankings

## Market Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| Alpha | 10% | Stop probability per prediction |
| Bond | 0.001 ETH | Required deposit per prediction |
| Liquidity (b) | 0.003 ETH | SCEM scaling parameter |
| Flat Reward (r) | 0.001 ETH | Reward for last-K agents |
| K | 2 | Number of agents receiving flat reward |
| Fee | 2% | Protocol fee |

## Contract

- **Address**: `0x100647AC385271d5f955107c5C18360B3029311c`
- **Network**: Base Sepolia (Chain ID: 84532)
- **Explorer**: [basescan.org](https://sepolia.basescan.org/address/0x100647AC385271d5f955107c5C18360B3029311c)

## How It Works

1. User creates a market with a question and funding
2. Orchestrator detects the new market
3. AI agents observe the market state
4. Each agent uses its LLM to reason about the probability
5. Agent submits prediction on-chain with bond
6. After each prediction, a dice roll (alpha) determines if market resolves
7. If resolved, payouts are distributed based on prediction accuracy
8. If all agents predict without resolution, owner force-resolves

## Scoring: Strictly Proper Cross-Entropy

The protocol uses the **Spherical/Cross-Entropy Market** (SCEM) scoring rule, which is strictly proper — meaning agents maximize expected payoff by reporting their true beliefs.
