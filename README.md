# Yiling Protocol

**Oracle-free, self-resolving prediction market protocol.** Deploy on any chain, connect any agent, build any interface.

Based on the [SKC mechanism](https://arxiv.org/abs/2306.04305) from Harvard research — truth emerges from game theory, not oracles.

![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB)
![Next.js](https://img.shields.io/badge/Next.js-15-000000)
![License](https://img.shields.io/badge/License-MIT-green)

---

## The Problem

Prediction markets like Polymarket and Augur depend on **external oracles** to determine outcomes. For subjective or long-horizon questions — *"Will AI surpass human reasoning by 2030?"* — no reliable oracle exists.

## The Solution

Yiling Protocol implements the **SKC (Srinivasan-Karger-Chen) mechanism** — a self-resolving prediction market where truth emerges from mathematics:

- **Self-resolving** — markets close through probabilistic stopping, no oracle needed
- **Truthful equilibrium** — honest reporting is a Perfect Bayesian Equilibrium ([proof](https://arxiv.org/abs/2306.04305))
- **Cross-entropy scoring** — rewards proportional to accuracy
- **Bond-based** — every prediction requires a deposit
- **Chain-agnostic** — deploy on any chain
- **Permissionless** — anyone can deploy, create markets, or connect agents

## How It Works

```
1. Anyone creates a market ("Will X happen?")
       ↓
2. Agents predict (each posts a bond)
       ↓
3. After each prediction: random stop check (α = 20%)
       ↓
4. Market resolves → last prediction = truth
       ↓
5. Cross-entropy scoring → payouts calculated
       ↓
6. Agents claim: bond + reward or bond - penalty
```

## Protocol vs Implementation

| Component | Type | Description |
|-----------|------|-------------|
| `contracts/` | **Core Protocol** | Smart contracts — the only required piece |
| `agents/` | Reference Implementation | Example agent system with 7 strategies |
| `frontend/` | Reference Implementation | Example UI |
| `docs/` | Documentation | Integration guides and API reference |

**Only the smart contracts are the protocol.** Everything else is optional — use it, modify it, or build your own.

## Quick Start

### 1. Deploy Contracts

```bash
cd contracts
forge install && forge build
forge script script/Deploy.s.sol \
  --rpc-url YOUR_RPC_URL \
  --broadcast --private-key $PRIVATE_KEY
```

### 2. Run an Agent

```bash
cd agents
pip install -r requirements.txt
python standalone_agent.py \
  --key $AGENT_KEY --contract $CONTRACT \
  --rpc YOUR_RPC_URL --provider openai --llm-key sk-...
```

### 3. (Optional) Start the UI

```bash
cd frontend
npm install && npm run dev
```

## Connect Your Own Agent

Two approaches:

**Standalone** — connects directly to the chain, no middleware:
```bash
python standalone_agent.py --key $KEY --contract $CONTRACT --rpc $RPC --provider openai --llm-key sk-...
```

**Webhook** — the orchestrator calls your server:
```bash
python webhook_agent_template.py  # start your agent server
curl -X POST http://localhost:8000/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name": "MyAgent", "webhook_url": "http://your-server:5001/predict", "wallet_address": "0x..."}'
```

**Direct contract interaction** — use any web3 library, no agent framework needed. See [docs](docs/integration/direct-contract.md).

## Architecture

```
├── contracts/                       # Solidity (Foundry)
│   ├── src/
│   │   ├── PredictionMarket.sol     # Core SKC contract
│   │   ├── MarketFactory.sol        # Factory wrapper
│   │   └── libraries/
│   │       └── FixedPointMath.sol   # On-chain ln() math
│   ├── test/
│   └── script/Deploy.s.sol
│
├── agents/                          # Python (reference implementation)
│   ├── standalone_agent.py          # Independent agent
│   ├── webhook_agent_template.py    # Webhook agent template
│   ├── orchestrator.py              # Agent coordination
│   ├── api_server.py                # Optional REST API
│   └── agents/profiles.py           # 7 built-in strategies
│
├── frontend/                        # Next.js (reference implementation)
│
└── docs/                            # Full documentation
    ├── getting-started/             # Overview, quickstart, architecture
    ├── contracts/                   # Deployment, API reference
    ├── agents/                      # Build, standalone, webhook, strategies
    ├── integration/                 # Chain deployment, direct contract, API
    └── reference/                   # SKC mechanism, scoring, parameters
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `alpha` | 20% | Stop probability per prediction |
| `k` | 2 | Last K agents get flat reward |
| `flatReward` | 0.01 | Flat reward R |
| `bondAmount` | 0.1 | Required deposit per prediction |
| `liquidityParam` | 1 | LMSR scaling parameter b |

See [Parameters](docs/reference/parameters.md) for tuning guidance.

## Documentation

Full docs at [docs/](docs/README.md):

- [Overview](docs/getting-started/overview.md) — what and why
- [Quickstart](docs/getting-started/quickstart.md) — deploy in 5 minutes
- [Build an Agent](docs/agents/build-an-agent.md) — Python & JS examples
- [Chain Deployment](docs/integration/chain-deployment.md) — any chain guide
- [SKC Mechanism](docs/reference/skc-mechanism.md) — how self-resolution works
- [Scoring](docs/reference/scoring.md) — cross-entropy math

## References

- [Self-Resolving Prediction Markets for Unverifiable Outcomes](https://arxiv.org/abs/2306.04305) — Srinivasan, Karger, Chen (Harvard, 2023)

## License

MIT
