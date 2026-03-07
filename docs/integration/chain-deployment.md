# Chain-Agnostic Deployment

Yiling Protocol is chain-agnostic. The smart contracts are standard Solidity 0.8.24 with no chain-specific dependencies — deploy on any EVM-compatible chain.

## Deployment Checklist

1. **Choose your chain** — any EVM chain works
2. **Fund a deployer wallet** on that chain
3. **Deploy the contracts** using Foundry
4. **Configure parameters** (treasury, fee, market defaults)
5. **Point your agents** to the new contract address and RPC

## Step-by-Step

### 1. Configure Chain

Create or edit your Foundry config:

```bash
cd contracts

# Add your chain's RPC to foundry.toml (optional)
# Or just pass --rpc-url directly
```

### 2. Deploy

```bash
forge script script/Deploy.s.sol \
  --rpc-url YOUR_CHAIN_RPC \
  --broadcast \
  --private-key $PRIVATE_KEY
```

### 3. Verify (Optional)

```bash
forge verify-contract $CONTRACT_ADDRESS \
  src/PredictionMarket.sol:PredictionMarket \
  --rpc-url YOUR_CHAIN_RPC \
  --constructor-args $(cast abi-encode "constructor(address,uint256)" $TREASURY 200)
```

### 4. Create First Market

```bash
cast send $CONTRACT \
  "createMarket(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
  "Test market question" \
  200000000000000000 2 10000000000000000 100000000000000000 1000000000000000000 500000000000000000 \
  --value 0.7ether \
  --rpc-url YOUR_CHAIN_RPC \
  --private-key $PRIVATE_KEY
```

### 5. Connect Agents

Update agent config to point to your chain:

```bash
# Standalone agent
python standalone_agent.py \
  --contract $CONTRACT \
  --rpc YOUR_CHAIN_RPC \
  --key $AGENT_KEY \
  --provider openai --llm-key sk-...

# Or set environment variables
export CONTRACT_ADDRESS=$CONTRACT
export RPC_URL=YOUR_CHAIN_RPC
python run.py
```

## Multi-Chain Deployment

You can deploy independent instances on multiple chains simultaneously. Each deployment is fully isolated:

```
Chain A: Contract 0xAAA... → Agents → Markets
Chain B: Contract 0xBBB... → Agents → Markets
Chain C: Contract 0xCCC... → Agents → Markets
```

No cross-chain dependencies. Each instance has its own:
- Contract state
- Treasury
- Protocol fee configuration
- Agent ecosystem

## Non-EVM Chains

For non-EVM chains (Solana, Sui, Aptos, etc.), the Solidity contracts need to be ported to the target chain's smart contract language (Rust/Move/etc.). The core logic — SKC mechanism, cross-entropy scoring, random stop — is math-based and portable.

Porting guide:
1. Implement `FixedPointMath` (ln() with fixed-point precision)
2. Implement the market state machine (create → predict → resolve → claim)
3. Implement the scoring formula: `S(q, p) = q × ln(p) + (1-q) × ln(1-p)`
4. Implement random stop using block hash or equivalent randomness source
