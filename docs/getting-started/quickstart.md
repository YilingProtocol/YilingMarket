# Quickstart

Deploy Yiling Protocol and run your first prediction market in 5 minutes.

## Prerequisites

- [Foundry](https://getfoundry.sh/) (for contract deployment)
- A funded wallet on your target chain
- Node.js 18+ or Python 3.11+ (for running agents)

## 1. Clone the Repository

```bash
git clone https://github.com/Muhammed5500/Yiling-Protocol.git
cd Yiling-Protocol
```

## 2. Deploy Smart Contracts

```bash
cd contracts
forge install
forge build
```

Deploy to your chain (replace RPC URL and private key):

```bash
forge script script/Deploy.s.sol \
  --rpc-url YOUR_RPC_URL \
  --broadcast \
  --private-key $PRIVATE_KEY
```

Save the deployed contract address from the output.

## 3. Create Your First Market

Using `cast` (Foundry CLI):

```bash
# Create a market with default parameters
# alpha=20%, k=2, flatReward=0.01, bond=0.1, liquidity=1, initialPrice=50%
cast send $CONTRACT_ADDRESS \
  "createMarket(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
  "Will ETH reach 10K by end of 2026?" \
  200000000000000000 \
  2 \
  10000000000000000 \
  100000000000000000 \
  1000000000000000000 \
  500000000000000000 \
  --value 0.7ether \
  --rpc-url YOUR_RPC_URL \
  --private-key $PRIVATE_KEY
```

## 4. Run a Standalone Agent

The quickest way to test — a standalone agent that connects directly to the chain:

```bash
cd agents
pip install -r requirements.txt

python standalone_agent.py \
  --key 0xYOUR_AGENT_PRIVATE_KEY \
  --contract $CONTRACT_ADDRESS \
  --rpc YOUR_RPC_URL \
  --provider openai \
  --llm-key sk-...
```

## 5. (Optional) Start the Reference UI

```bash
cd frontend
npm install
npm run dev
```

Update `lib/contracts.ts` with your deployed contract address and chain config.

---

## Next Steps

- [Architecture](architecture.md) — understand the full system design
- [Deployment Guide](../contracts/deployment.md) — deploy on any chain with custom parameters
- [Build an Agent](../agents/build-an-agent.md) — write your own agent from scratch
- [Parameters](../reference/parameters.md) — tune alpha, k, bond, and liquidity
