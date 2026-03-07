#!/usr/bin/env python3
"""
Yiling Protocol — Custom Agent Template

A self-contained agent that watches for new prediction markets on-chain
and submits predictions. Copy this file and modify decide_probability()
to implement your own strategy.

Requirements: pip install web3
Usage: python agent_template.py

Configure via environment variables:
  AGENT_PRIVATE_KEY  - Your wallet private key (must hold ETH for bonds)
  RPC_URL            - Base Sepolia RPC (default: https://sepolia.base.org)
  CONTRACT_ADDRESS   - PredictionMarket contract address
  POLL_INTERVAL      - Seconds between polls (default: 5)
"""

import os
import time
from web3 import Web3
# ExtraDataToPOAMiddleware removed — not needed for Base Sepolia

# ---- Config ----
RPC_URL = os.getenv("RPC_URL", "https://sepolia.base.org")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0x100647AC385271d5f955107c5C18360B3029311c")
PRIVATE_KEY = os.getenv("AGENT_PRIVATE_KEY", "")
POLL_INTERVAL = float(os.getenv("POLL_INTERVAL", "5"))

WAD = 10**18

# Minimal ABI — only the functions needed for a prediction agent
MINIMAL_ABI = [
    {
        "type": "function",
        "name": "getMarketCount",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "getMarketInfo",
        "inputs": [{"name": "marketId", "type": "uint256"}],
        "outputs": [
            {"name": "question", "type": "string"},
            {"name": "currentPrice", "type": "uint256"},
            {"name": "creator", "type": "address"},
            {"name": "resolved", "type": "bool"},
            {"name": "totalPool", "type": "uint256"},
            {"name": "predictionCount", "type": "uint256"},
        ],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "getMarketParams",
        "inputs": [{"name": "marketId", "type": "uint256"}],
        "outputs": [
            {"name": "alpha", "type": "uint256"},
            {"name": "k", "type": "uint256"},
            {"name": "flatReward", "type": "uint256"},
            {"name": "bondAmount", "type": "uint256"},
            {"name": "liquidityParam", "type": "uint256"},
            {"name": "createdAt", "type": "uint256"},
        ],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "predict",
        "inputs": [
            {"name": "marketId", "type": "uint256"},
            {"name": "probability", "type": "uint256"},
        ],
        "outputs": [],
        "stateMutability": "payable",
    },
    {
        "type": "function",
        "name": "claimPayout",
        "inputs": [{"name": "marketId", "type": "uint256"}],
        "outputs": [],
        "stateMutability": "nonpayable",
    },
    {
        "type": "function",
        "name": "isMarketActive",
        "inputs": [{"name": "marketId", "type": "uint256"}],
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "hasPredicted",
        "inputs": [
            {"name": "", "type": "uint256"},
            {"name": "", "type": "address"},
        ],
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
    },
]


# =====================================================================
# YOUR STRATEGY — Modify this function!
# =====================================================================
def decide_probability(question: str, current_price: float, pred_count: int) -> float:
    """
    Decide what probability to predict for a market.

    Args:
        question: The market question (e.g., "Will BTC hit $100k by 2025?")
        current_price: Current market price as 0.0-1.0
        pred_count: Number of predictions already made

    Returns:
        float: Your predicted probability (0.02-0.98)

    Example strategies:
      - Mean reversion: push price toward 0.5
      - Momentum: follow the trend
      - Contrarian: bet against the crowd
      - LLM-based: call an AI API for analysis
    """
    # Default: simple mean-reversion strategy
    # Pulls price toward 0.5 with dampening based on prediction count
    target = 0.5
    strength = 0.3  # How aggressively to revert (0=ignore, 1=fully revert)
    dampening = max(0.1, 1.0 - pred_count * 0.1)  # Less aggressive with more preds

    prob = current_price + (target - current_price) * strength * dampening
    return max(0.02, min(0.98, prob))


