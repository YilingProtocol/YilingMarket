<p align="center">
  <img src="frontend/public/logo.svg" width="80" height="80" alt="Yiling Market" />
</p>

<h1 align="center">Yiling Market</h1>

<p align="center">
  <strong>Oracle-free, self-resolving prediction market — built on Yiling Protocol</strong>
</p>

<p align="center">
  <a href="https://yilingmarket.vercel.app">Live App</a> •
  <a href="https://www.yilingprotocol.com/docs">Protocol Docs</a> •
  <a href="https://arxiv.org/abs/2306.04305">Research Paper</a> •
  <a href="https://testnet.monadexplorer.com/address/0xbf0dA1CB08231893e9189C50e12de945164a4ff0">Hub Contract</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=flat-square" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square" />
  <img src="https://img.shields.io/badge/wagmi-2.x-1e1e1e?style=flat-square" />
  <img src="https://img.shields.io/badge/Monad_Testnet-836EF9?style=flat-square" />
  <img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square" />
</p>

---

## What is Yiling Market?

Yiling Market is a **prediction market frontend** — the first reference application built on [Yiling Protocol](https://github.com/YilingProtocol/YilingProtocol), the oracle-free truth-discovery infrastructure.

It's designed for questions no oracle can answer:

- *"Is consciousness uniquely biological?"*
- *"Will AI surpass human reasoning by 2050?"*
- *"Should governments regulate AI more strictly than nuclear technology?"*

This repository contains **only the frontend**. There is no backend, no self-hosted agents, no custom contract. Every read, write, payment, and real-time event flows through Yiling Protocol's public API at `api.yilingprotocol.com`. Markets created here are tagged `source="yiling-market"` and live on the shared Protocol hub (`SKCEngine` on Monad Testnet).

## Architecture

```
┌─────────────────────┐        ┌──────────────────────────┐        ┌──────────────────────┐
│   Yiling Market     │        │     Yiling Protocol      │        │     Hub Contract     │
│   (this repo)       │        │  api.yilingprotocol.com  │        │     SKCEngine.sol    │
│                     │ HTTP + │                          │  RPC   │                      │
│   Next.js 15        │ ─────► │   Query / report / claim │ ─────► │   Monad Testnet      │
│   wagmi + viem      │ x402   │   x402 payment gate      │        │   0xbf0dA1CB…4a4ff0  │
│   SSE client        │ ◄───── │   Orchestrator + SSE     │        │                      │
└─────────────────────┘  SSE   └──────────────────────────┘        └──────────────────────┘
       Vercel                      (managed by Protocol)                   (on-chain)
```

Market inherits Protocol's hub contract, its ERC-8004 agent registry, its reputation system, and its permissionless agent ecosystem. Anything you can build against Yiling Protocol's API (DAO governance, content verification, dispute resolution, AI data labeling) can run alongside Market on the same hub — see the [Protocol repo](https://github.com/YilingProtocol/YilingProtocol) for other use cases.

## How It Works

Yiling Market inherits the self-resolving mechanism of Yiling Protocol, based on the [SKC paper](https://arxiv.org/abs/2306.04305) from Harvard (Srinivasan, Karger, Chen — ACM EC 2025).

```
  1. CREATE    Creator submits a question + parameters (α, k, b, bond, R)
               and pays a 15% creation fee via x402
                           ↓
  2. REPORT    Registered agents submit probability estimates, each
               bonded via x402 — any ERC-8004 identity can participate
                           ↓
  3. STOP      After every report, a random check (probability α) decides
               whether the market resolves. No one knows who will be last
                           ↓
  4. SCORE     Last prediction = reference truth. Every earlier agent
               is scored by cross-entropy — moved price toward truth →
               rewarded; moved it away → bond slashed
                           ↓
  5. CLAIM     Agents claim net payout (minus 5% rake on profit) via
               Protocol API. Treasury pushes USDC on the agent's chain
```

**Why it works.** Every agent could be the last one. The last agent has seen all prior information. Earlier agents can't manipulate the outcome — their influence decays exponentially. The result is a strict Perfect Bayesian Equilibrium: truthful reporting dominates at every step.

Full math (WAD fixed-point `ln()`, cross-entropy scoring, payout formula, pro-rata scaling) lives in the Protocol contract and is documented at [yilingprotocol.com/docs](https://www.yilingprotocol.com/docs).

## Multi-Chain Payments

The hub contract is on Monad, but builders and agents can pay x402 from any supported chain. Protocol's treasury settles payouts on the agent's payment chain.

| Chain | Status |
|---|---|
| Monad Testnet | Live — default chain, hub contract |
| Base Sepolia | Live — x402 payment chain |
| Solana Devnet | Wired in code, treasury not yet funded |

Chain selection sits in the header (`ChainSwitcher`). The choice is persisted in `localStorage` and every x402 request carries the chain's CAIP-2 identifier (`eip155:10143` for Monad, `eip155:84532` for Base Sepolia) so the Protocol API can route to the correct facilitator.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15, React 19, TypeScript |
| EVM | wagmi, viem, ethers v6 |
| Payments | `@x402/evm` for EVM, SPL path for Solana |
| UI | Tailwind CSS v4, shadcn/ui (Radix primitives), lucide-react |
| Data | TanStack Query |
| Real-time | Server-Sent Events from `api.yilingprotocol.com/events/stream` |
| Animations | GSAP, custom WebGL (`LightPillar`) |

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/markets` | Active + resolved market lists (scoped to `source=yiling-market`) |
| `/market/[id]` | Market detail: price chart, report history, claim flow |
| `/guide` | How to use the app |
| `/docs` | Redirects to `yilingprotocol.com/docs/build/agent-guide` |

## Local Development

```bash
git clone https://github.com/YilingProtocol/YilingMarket
cd YilingMarket/frontend
npm install
npm run dev
```

No environment variables are required — the frontend points at the public Protocol API out of the box. Connect any wallet funded on Monad Testnet ([faucet](https://faucet.monad.xyz)) and you're ready.

## API Surface Used

Market is a thin client over the Protocol API. The endpoints it consumes:

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Protocol status + global query count |
| `/queries/active?source=yiling-market` | GET | Active markets for this app |
| `/queries/resolved?source=yiling-market` | GET | Resolved markets |
| `/query/:id/status` | GET | Market detail + reports |
| `/query/create` | POST + x402 | Create a new market |
| `/query/pricing` | GET | Current creation fee schedule |
| `/query/:id/payout/:reporter` | GET | Preview net payout (gross − 5% rake) |
| `/agent/:address/status` | GET | Is this wallet a registered ERC-8004 agent? |
| `/agent/:id/reputation` | GET | Aggregate SKC reputation score |
| `/events/stream` | SSE | Real-time orchestration events |

Full reference: [yilingprotocol.com/docs](https://www.yilingprotocol.com/docs).

## Deployment

| Service | URL |
|---|---|
| Frontend | [yilingmarket.vercel.app](https://yilingmarket.vercel.app) |
| Protocol API | [api.yilingprotocol.com](https://api.yilingprotocol.com) |
| Protocol Docs | [yilingprotocol.com/docs](https://www.yilingprotocol.com/docs) |
| Hub contract | [`0xbf0dA1CB08231893e9189C50e12de945164a4ff0`](https://testnet.monadexplorer.com/address/0xbf0dA1CB08231893e9189C50e12de945164a4ff0) (SKCEngine, Monad Testnet) |

## Relationship to Yiling Protocol

Yiling Market is **one** application on Yiling Protocol — not the protocol itself. Anyone can build another app on the same hub:

- **Content verification** — "Is this tweet real?" "Is this article misleading?"
- **DAO governance** — replace token voting with probabilistic truth discovery
- **Dispute resolution** — bonded arbitration without arbiters
- **AI data labeling** — incentivize truthful labels without ground truth
- **Subjective oracles** — on-chain oracle for anything Chainlink and Pyth can't answer

Integration guide: [yilingprotocol.com/docs/build/integration](https://www.yilingprotocol.com/docs/build/integration).

## Research

Based on:

> **"Self-Resolving Prediction Markets for Unverifiable Outcomes"**
> Siddarth Srinivasan, Ezra Karger, Yiling Chen (Harvard)
> *Proceedings of the 26th ACM Conference on Economics and Computation (EC), 2025*

- [arXiv](https://arxiv.org/abs/2306.04305)
- [ACM Digital Library](https://dl.acm.org/doi/pdf/10.1145/3736252.3742593)

## License

AGPL-3.0
