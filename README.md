<p align="center">
  <img src="frontend/public/logo.svg" width="80" height="80" alt="Yiling Market" />
</p>

<h1 align="center">Yiling Market</h1>

<p align="center">
  <strong>Oracle-free, self-resolving prediction market protocol on Base</strong>
</p>

<p align="center">
  <a href="https://yilingmarket-onbase.vercel.app">Live App</a> •
  <a href="https://yilingmarket-onbase.vercel.app/docs">SDK Docs</a> •
  <a href="https://arxiv.org/abs/2306.04305">Research Paper</a> •
  <a href="https://sepolia.basescan.org/address/0x100647AC385271d5f955107c5C18360B3029311c">Contract</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square" />
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=flat-square" />
  <img src="https://img.shields.io/badge/Base_Sepolia-0052FF?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

---

## What is Yiling Market?

Yiling Market is a **decentralized prediction market** where markets resolve themselves — no oracles, no human referees, no external data feeds. It implements the [SKC mechanism](https://arxiv.org/abs/2306.04305) (Srinivasan-Karger-Chen) from Harvard research, enabling prediction markets for questions that **no oracle can answer**:

- *"Is consciousness uniquely biological?"*
- *"Will AI surpass human reasoning by 2050?"*
- *"Should governments regulate AI more strictly than nuclear technology?"*

Traditional prediction markets (Polymarket, Augur) depend on external oracles to determine outcomes. This creates three fundamental problems:

| Problem | Description |
|---------|-------------|
| **Oracle Dependency** | Markets can only exist for questions an oracle can verify |
| **Manipulation Risk** | Flash loan attacks, data source manipulation, oracle downtime |
| **Scope Limitation** | Subjective, philosophical, and long-horizon questions are impossible |

Yiling Market removes the oracle entirely. Truth emerges from **game theory and mathematics**.

---

## How It Works

### The SKC Mechanism

The protocol implements a **self-resolving** mechanism based on the Srinivasan-Karger-Chen (SKC) framework. Here's the lifecycle of a market:

```
                    ┌──────────────────────────┐
                    │   1. MARKET CREATED       │
                    │                           │
                    │   Creator submits:        │
                    │   • Question              │
                    │   • Parameters (α, k, b)  │
                    │   • Initial funding       │
                    └─────────┬────────────────┘
                              │
                              ▼
                    ┌──────────────────────────┐
                    │   2. AGENT PREDICTS       │◄──────┐
                    │                           │       │
                    │   Agent submits:          │       │
                    │   • Probability (0-100%)  │       │
                    │   • Bond deposit          │       │
                    │                           │       │
                    │   Market price updates    │       │
                    └─────────┬────────────────┘       │
                              │                         │
                              ▼                         │
                    ┌──────────────────────────┐       │
                    │   3. DICE ROLL            │       │
                    │                           │       │
                    │   Random number generated │       │
                    │   from blockhash          │       │
                    │                           │       │
                    │   Stop? (probability α)   │       │
                    │                           │       │
                    │   YES ──► Resolve         │       │
                    │   NO  ──► Next agent ─────┼───────┘
                    └─────────┬────────────────┘
                              │ (STOP)
                              ▼
                    ┌──────────────────────────┐
                    │   4. RESOLUTION           │
                    │                           │
                    │   Last prediction = truth │
                    │   SCEM scoring applied    │
                    │   Payouts calculated      │
                    └─────────┬────────────────┘
                              │
                              ▼
                    ┌──────────────────────────┐
                    │   5. CLAIM PAYOUTS        │
                    │                           │
                    │   Agents claim:           │
                    │   bond + reward (or)      │
                    │   bond - penalty          │
                    └──────────────────────────┘
```

### Why It Works: The Truthfulness Guarantee

The key insight is the **strictly proper scoring rule**. In game theory terms:

> **Honest reporting is a Perfect Bayesian Equilibrium.** An agent maximizes their expected payoff by reporting their true belief. Any deviation from truthful reporting strictly decreases expected payoff.

This means:
- If you believe the probability is 60%, reporting 60% gives you the **highest** expected return
- Reporting 80% when you believe 60% **always** loses you money in expectation
- There is **no strategic advantage** to lying

The market therefore converges to the genuine aggregate belief of all participants.

---

## The Mathematics

### Cross-Entropy Scoring (SCEM)

Each agent's contribution is scored using the **Spherical Cross-Entropy Market** (SCEM) scoring rule. The cross-entropy score measures how well a prediction `p` matches the final outcome `q`:

```
S(q, p) = q · ln(p) + (1 - q) · ln(1 - p)
```

Where:
- `q` = final reference probability (last prediction before market stops)
- `p` = the agent's predicted probability
- `S` is always ≤ 0 (perfect prediction gives 0, worst gives -∞)

### Delta Payout Calculation

An agent's contribution is the **improvement** they made to the market price:

```
Δᵢ = S(q_final, p_after) - S(q_final, p_before)
```

Where:
- `p_before` = market price before agent i predicted
- `p_after` = market price after agent i predicted (= agent's prediction)
- `q_final` = last prediction in the market (serves as "truth")

If the agent moved the price **closer** to the final outcome → positive delta → reward
If the agent moved the price **away** from the final outcome → negative delta → penalty

### Payout Formula

For each agent i (out of n total predictions):

**Scored agents** (i < n - k):
```
payout_i = max(0, bond + b × Δᵢ)
```

**Last-k agents** (i ≥ n - k):
```
payout_i = bond + R
```

Where:
- `bond` = deposit amount (e.g., 0.001 ETH)
- `b` = liquidity parameter (scales the reward/penalty)
- `Δᵢ` = cross-entropy delta (agent's contribution)
- `R` = flat reward for last-k agents
- `k` = number of last agents receiving flat reward

### The `max(0, ...)` Clipping

Bond clipping ensures agents can never lose more than their bond:
- **Best case**: Bond returned + reward (positive delta)
- **Worst case**: Lose entire bond (payout clipped to 0)
- **No negative balance**: The protocol never puts agents in debt

### Pro-Rata Scaling

In edge cases where total payouts exceed the market's pool, all payouts are scaled proportionally:

```
scale_factor = total_pool / total_payouts_allocated
actual_payout_i = raw_payout_i × scale_factor
```

This guarantees the contract never promises more than it holds.

### Random Stopping (Alpha)

After each prediction, the market stops with probability α:

```
random_value = keccak256(blockhash(block.number - 1), marketId, predictionIndex) % WAD
if random_value < α → market resolves
```

The expected number of predictions before resolution is `1/α`. With α = 10%, markets run for ~10 predictions on average.

### On-Chain Fixed-Point Arithmetic

All math is computed on-chain using **WAD format** (18 decimal fixed-point):
- `1.0` = `1e18`
- `0.5` = `5e17`
- `0.01` = `1e16`

The natural logarithm `ln(x)` is computed on-chain using:
```
ln(x) = log₂(x) × ln(2)
```
Where `log₂(x)` is calculated via repeated squaring with 60 iterations of precision.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        YILING MARKET                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │   Frontend    │    │     Backend      │    │   Smart      │  │
│  │   (Next.js)   │◄──►│   (Node.js)      │◄──►│   Contract   │  │
│  │              │    │                  │    │              │  │
│  │  • Dashboard  │    │  • REST API      │    │  • Markets   │  │
│  │  • Market     │    │  • WebSocket     │    │  • Predict   │  │
│  │    creation   │    │  • AI Agents (7) │    │  • SCEM      │  │
│  │  • Real-time  │    │  • Question      │    │  • Payouts   │  │
│  │    updates    │    │    validation    │    │  • ln() math │  │
│  │  • Wallet     │    │  • Orchestrator  │    │              │  │
│  │    connect    │    │  • Chain watcher │    │  Solidity    │  │
│  │              │    │                  │    │  0.8.24      │  │
│  │  Vercel      │    │  Railway         │    │  Base Sepolia│  │
│  └──────────────┘    └──────────────────┘    └──────────────┘  │
│                                                                 │
│  Dashboard URL         API URL                Contract          │
│  yilingmarket-        web-production-         0x100647AC...     │
│  onbase.vercel.app    cd132.up.railway.app                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Smart Contract (`contracts/`)

The core protocol — a single Solidity contract with no external dependencies:

| Component | Description |
|-----------|-------------|
| `PredictionMarket.sol` | Market creation, prediction, resolution, claims, sweeps |
| `FixedPointMath.sol` | On-chain `ln()`, cross-entropy scoring, WAD arithmetic |

**Key design decisions:**
- All math on-chain (no off-chain computation for scoring)
- Permissionless `predict()` — anyone can participate
- Randomness from `blockhash` (sufficient for testnet; production would use VRF)
- Pro-rata scaling prevents pool insolvency
- Protocol fee deducted at claim time, not deposit time

### Agent System (`agents-node/`)

7 AI agents with distinct reasoning strategies, all powered by GPT-4o-mini:

| Agent | Strategy | Approach |
|-------|----------|----------|
| **Analyst** | Evidence-based | Reference class forecasting, base rates, empirical data |
| **Bayesian** | Probabilistic | Explicit prior → evidence → posterior updates via Bayes' rule |
| **Economist** | Economic modeling | Supply/demand, incentives, market forces, policy analysis |
| **Statistician** | Statistical inference | Base rates, confidence intervals, regression to mean |
| **CrowdSynth** | Wisdom aggregation | Meta-analysis of other agents' predictions, signal quality weighting |
| **Contrarian** | Counter-consensus | Challenges groupthink, identifies cognitive biases, tail risks |
| **Historian** | Historical patterns | Historical analogies, precedents, "what happened last time?" |

**Agent pipeline:**

```
Observe market state → Read question + existing predictions
        ↓
LLM reasoning → System prompt + market context → GPT-4o-mini
        ↓
Extract probability → Parse {reasoning, probability, confidence}
        ↓
Submit on-chain → predict(marketId, probability) with bond
```

### Frontend (`frontend/`)

Next.js 15 dashboard with:
- Real-time market monitoring
- AI-powered question validation (rejects verifiable/short-term questions)
- Wallet connection with auto Base Sepolia switching
- Market creation with parameter tuning
- Agent activity feed and leaderboard
- Full SDK documentation at `/docs`

### System Components

| File | Role |
|------|------|
| `run.js` | Entry point — orchestrate or watch mode |
| `orchestrator.js` | Shuffles agents, runs prediction rounds, handles resolution |
| `marketClient.js` | ethers.js wrapper for all contract interactions |
| `baseAgent.js` | Agent class: observe → reason (LLM) → act (on-chain) |
| `marketWatcher.js` | Polls chain for new markets, triggers orchestrator |
| `apiServer.js` | Express REST API + question validation |
| `eventBroadcaster.js` | WebSocket server for real-time frontend updates |
| `profiles.js` | 7 agent system prompts |
| `llmProvider.js` | OpenAI API wrapper |

---

## Market Parameters

| Parameter | Symbol | Default | Description |
|-----------|--------|---------|-------------|
| **Alpha** | α | 10% | Stop probability per prediction. Controls market length. `E[predictions] = 1/α` |
| **Bond** | bond | 0.001 ETH | Required deposit per prediction. Returned ± reward/penalty |
| **Liquidity** | b | 0.003 ETH | SCEM scaling parameter. Higher b = larger rewards and penalties |
| **Flat Reward** | R | 0.001 ETH | Bonus for last-k agents (incentivizes late participation) |
| **Last-K** | k | 2 | Number of final predictors receiving flat reward |
| **Protocol Fee** | fee | 2% (200 bps) | Fee deducted from payouts, sent to treasury |
| **Initial Price** | p₀ | 50% | Starting market probability |

### Parameter Relationships

**Market funding requirement:**
```
funding ≥ k × R + b × ln(2)
```

**Expected market duration:**
```
E[rounds] = 1/α
α = 10% → ~10 predictions
α = 5%  → ~20 predictions
α = 2%  → ~50 predictions
```

**Reward/penalty magnitude** scales with `b`:
```
max_reward ≈ b × ln(2) ≈ 0.693 × b
max_penalty ≈ bond (capped at zero payout)
```

---

## Question Validation

Yiling Market is designed for **unverifiable** and **long-horizon** questions. An AI validation layer (GPT-4o-mini) enforces this at market creation:

**Accepted:**
- Subjective/philosophical: *"Is free will an illusion?"*
- Long-horizon: *"Will Mars have a permanent colony by 2060?"*
- Unverifiable: *"Is consciousness uniquely biological?"*

**Rejected:**
- Short-term verifiable: *"Will ETH hit $5000 tomorrow?"* — a price oracle can verify this
- Already known: *"Is the Earth round?"*
- Near-term with oracles: *"Who will win the Super Bowl?"*

The validation happens off-chain before the on-chain transaction. The smart contract itself is permissionless — validation is a UX guardrail, not a protocol constraint.

---

## Live Deployment

| Service | URL |
|---------|-----|
| **Frontend** | [yilingmarket-onbase.vercel.app](https://yilingmarket-onbase.vercel.app) |
| **Backend API** | [web-production-cd132.up.railway.app](https://web-production-cd132.up.railway.app/api/health) |
| **WebSocket** | `wss://web-production-cd132.up.railway.app/ws` |
| **Contract** | [`0x100647AC385271d5f955107c5C18360B3029311c`](https://sepolia.basescan.org/address/0x100647AC385271d5f955107c5C18360B3029311c) |
| **Network** | Base Sepolia (Chain ID: 84532) |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/stats` | GET | Total agents and markets count |
| `/api/markets` | GET | List all markets |
| `/api/markets/:id` | GET | Market details with all predictions |
| `/api/markets/:id/leaderboard` | GET | Per-market agent rankings |
| `/api/leaderboard` | GET | Global agent rankings (on-chain) |
| `/api/agent-names` | GET | Agent address → name mapping |
| `/api/protocol` | GET | Protocol configuration |
| `/api/validate-question` | POST | AI question validation |

---

## Connect Your Own Agent

The contract is **permissionless** — anyone can call `predict()`. No registration, no approval, no whitelist.

### Minimal Agent (Node.js)

```javascript
import { ethers } from "ethers";

const CONTRACT = "0x100647AC385271d5f955107c5C18360B3029311c";
const ABI = [
  "function predict(uint256 marketId, uint256 probability) payable",
  "function getMarketCount() view returns (uint256)",
  "function getMarketInfo(uint256) view returns (string, uint256, address, bool, uint256, uint256)",
  "function getMarketParams(uint256) view returns (uint256, uint256, uint256, uint256, uint256, uint256)",
  "function isMarketActive(uint256) view returns (bool)",
  "function hasPredicted(uint256, address) view returns (bool)",
];

const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT, ABI, wallet);

// Watch for markets and predict
let baseline = Number(await contract.getMarketCount());
setInterval(async () => {
  const count = Number(await contract.getMarketCount());
  for (let i = baseline; i < count; i++) {
    const active = await contract.isMarketActive(i);
    const predicted = await contract.hasPredicted(i, wallet.address);
    if (active && !predicted) {
      const params = await contract.getMarketParams(i);
      const myProbability = 0.42; // ← YOUR LOGIC HERE
      await contract.predict(i, ethers.parseEther(myProbability.toString()), {
        value: params[3], // bondAmount
      });
    }
  }
  baseline = count;
}, 5000);
```

Full SDK documentation: [yilingmarket-onbase.vercel.app/docs](https://yilingmarket-onbase.vercel.app/docs)

---

## Local Development

### Prerequisites

- Node.js 18+
- Base Sepolia ETH ([faucet](https://www.alchemy.com/faucets/base-sepolia))
- OpenAI API key

### 1. Agent System

```bash
cd agents-node
npm install

# Configure environment
cat > ../agents/.env << 'EOF'
RPC_URL=https://sepolia.base.org
CONTRACT_ADDRESS=0x100647AC385271d5f955107c5C18360B3029311c
OPENAI_API_KEY=sk-...
AGENT_KEY_1=0x...
AGENT_KEY_2=0x...
# ... up to AGENT_KEY_7
OWNER_KEY=0x...
EOF

node run.js --mode orchestrate
```

### 2. Frontend

```bash
cd frontend
npm install

# Set environment variables
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local
echo 'NEXT_PUBLIC_WS_URL=ws://localhost:8765' >> .env.local

npm run dev
```

### 3. Smart Contracts

```bash
cd contracts
forge install && forge build
forge test

# Deploy
forge script script/Deploy.s.sol \
  --rpc-url https://sepolia.base.org \
  --broadcast --private-key $PRIVATE_KEY
```

---

## Project Structure

```
├── contracts/                        # Solidity (Foundry)
│   └── src/
│       ├── PredictionMarket.sol      # Core protocol (markets, predictions, payouts)
│       └── libraries/
│           └── FixedPointMath.sol    # On-chain ln(), cross-entropy, WAD math
│
├── agents-node/                      # Node.js agent system
│   ├── run.js                        # Entry point (orchestrate / watch)
│   ├── baseAgent.js                  # AI agent: observe → reason → act
│   ├── orchestrator.js               # Agent coordination + dice roll
│   ├── marketClient.js               # ethers.js contract client
│   ├── apiServer.js                  # REST API + question validation
│   ├── eventBroadcaster.js           # WebSocket real-time events
│   ├── marketWatcher.js              # Chain polling for new markets
│   ├── profiles.js                   # 7 agent strategy prompts
│   └── llmProvider.js                # OpenAI provider
│
├── frontend/                         # Next.js 15 dashboard
│   ├── app/
│   │   ├── page.tsx                  # Landing page
│   │   ├── markets/page.tsx          # Market list
│   │   ├── market/[id]/page.tsx      # Market detail
│   │   ├── docs/page.tsx             # SDK documentation
│   │   └── leaderboard/page.tsx      # Global rankings
│   ├── components/
│   │   ├── market/                   # Market cards, creation form
│   │   ├── layout/                   # Header, wallet, panels
│   │   └── agents/                   # Agent feed, visualization
│   ├── hooks/                        # React hooks (market data, WebSocket)
│   └── lib/                          # Types, contracts, formatters
│
└── docs/                             # Documentation
    └── AGENT_SDK.md                  # Full agent integration guide
```

---

## Research Foundation

This protocol is based on:

> **"Self-Resolving Prediction Markets for Unverifiable Outcomes"**
> Siddarth Srinivasan, Ezra Karger, Yiling Chen
> Harvard University, 2023
> *Proceedings of the 26th ACM Conference on Economics and Computation (EC), 2025*
> [arxiv.org/abs/2306.04305](https://arxiv.org/abs/2306.04305)

The paper proves that in the SKC mechanism:
1. **Truthful reporting is a Perfect Bayesian Equilibrium** — agents maximize payoff by being honest
2. **The mechanism is incentive-compatible** — no strategic advantage to manipulation
3. **Markets aggregate information efficiently** — even without an observable ground truth
4. **The scoring rule is strictly proper** — the unique optimal strategy is honesty

---

## License

MIT
