#!/usr/bin/env python3
"""
Yiling Protocol - Self-Resolving Prediction Market

Oracle-free prediction market on Base with AI agent predictions.
Users create markets via the frontend (wallet connect).

Two modes:
  --mode watch        Read-only: monitor chain + broadcast events to dashboard
  --mode orchestrate  Full: run built-in agents, orchestrate predictions, accept webhook agents

Usage:
    python run.py --mode watch               # Watch mode (read-only dashboard)
    python run.py --mode orchestrate         # Orchestrator mode (agents + webhooks)
    python run.py --poll-interval 10         # Poll every 10 seconds
"""

import argparse
import sys
import os
import time

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from config import (
    RPC_URL, CONTRACT_ADDRESS, AGENT_KEYS, OWNER_KEY,
    OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, LLM_MODEL,
    DEFAULT_ALPHA, DEFAULT_K, DEFAULT_FLAT_REWARD, DEFAULT_BOND_AMOUNT,
    DEFAULT_LIQUIDITY_PARAM, DELAY_BETWEEN_PREDICTIONS,
)
from market_client import MarketClient
from event_broadcaster import EventBroadcaster
from api_server import start_api_server, set_shared_state


# ── Watch mode stack ─────────────────────────────────────────────────────────

def build_watcher_stack(args):
    """Initialize read-only components for watch mode (no agents, no orchestrator)."""
    if not CONTRACT_ADDRESS:
        print("ERROR: CONTRACT_ADDRESS not set. Deploy the contract first and set it in .env")
        sys.exit(1)

    # Read-only market client — needs a key for web3 init but won't send TX
    read_key = next((k for k in AGENT_KEYS if k), "")
    if not read_key:
        print("ERROR: At least one AGENT_KEY needed for RPC access. Set AGENT_KEY_1 in .env")
        sys.exit(1)

    market_client = MarketClient(
        rpc_url=RPC_URL,
        contract_address=CONTRACT_ADDRESS,
        private_key=read_key,
    )

    broadcaster = EventBroadcaster(port=args.ws_port)

    # Build address → name labels from agent keys
    from agents.profiles import AGENT_PROFILES
    address_labels = {}
    for i, profile in enumerate(AGENT_PROFILES):
        key = AGENT_KEYS[i] if i < len(AGENT_KEYS) else ""
        if key:
            try:
                from web3 import Web3
                acct = Web3().eth.account.from_key(key)
                address_labels[acct.address] = profile["name"]
            except Exception:
                pass

    from chain_watcher import ChainWatcher
    watcher = ChainWatcher(
        market_client=market_client,
        broadcaster=broadcaster,
        poll_interval=args.poll_interval,
        address_labels=address_labels,
    )

    return market_client, broadcaster, watcher


def print_watch_banner(args, protocol_config):
    print()
    print("  +---------------------------------------------------+")
    print("  |         YILING PROTOCOL                      |")
    print("  |   Self-Resolving Prediction Market (SKC)          |")
    print("  |   Bond-Based - Oracle-Free - Base Sepolia          |")
    print("  +---------------------------------------------------+")
    print()
    print(f"  Contract  : {CONTRACT_ADDRESS}")
    print(f"  Treasury  : {protocol_config['treasury']} (on-chain)")
    print(f"  Fee       : {protocol_config['protocol_fee_bps']/100}% (on-chain)")
    print(f"  Network   : Base Sepolia ({RPC_URL})")
    print(f"  Mode      : WATCH (read-only — standalone agents predict independently)")
    print(f"  Poll      : every {args.poll_interval}s")
    print(f"  Dashboard : frontend/index.html (ws://localhost:{args.ws_port})")
    print(f"  API       : http://localhost:{args.api_port}/docs")
    print()


# ── Orchestrate mode stack ──────────────────────────────────────────────────

def build_orchestrate_stack(args):
    """Initialize all components for orchestrate mode."""
    from base_agent import BaseAgent
    from agents.profiles import AGENT_PROFILES
    from orchestrator import Orchestrator

    if not CONTRACT_ADDRESS:
        print("ERROR: CONTRACT_ADDRESS not set. Deploy the contract first and set it in .env")
        sys.exit(1)

    llm_api_keys = {
        "openai": OPENAI_API_KEY,
        "anthropic": ANTHROPIC_API_KEY,
        "gemini": GOOGLE_API_KEY,
    }
    available_providers = [p for p, k in llm_api_keys.items() if k]
    if not available_providers:
        print("ERROR: No LLM API keys set. Set at least OPENAI_API_KEY in .env")
        sys.exit(1)
    print(f"  LLM providers available: {', '.join(available_providers)}")

    active_profiles = []
    active_keys = []
    for i, profile in enumerate(AGENT_PROFILES):
        key = AGENT_KEYS[i] if i < len(AGENT_KEYS) else ""
        if key:
            active_profiles.append(profile)
            active_keys.append(key)
        else:
            print(f"WARNING: AGENT_KEY_{i+1} not set — skipping {profile['name']}")

    if not active_keys:
        print("ERROR: No agent keys configured. Set at least AGENT_KEY_1 in .env")
        sys.exit(1)

    market_client = MarketClient(
        rpc_url=RPC_URL,
        contract_address=CONTRACT_ADDRESS,
        private_key=active_keys[0],
    )

    prediction_agents = []
    for profile, key in zip(active_profiles, active_keys):
        provider = profile.get("llm_provider", "openai")
        model = profile.get("llm_model", LLM_MODEL)
        api_key = llm_api_keys.get(provider, OPENAI_API_KEY)

        if not api_key and OPENAI_API_KEY:
            print(f"  WARNING: {provider.upper()} API key missing for {profile['name']}, falling back to OpenAI")
            provider = "openai"
            model = LLM_MODEL
            api_key = OPENAI_API_KEY

        prediction_agents.append(BaseAgent(
            name=profile["name"],
            system_prompt=profile["prompt"],
            private_key=key,
            rpc_url=RPC_URL,
            contract_address=CONTRACT_ADDRESS,
            openai_api_key=OPENAI_API_KEY,
            llm_provider=provider,
            llm_model=model,
            llm_api_key=api_key,
        ))

    broadcaster = EventBroadcaster(port=args.ws_port)

    owner_client = None
    if OWNER_KEY:
        owner_client = MarketClient(
            rpc_url=RPC_URL,
            contract_address=CONTRACT_ADDRESS,
            private_key=OWNER_KEY,
        )

    orchestrator = Orchestrator(
        prediction_agents=prediction_agents,
        market_client=market_client,
        broadcaster=broadcaster,
        alpha=DEFAULT_ALPHA,
        k=DEFAULT_K,
        flat_reward=DEFAULT_FLAT_REWARD,
        bond_amount=DEFAULT_BOND_AMOUNT,
        liquidity_param=DEFAULT_LIQUIDITY_PARAM,
        delay=args.delay,
        owner_client=owner_client,
    )

    return market_client, prediction_agents, orchestrator, broadcaster


