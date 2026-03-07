import os
import json
from dotenv import load_dotenv

load_dotenv()

# Base Sepolia
RPC_URL = os.getenv("RPC_URL", "https://sepolia.base.org")
CHAIN_ID = 84532

# Contract - set after deployment
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "")

# Agent private keys (one per agent, indexed 1-7)
AGENT_KEYS = [os.getenv(f"AGENT_KEY_{i+1}", "") for i in range(7)]

# Contract owner key (for forceResolve when all agents have predicted)
OWNER_KEY = os.getenv("OWNER_KEY", "")

# LLM API keys (each provider uses its own key)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

# Market defaults
DEFAULT_ALPHA = int(0.1e18)             # 10% stop probability (~10 predictions per market)
DEFAULT_K = 2                           # Last 2 agents get flat reward
DEFAULT_FLAT_REWARD = int(0.001e18)     # 0.001 ETH flat reward R
DEFAULT_BOND_AMOUNT = int(0.001e18)     # 0.001 ETH bond (deposit) per prediction
DEFAULT_LIQUIDITY_PARAM = int(0.003e18) # b = 0.003 ETH — SCEM scaling parameter
DEFAULT_INITIAL_PRICE = int(0.5e18)     # 50%
# Note: protocol fee and treasury are set on-chain at deploy time (not configurable per-market)

# Orchestrator
MAX_ROUNDS_PER_MARKET = 30
DELAY_BETWEEN_PREDICTIONS = 2  # seconds


def load_abi():
    """Load contract ABI. Tries multiple sources in order:
    1. CONTRACT_ABI_PATH env var (custom path)
    2. Foundry build artifacts (full repo)
    3. Bundled abi.json (standalone distribution)
    """
    # 1. Custom path via env var
    custom_path = os.getenv("CONTRACT_ABI_PATH", "")
    if custom_path and os.path.exists(custom_path):
        with open(custom_path, "r") as f:
            data = json.load(f)
            return data["abi"] if "abi" in data else data

    # 2. Foundry build artifacts (full repo structure)
    foundry_path = os.path.join(
        os.path.dirname(__file__), "..", "contracts", "out",
        "PredictionMarket.sol", "PredictionMarket.json"
    )
    if os.path.exists(foundry_path):
        with open(foundry_path, "r") as f:
            return json.load(f)["abi"]

    # 3. Bundled abi.json (for standalone/external use)
    bundled_path = os.path.join(os.path.dirname(__file__), "abi.json")
    if os.path.exists(bundled_path):
        with open(bundled_path, "r") as f:
            return json.load(f)

    raise FileNotFoundError(
        "Contract ABI not found. Options:\n"
        "  1. Set CONTRACT_ABI_PATH env var to your ABI JSON file\n"
        "  2. Run 'forge build' in the contracts/ directory\n"
        "  3. Place abi.json in the agents/ directory"
    )
