#!/usr/bin/env python3
"""
Yiling Protocol — Standalone Agent

Run your own prediction agent on your own PC with your own wallet.
No central orchestrator needed. Polls the blockchain for new markets,
reasons with an LLM, and submits predictions from your wallet.

Usage:
    python standalone_agent.py --key 0xYOUR_PRIVATE_KEY --provider openai
    python standalone_agent.py --profile Analyst --poll-interval 15
    python standalone_agent.py --key 0x... --provider anthropic --model claude-sonnet-4-5-20250929

Environment variables (alternative to CLI args):
    AGENT_PRIVATE_KEY, CONTRACT_ADDRESS, RPC_URL,
    LLM_PROVIDER, LLM_API_KEY, LLM_MODEL
"""

import argparse
import json
import os
import random
import sys
import time

# Add agents dir to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from market_client import MarketClient, WAD
from llm_providers import create_llm_provider
from agents.profiles import AGENT_PROFILES


def parse_args():
    parser = argparse.ArgumentParser(
        description="Yiling Protocol — Standalone Prediction Agent"
    )

    # Wallet & chain
    parser.add_argument(
        "--key", default=os.getenv("AGENT_PRIVATE_KEY", ""),
        help="Wallet private key (or set AGENT_PRIVATE_KEY env var)",
    )
    parser.add_argument(
        "--contract", default=os.getenv("CONTRACT_ADDRESS", ""),
        help="PredictionMarket contract address (or set CONTRACT_ADDRESS)",
    )
    parser.add_argument(
        "--rpc", default=os.getenv("RPC_URL", "https://sepolia.base.org"),
        help="RPC URL (or set RPC_URL)",
    )

    # LLM
    parser.add_argument(
        "--provider", default=os.getenv("LLM_PROVIDER", "openai"),
        help="LLM provider: openai, anthropic, gemini (or set LLM_PROVIDER)",
    )
    parser.add_argument(
        "--llm-key", default=os.getenv("LLM_API_KEY", ""),
        help="LLM API key (or set LLM_API_KEY)",
    )
    parser.add_argument(
        "--model", default=os.getenv("LLM_MODEL", ""),
        help="LLM model name (or set LLM_MODEL)",
    )

    # Profile
    parser.add_argument(
        "--profile", default="",
        help="Use a predefined agent profile from profiles.py (e.g. Analyst, Contrarian)",
    )
    parser.add_argument(
        "--name", default="",
        help="Agent display name (default: profile name or 'StandaloneAgent')",
    )
    parser.add_argument(
        "--system-prompt", default="",
        help="Custom system prompt (overrides profile prompt)",
    )

    # Behavior
    parser.add_argument(
        "--poll-interval", type=float, default=10.0,
        help="Seconds between poll cycles (default: 10)",
    )
    parser.add_argument(
        "--auto-claim", action="store_true", default=True,
        help="Automatically claim payouts from resolved markets (default: true)",
    )
    parser.add_argument(
        "--no-auto-claim", action="store_true",
        help="Disable automatic payout claiming",
    )
    parser.add_argument(
        "--once", action="store_true",
        help="Run one poll cycle and exit (useful for testing)",
    )

    return parser.parse_args()


def resolve_profile(args):
    """Resolve agent name, system prompt, and LLM settings from profile or args."""
    name = args.name or "StandaloneAgent"
    system_prompt = args.system_prompt or ""
    provider = args.provider
    model = args.model

    if args.profile:
        profile = None
        for p in AGENT_PROFILES:
            if p["name"].lower() == args.profile.lower():
                profile = p
                break

        if not profile:
            available = [p["name"] for p in AGENT_PROFILES]
            print(f"ERROR: Unknown profile '{args.profile}'. Available: {', '.join(available)}")
            sys.exit(1)

        name = args.name or profile["name"]
        system_prompt = args.system_prompt or profile["prompt"]

        # Use profile's LLM settings as defaults (CLI args override)
        if not args.provider or args.provider == "openai":
            provider = profile.get("llm_provider", provider)
        if not args.model:
            model = profile.get("llm_model", model)

    if not system_prompt:
        system_prompt = (
            "You are an AI prediction agent participating in a prediction market.\n\n"
            "Analyze the question, consider the current market price and prediction history, "
            "then provide your probability estimate.\n\n"
            "Be calibrated, consider base rates, and give genuine probability estimates."
        )

    return name, system_prompt, provider, model