def print_orchestrate_banner(args, prediction_agents, protocol_config):
    print()
    print("  +---------------------------------------------------+")
    print("  |         YILING PROTOCOL                      |")
    print("  |   Self-Resolving Prediction Market (SKC)          |")
    print("  |   Bond-Based - Oracle-Free - Base Sepolia          |")
    print("  +---------------------------------------------------+")
    print()
    print(f"  Contract  : {CONTRACT_ADDRESS}")
    print(f"  Treasury  : {protocol_config['treasury']} (on-chain)")
    print(f"  Fee       : {protocol_config['protocol_fee_bps']/100}% (on-chain)")
    print(f"  Network   : Base Sepolia ({RPC_URL})")
    print(f"  Agents    : {len(prediction_agents)} active")
    for a in prediction_agents:
        print(f"               - {a.name} ({a.llm.provider_name})")
    print(f"  Bond      : {DEFAULT_BOND_AMOUNT/1e18} ETH")
    print(f"  Liquidity : {DEFAULT_LIQUIDITY_PARAM/1e18} ETH (b param)")
    print(f"  Mode      : ORCHESTRATE (built-in agents + webhook agents)")
    print(f"  Poll      : every {args.poll_interval}s")
    print(f"  Dashboard : frontend/index.html (ws://localhost:{args.ws_port})")
    print()


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Yiling Protocol - Self-Resolving Prediction Market")
    parser.add_argument("--mode", choices=["watch", "orchestrate"], default="watch",
                        help="Run mode: 'watch' (read-only dashboard) or 'orchestrate' (agents + webhooks)")
    parser.add_argument("--delay", type=float, default=DELAY_BETWEEN_PREDICTIONS,
                        help="Delay between predictions in orchestrate mode (seconds)")
    parser.add_argument("--ws-port", type=int, default=8765, help="WebSocket port for live dashboard")
    parser.add_argument("--poll-interval", type=float, default=5.0, help="Poll interval in seconds (default: 5)")
    parser.add_argument("--api-port", type=int, default=8000, help="REST API port (default: 8000)")
    args = parser.parse_args()

    if args.mode == "watch":
        _run_watch_mode(args)
    else:
        _run_orchestrate_mode(args)


def _run_watch_mode(args):
    """Watch mode: read-only chain monitoring + event broadcast."""
    market_client, broadcaster, watcher = build_watcher_stack(args)
    protocol_config = market_client.get_protocol_config()

    print_watch_banner(args, protocol_config)

    # Start WebSocket server
    broadcaster.start()

    # Start REST API (no orchestrator in watch mode)
    set_shared_state(market_client, None, chain_watcher=watcher)
    start_api_server(port=args.api_port)

    # Initialize watcher baseline
    watcher.start()

    print("  Watching chain for events... (Ctrl+C to stop)\n")

    try:
        while True:
            watcher.poll()
            time.sleep(args.poll_interval)
    except KeyboardInterrupt:
        print("\n[ChainWatcher] Stopped.")


def _run_orchestrate_mode(args):
    """Orchestrate mode: full agent management with webhook support."""
    from market_watcher import MarketWatcher
    from agent_registry import AgentRegistry
    from remote_agent import RemoteAgent

    market_client, prediction_agents, orchestrator, broadcaster = build_orchestrate_stack(args)
    protocol_config = market_client.get_protocol_config()

    print_orchestrate_banner(args, prediction_agents, protocol_config)

    # Start WebSocket server
    broadcaster.start()

    # Start REST API server
    set_shared_state(market_client, orchestrator)
    start_api_server(port=args.api_port)

    # Load previously registered remote agents
    registry = AgentRegistry()
    for agent_rec in registry.list_active():
        remote = RemoteAgent(
            agent_id=agent_rec["id"],
            name=agent_rec["name"],
            webhook_url=agent_rec["webhook_url"],
            wallet_address=agent_rec["wallet_address"],
            market_client=market_client,
        )
        orchestrator.add_remote_agent(remote)

    watcher = MarketWatcher(
        market_client=market_client,
        orchestrator=orchestrator,
        broadcaster=broadcaster,
        poll_interval=args.poll_interval,
    )
    watcher.start()

    print("  Watching for new markets... (Ctrl+C to stop)\n")

    try:
        while True:
            watcher.poll()
            time.sleep(args.poll_interval)
    except KeyboardInterrupt:
        print("\n[MarketWatcher] Stopped.")
        watcher.stop()


if __name__ == "__main__":
    main()
