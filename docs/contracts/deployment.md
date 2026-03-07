# Contract Deployment

Deploy Yiling Protocol smart contracts on any EVM-compatible chain.

## Prerequisites

- [Foundry](https://getfoundry.sh/) installed
- A funded wallet on your target chain
- RPC URL for your target chain

## Build

```bash
cd contracts
forge install
forge build
```

## Deploy

```bash
forge script script/Deploy.s.sol \
  --rpc-url YOUR_RPC_URL \
  --broadcast \
  --private-key $PRIVATE_KEY
```

The deployment script deploys `PredictionMarket.sol` with:
- **Treasury address**: your deployer wallet (can be changed later)
- **Protocol fee**: 200 bps (2%)

## Custom Deployment

To customize treasury and fee, edit `script/Deploy.s.sol`:

```solidity
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        PredictionMarket market = new PredictionMarket(
            TREASURY_ADDRESS,  // where protocol fees go
            200                // 2% fee (in basis points, max 1000 = 10%)
        );

        vm.stopBroadcast();
    }
}
```

## Chain-Specific Notes

The contracts are standard Solidity 0.8.24 with no chain-specific dependencies. They work on any EVM-compatible chain:

| Chain | RPC URL | Notes |
|-------|---------|-------|
| Ethereum | `https://eth.llamarpc.com` | Higher gas costs |
| Base | `https://mainnet.base.org` | Low gas, fast finality |
| Arbitrum | `https://arb1.arbitrum.io/rpc` | Low gas |
| Polygon | `https://polygon-rpc.com` | Low gas |
| Optimism | `https://mainnet.optimism.io` | Low gas |
| Base Sepolia | `https://sepolia.base.org` | Testnet |

For non-EVM chains (Solana, Sui, etc.), the contracts need to be ported to the target chain's smart contract language.

## Verify Contracts

```bash
forge verify-contract $CONTRACT_ADDRESS \
  src/PredictionMarket.sol:PredictionMarket \
  --rpc-url YOUR_RPC_URL \
  --constructor-args $(cast abi-encode "constructor(address,uint256)" $TREASURY 200)
```

## Post-Deployment

After deployment, you can configure the protocol:

```bash
# Update treasury address
cast send $CONTRACT "setTreasury(address)" NEW_TREASURY --private-key $KEY --rpc-url $RPC

# Update protocol fee (basis points, max 1000)
cast send $CONTRACT "setProtocolFee(uint256)" 300 --private-key $KEY --rpc-url $RPC

# Transfer ownership
cast send $CONTRACT "transferOwnership(address)" NEW_OWNER --private-key $KEY --rpc-url $RPC
```

## Gas Estimates

| Function | Approximate Gas |
|----------|----------------|
| `createMarket()` | ~250,000 |
| `predict()` | ~150,000 - 500,000 (depends on resolution) |
| `claimPayout()` | ~80,000 |
| `forceResolve()` | ~300,000 |
