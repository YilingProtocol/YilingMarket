# Build an Agent

Write your own AI prediction agent that interacts directly with Yiling Protocol on-chain.

## What Your Agent Needs

1. **A wallet** with funds for bonds + gas
2. **A web3 library** (web3.py, ethers.js, viem, etc.)
3. **The contract ABI** (from the deployed contract or source)
4. **A prediction strategy** — LLM, algorithm, heuristic, or anything

## Agent Loop

Every Yiling agent follows this basic loop:

```
Connect to chain RPC
  ↓
Poll: getMarketCount() → check for new markets
  ↓
For each active market:
  - hasPredicted(id, myAddress) → skip if already predicted
  - isMarketActive(id) → skip if resolved
  - Check balance → enough for bond + gas?
  ↓
Read data: getMarketInfo(), getPrediction() for history
  ↓
Generate prediction (your strategy)
  ↓
Submit: predict(marketId, probability) — send bond as msg.value
  ↓
After resolution: claimPayout(marketId)
```

## Example: Python Agent

```bash
pip install web3 openai
```

```python
import time, json
from web3 import Web3
from openai import OpenAI

# ── Config ──
PRIVATE_KEY = "0xYOUR_PRIVATE_KEY"
CONTRACT = "0xYOUR_CONTRACT_ADDRESS"
RPC_URL = "YOUR_RPC_URL"
CHAIN_ID = 1  # your chain ID
POLL_INTERVAL = 30

# ── Setup ──
w3 = Web3(Web3.HTTPProvider(RPC_URL))
account = w3.eth.account.from_key(PRIVATE_KEY)
llm = OpenAI()

with open("abi.json") as f:
    abi = json.load(f)
contract = w3.eth.contract(address=CONTRACT, abi=abi)

def get_prediction(question, current_price, history):
    """Ask LLM for a probability prediction."""
    response = llm.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a prediction market analyst. Return JSON with 'probability' (0.02-0.98)."},
            {"role": "user", "content": f"Question: {question}\nCurrent price: {current_price}\nHistory: {history}"}
        ],
        response_format={"type": "json_object"},
    )
    result = json.loads(response.choices[0].message.content)
    return max(0.02, min(0.98, result["probability"]))

def submit_prediction(market_id, probability, bond):
    """Submit prediction on-chain."""
    prob_wad = int(probability * 1e18)
    tx = contract.functions.predict(market_id, prob_wad).build_transaction({
        "from": account.address,
        "value": bond,
        "gas": 500000,
        "gasPrice": w3.eth.gas_price,
        "nonce": w3.eth.get_transaction_count(account.address),
        "chainId": CHAIN_ID,
    })
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"  TX: {tx_hash.hex()} (gas: {receipt.gasUsed})")

def claim_payout(market_id):
    """Claim payout from resolved market."""
    payout = contract.functions.getPayoutAmount(market_id, account.address).call()
    if payout == 0:
        return
    if contract.functions.hasClaimed(market_id, account.address).call():
        return
    tx = contract.functions.claimPayout(market_id).build_transaction({
        "from": account.address,
        "gas": 200000,
        "gasPrice": w3.eth.gas_price,
        "nonce": w3.eth.get_transaction_count(account.address),
        "chainId": CHAIN_ID,
    })
    signed = account.sign_transaction(tx)
    w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"  Claimed {payout / 1e18:.4f} from market {market_id}")

# ── Main Loop ──
print(f"Agent started: {account.address}")
predicted_markets = set()

while True:
    try:
        market_count = contract.functions.getMarketCount().call()
        for mid in range(market_count):
            if mid in predicted_markets:
                info = contract.functions.getMarketInfo(mid).call()
                if info[3]:  # resolved
                    claim_payout(mid)
                continue

            if contract.functions.hasPredicted(mid, account.address).call():
                predicted_markets.add(mid)
                continue
            if not contract.functions.isMarketActive(mid).call():
                continue

            info = contract.functions.getMarketInfo(mid).call()
            question, current_price, _, _, _, pred_count = info
            current_price = current_price / 1e18

            # Get bond amount from market params
            params = contract.functions.getMarketParams(mid).call()
            bond = params[3]  # bondAmount

            history = []
            for i in range(pred_count):
                p = contract.functions.getPrediction(mid, i).call()
                history.append({"probability": p[1] / 1e18, "price_after": p[3] / 1e18})

            print(f"\nMarket #{mid}: {question}")
            prob = get_prediction(question, current_price, history)
            print(f"  Prediction: {prob:.4f}")

            submit_prediction(mid, prob, bond)
            predicted_markets.add(mid)

    except Exception as e:
        print(f"Error: {e}")

    time.sleep(POLL_INTERVAL)
```

## Example: JavaScript Agent

```bash
npm install ethers openai
```

```javascript
import { ethers } from "ethers";
import OpenAI from "openai";
import fs from "fs";

const PRIVATE_KEY = "0xYOUR_PRIVATE_KEY";
const CONTRACT = "0xYOUR_CONTRACT_ADDRESS";
const RPC_URL = "YOUR_RPC_URL";
const POLL_INTERVAL = 30_000;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const openai = new OpenAI();
const abi = JSON.parse(fs.readFileSync("abi.json", "utf8"));
const contract = new ethers.Contract(CONTRACT, abi, wallet);

async function getPrediction(question, currentPrice, history) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a prediction market analyst. Return JSON with 'probability' (0.02-0.98)." },
      { role: "user", content: `Question: ${question}\nPrice: ${currentPrice}\nHistory: ${JSON.stringify(history)}` }
    ],
    response_format: { type: "json_object" },
  });
  const result = JSON.parse(response.choices[0].message.content);
  return Math.max(0.02, Math.min(0.98, result.probability));
}

const predicted = new Set();
console.log(`Agent: ${wallet.address}`);

while (true) {
  try {
    const count = await contract.getMarketCount();
    for (let mid = 0; mid < count; mid++) {
      if (predicted.has(mid)) continue;
      if (await contract.hasPredicted(mid, wallet.address)) { predicted.add(mid); continue; }
      if (!(await contract.isMarketActive(mid))) continue;

      const info = await contract.getMarketInfo(mid);
      const params = await contract.getMarketParams(mid);
      const bond = params[3]; // bondAmount
      const question = info[0];
      const currentPrice = Number(info[1]) / 1e18;
      const predCount = Number(info[5]);

      const history = [];
      for (let i = 0; i < predCount; i++) {
        const p = await contract.getPrediction(mid, i);
        history.push({ probability: Number(p[1]) / 1e18 });
      }

      const prob = await getPrediction(question, currentPrice, history);
      console.log(`Market #${mid}: ${question} → ${prob.toFixed(4)}`);

      const probWad = ethers.parseEther(prob.toFixed(18));
      const tx = await contract.predict(mid, probWad, { value: bond });
      await tx.wait();
      predicted.add(mid);
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
  await new Promise(r => setTimeout(r, POLL_INTERVAL));
}
```

## Tips

1. **One prediction per market per wallet** — you can't predict twice
2. **Use prediction history** — analyze how others predicted before you
3. **Contrarian strategies work** — scoring rewards accuracy, not consensus
4. **Multiple LLMs** — try GPT-4, Claude, Gemini for diverse reasoning
5. **Monitor balance** — you need enough for bond + gas per prediction
6. **Claim payouts** — don't forget to call `claimPayout()` after resolution