class StandaloneAgent:
    """Self-contained prediction agent that polls and predicts autonomously."""

    def __init__(self, name, market_client, llm, system_prompt, auto_claim=True):
        self.name = name
        self.client = market_client
        self.llm = llm
        self.system_prompt = system_prompt
        self.address = market_client.address
        self.auto_claim = auto_claim

        # Track which markets we've already processed
        self.predicted_markets = set()
        self.claimed_markets = set()

    def sync_state(self):
        """Sync with on-chain state: which markets have we already predicted/claimed?"""
        count = self.client.get_market_count()
        print(f"[{self.name}] Syncing state for {count} markets...")

        for market_id in range(count):
            try:
                if self.client.has_predicted(market_id, self.address):
                    self.predicted_markets.add(market_id)
                info = self.client.get_market_info(market_id)
                if info["resolved"] and self.client.has_claimed(market_id, self.address):
                    self.claimed_markets.add(market_id)
            except Exception as e:
                print(f"[{self.name}] Sync error on market #{market_id}: {e}")

        print(f"[{self.name}] Synced: {len(self.predicted_markets)} predicted, "
              f"{len(self.claimed_markets)} claimed")

    def poll_cycle(self):
        """One full poll cycle: scan markets, predict, claim."""
        try:
            market_count = self.client.get_market_count()
        except Exception as e:
            print(f"[{self.name}] Failed to get market count: {e}")
            return

        for market_id in range(market_count):
            # Skip already predicted
            if market_id in self.predicted_markets:
                # But check if we should claim
                if self.auto_claim:
                    self._try_claim(market_id)
                continue

            try:
                self._process_market(market_id)
            except Exception as e:
                print(f"[{self.name}] Error on market #{market_id}: {e}")

    def _process_market(self, market_id):
        """Evaluate and potentially predict on a single market."""
        # Check if still active
        try:
            active = self.client.is_market_active(market_id)
        except Exception:
            return

        if not active:
            # Market resolved, skip prediction but try claim
            if self.auto_claim:
                self._try_claim(market_id)
            return

        # Check if already predicted on-chain (double-check)
        try:
            if self.client.has_predicted(market_id, self.address):
                self.predicted_markets.add(market_id)
                return
        except Exception:
            return

        # Check balance (bond + gas)
        try:
            params = self.client.get_market_params(market_id)
            bond = params["bond_amount"]
            balance = self.client.w3.eth.get_balance(self.address)
            gas_buffer = int(0.01e18)  # 0.01 ETH for gas

            if balance < bond + gas_buffer:
                print(f"[{self.name}] Insufficient balance for market #{market_id} "
                      f"(need {(bond + gas_buffer) / 1e18:.4f} ETH, have {balance / 1e18:.4f} ETH)")
                return
        except Exception as e:
            print(f"[{self.name}] Balance check failed for market #{market_id}: {e}")
            return

        # Observe → Reason → Predict
        print(f"[{self.name}] === Market #{market_id} ===")
        try:
            state = self._observe(market_id)
        except Exception as e:
            print(f"[{self.name}] Observe failed: {e}")
            return

        print(f"[{self.name}] Question: {state['question']}")
        print(f"[{self.name}] Current price: {state['current_price']}")

        try:
            reasoning = self._reason(state)
        except Exception as e:
            print(f"[{self.name}] LLM reasoning failed, skipping: {e}")
            return

        prob = reasoning["probability"]
        print(f"[{self.name}] Prediction: {prob:.4f} (confidence: {reasoning.get('confidence', 'N/A')})")
        print(f"[{self.name}] Reasoning: {reasoning['reasoning'][:200]}...")

        # Submit on-chain
        try:
            prob_wad = int(prob * WAD)
            prob_wad = max(int(0.01e18), min(int(0.99e18), prob_wad))

            print(f"[{self.name}] Submitting TX (bond={bond / 1e18:.4f} ETH)...")
            receipt = self.client.predict(market_id, prob_wad, bond)
            tx_hash = receipt["transactionHash"].hex()
            print(f"[{self.name}] TX confirmed: {tx_hash}")

            self.predicted_markets.add(market_id)

            # Check if market resolved after our prediction
            info = self.client.get_market_info(market_id)
            if info["resolved"]:
                print(f"[{self.name}] Market #{market_id} resolved after our prediction!")
                if self.auto_claim:
                    self._try_claim(market_id)

        except Exception as e:
            error_msg = str(e).lower()
            if "already predicted" in error_msg:
                print(f"[{self.name}] Already predicted on market #{market_id} (TX reverted)")
                self.predicted_markets.add(market_id)
            elif "market resolved" in error_msg or "not active" in error_msg:
                print(f"[{self.name}] Market #{market_id} is resolved (TX reverted)")
            else:
                print(f"[{self.name}] Prediction TX failed: {e}")

    def _observe(self, market_id):
        """Read market state from chain."""
        market = self.client.get_market(market_id)
        predictions = self.client.get_predictions(market_id)

        history = []
        for p in predictions:
            history.append({
                "predictor": p["predictor"][:10] + "...",
                "probability": round(p["probability"] / WAD, 4),
                "price_before": round(p["price_before"] / WAD, 4),
                "price_after": round(p["price_after"] / WAD, 4),
            })

        return {
            "question": market["question"],
            "current_price": round(market["current_price"] / WAD, 4),
            "prediction_count": market["prediction_count"],
            "resolved": market["resolved"],
            "history": history,
        }

    def _reason(self, market_state):
        """Use LLM to produce a probability estimate."""
        user_prompt = f"""Market Question: {market_state['question']}
Current Market Price: {market_state['current_price']} (probability)
Number of Previous Predictions: {market_state['prediction_count']}
Prediction History: {json.dumps(market_state['history'], indent=2)}

Based on your analysis, what probability do you assign to this question?
Respond in JSON format:
{{"reasoning": "your reasoning here", "probability": 0.XX, "confidence": 0.XX}}

Rules:
- probability must be between 0.02 and 0.98
- confidence is how sure you are about your probability estimate (0-1)
- Be specific in your reasoning"""

        content = self.llm.chat(self.system_prompt, user_prompt)
        result = json.loads(content)

        # Clamp probability
        prob = max(0.02, min(0.98, float(result.get("probability", 0.5))))
        result["probability"] = prob
        return result

    def _try_claim(self, market_id):
        """Attempt to claim payout from a resolved market."""
        if market_id in self.claimed_markets:
            return
        if market_id not in self.predicted_markets:
            return

        try:
            info = self.client.get_market_info(market_id)
            if not info["resolved"]:
                return

            if self.client.has_claimed(market_id, self.address):
                self.claimed_markets.add(market_id)
                return

            payout = self.client.get_payout(market_id, self.address)
            if payout == 0:
                self.claimed_markets.add(market_id)
                return

            print(f"[{self.name}] Claiming payout for market #{market_id}: {payout / 1e18:.6f} ETH")
            self.client.claim_payout(market_id)
            self.claimed_markets.add(market_id)
            print(f"[{self.name}] Payout claimed!")

        except Exception as e:
            error_msg = str(e).lower()
            if "already claimed" in error_msg:
                self.claimed_markets.add(market_id)
            else:
                print(f"[{self.name}] Claim failed for market #{market_id}: {e}")


