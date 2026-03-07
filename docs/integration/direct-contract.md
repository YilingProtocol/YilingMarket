# Direct Contract Interaction

You don't need any middleware to use Yiling Protocol. Interact directly with the smart contracts using any web3 library or CLI tool.

## Using Foundry Cast

### Read Market Data

```bash
# Total markets
cast call $CONTRACT "getMarketCount()" --rpc-url $RPC

# Market info
cast call $CONTRACT "getMarketInfo(uint256)" 0 --rpc-url $RPC

# Market parameters
cast call $CONTRACT "getMarketParams(uint256)" 0 --rpc-url $RPC

# Check if market is active
cast call $CONTRACT "isMarketActive(uint256)" 0 --rpc-url $RPC

# Get a specific prediction
cast call $CONTRACT "getPrediction(uint256,uint256)" 0 0 --rpc-url $RPC

# Check payout
cast call $CONTRACT "getPayoutAmount(uint256,address)" 0 $WALLET --rpc-url $RPC
```

### Create a Market

```bash
cast send $CONTRACT \
  "createMarket(string,uint256,uint256,uint256,uint256,uint256,uint256)" \
  "Will BTC reach 200K by 2027?" \
  200000000000000000 \
  2 \
  10000000000000000 \
  100000000000000000 \
  1000000000000000000 \
  500000000000000000 \
  --value 0.7ether \
  --private-key $KEY \
  --rpc-url $RPC
```

### Submit a Prediction

```bash
# Predict 72% probability (0.72e18 in WAD)
cast send $CONTRACT \
  "predict(uint256,uint256)" \
  0 \
  720000000000000000 \
  --value 0.1ether \
  --private-key $KEY \
  --rpc-url $RPC
```

### Claim Payout

```bash
cast send $CONTRACT \
  "claimPayout(uint256)" \
  0 \
  --private-key $KEY \
  --rpc-url $RPC
```

## Using ethers.js

```javascript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

// Read
const count = await contract.getMarketCount();
const info = await contract.getMarketInfo(0);
const isActive = await contract.isMarketActive(0);

// Write
const tx = await contract.predict(0, ethers.parseEther("0.72"), {
  value: ethers.parseEther("0.1")
});
await tx.wait();
```

## Using web3.py

```python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider(RPC_URL))
contract = w3.eth.contract(address=CONTRACT, abi=abi)

# Read
count = contract.functions.getMarketCount().call()
info = contract.functions.getMarketInfo(0).call()

# Write
tx = contract.functions.predict(0, int(0.72e18)).build_transaction({
    "from": account.address,
    "value": int(0.1e18),
    "gas": 500000,
    "gasPrice": w3.eth.gas_price,
    "nonce": w3.eth.get_transaction_count(account.address),
})
```

## Using viem (TypeScript)

```typescript
import { createPublicClient, createWalletClient, http, parseEther } from "viem";

const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain, transport: http(RPC_URL) });

// Read
const count = await publicClient.readContract({
  address: CONTRACT, abi, functionName: "getMarketCount"
});

// Write
const hash = await walletClient.writeContract({
  address: CONTRACT, abi,
  functionName: "predict",
  args: [0n, parseEther("0.72")],
  value: parseEther("0.1"),
});
```

## Listening to Events

Monitor protocol activity by subscribing to contract events:

```javascript
// ethers.js
contract.on("MarketCreated", (marketId, question, alpha) => {
  console.log(`New market #${marketId}: ${question}`);
});

contract.on("PredictionMade", (marketId, predictor, probability) => {
  console.log(`Prediction on #${marketId}: ${Number(probability) / 1e18}`);
});

contract.on("MarketResolved", (marketId, finalPrice, totalPredictions) => {
  console.log(`Market #${marketId} resolved at ${Number(finalPrice) / 1e18}`);
});
```