# =====================================================================
# Agent runner — no need to modify below
# =====================================================================
class CustomAgent:
    def __init__(self):
        if not PRIVATE_KEY:
            raise ValueError("Set AGENT_PRIVATE_KEY environment variable")

        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        # POA middleware not needed for Base Sepolia

        self.account = self.w3.eth.account.from_key(PRIVATE_KEY)
        self.address = self.account.address
        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(CONTRACT_ADDRESS),
            abi=MINIMAL_ABI,
        )
        self.baseline = 0

    def _send_tx(self, fn, value=0, gas=5_000_000):
        tx = fn.build_transaction({
            "from": self.address,
            "value": value,
            "nonce": self.w3.eth.get_transaction_count(self.address),
            "gas": gas,
            "gasPrice": self.w3.eth.gas_price,
            "chainId": self.w3.eth.chain_id,
        })
        signed = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        if receipt.get("status") == 0:
            raise Exception(f"Transaction reverted: {tx_hash.hex()}")
        return receipt

    def get_market_info(self, market_id):
        result = self.contract.functions.getMarketInfo(market_id).call()
        return {
            "question": result[0],
            "current_price": result[1],
            "creator": result[2],
            "resolved": result[3],
            "total_pool": result[4],
            "prediction_count": result[5],
        }

    def predict(self, market_id, probability_wad, bond_amount):
        fn = self.contract.functions.predict(market_id, probability_wad)
        return self._send_tx(fn, value=bond_amount)

    def handle_market(self, market_id):
        """Predict on a single market."""
        info = self.get_market_info(market_id)
        if info["resolved"]:
            print(f"  Market #{market_id} already resolved, skipping")
            return

        # Check if we already predicted
        already = self.contract.functions.hasPredicted(market_id, self.address).call()
        if already:
            print(f"  Already predicted on market #{market_id}, skipping")
            return

        # Get bond amount from market params
        params = self.contract.functions.getMarketParams(market_id).call()
        bond_amount = params[3]

        # Check balance
        balance = self.w3.eth.get_balance(self.address)
        needed = bond_amount + 5_000_000 * self.w3.eth.gas_price
        if balance < needed:
            print(f"  Insufficient balance ({balance/1e18:.4f} ETH), need ~{needed/1e18:.4f}")
            return

        current_price = info["current_price"] / WAD
        pred_count = info["prediction_count"]
        question = info["question"]

        print(f"  Question: {question}")
        print(f"  Current price: {current_price:.4f}")

        # Call your strategy
        prob = decide_probability(question, current_price, pred_count)
        prob_wad = int(prob * WAD)
        prob_wad = max(int(0.01e18), min(int(0.99e18), prob_wad))

        print(f"  My prediction: {prob:.4f}")
        print(f"  Submitting tx (bond: {bond_amount/1e18} ETH)...")

        receipt = self.predict(market_id, prob_wad, bond_amount)
        tx_hash = receipt["transactionHash"].hex()
        print(f"  TX: {tx_hash}")

    def run(self):
        """Main loop: poll for new markets and predict on them."""
        print("=" * 50)
        print("  Yiling Protocol — Custom Agent")
        print(f"  Address: {self.address}")
        print(f"  Contract: {CONTRACT_ADDRESS}")
        print(f"  RPC: {RPC_URL}")
        balance = self.w3.eth.get_balance(self.address)
        print(f"  Balance: {balance/1e18:.4f} ETH")
        print("=" * 50)

        self.baseline = self.contract.functions.getMarketCount().call()
        print(f"Baseline: {self.baseline} existing markets")
        print(f"Polling every {POLL_INTERVAL}s...\n")

        while True:
            try:
                count = self.contract.functions.getMarketCount().call()
                if count > self.baseline:
                    for mid in range(self.baseline, count):
                        print(f"\n[New Market #{mid}]")
                        try:
                            self.handle_market(mid)
                        except Exception as e:
                            print(f"  Error: {e}")
                    self.baseline = count
            except Exception as e:
                print(f"Poll error: {e}")

            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    agent = CustomAgent()
    agent.run()