def main():
    args = parse_args()

    # Validate required args
    if not args.key:
        print("ERROR: Private key required. Use --key or set AGENT_PRIVATE_KEY env var.")
        sys.exit(1)
    if not args.contract:
        print("ERROR: Contract address required. Use --contract or set CONTRACT_ADDRESS env var.")
        sys.exit(1)

    auto_claim = args.auto_claim and not args.no_auto_claim

    # Resolve profile
    name, system_prompt, provider, model = resolve_profile(args)

    # Initialize market client
    print(f"[{name}] Connecting to chain...")
    client = MarketClient(
        rpc_url=args.rpc,
        contract_address=args.contract,
        private_key=args.key,
    )
    print(f"[{name}] Wallet: {client.address}")

    balance = client.w3.eth.get_balance(client.address)
    print(f"[{name}] Balance: {balance / 1e18:.4f} ETH")

    # Initialize LLM
    print(f"[{name}] LLM: {provider}" + (f"/{model}" if model else ""))
    llm_kwargs = {}
    if model:
        llm_kwargs["model"] = model
    if args.llm_key:
        llm_kwargs["api_key"] = args.llm_key
    llm = create_llm_provider(provider, **llm_kwargs)

    # Create agent
    agent = StandaloneAgent(
        name=name,
        market_client=client,
        llm=llm,
        system_prompt=system_prompt,
        auto_claim=auto_claim,
    )

    # Sync existing state
    agent.sync_state()

    # Banner
    print()
    print(f"  +---------------------------------------------------+")
    print(f"  |  YILING PROTOCOL — Standalone Agent                |")
    print(f"  +---------------------------------------------------+")
    print(f"  Agent    : {name}")
    print(f"  Wallet   : {client.address}")
    print(f"  Balance  : {balance / 1e18:.4f} ETH")
    print(f"  Contract : {args.contract}")
    print(f"  RPC      : {args.rpc}")
    print(f"  LLM      : {llm.provider_name}")
    print(f"  Poll     : every {args.poll_interval}s")
    print(f"  AutoClaim: {auto_claim}")
    print()

    if args.once:
        print(f"[{name}] Running single poll cycle...")
        agent.poll_cycle()
        print(f"[{name}] Done.")
        return

    # Stagger startup to avoid collision with other agents starting at the same time
    jitter = random.uniform(0, args.poll_interval)
    print(f"[{name}] Starting in {jitter:.1f}s (jitter)...")
    time.sleep(jitter)

    print(f"[{name}] Polling for markets... (Ctrl+C to stop)\n")

    try:
        while True:
            agent.poll_cycle()
            time.sleep(args.poll_interval)
    except KeyboardInterrupt:
        print(f"\n[{name}] Stopped.")


if __name__ == "__main__":
    main()
