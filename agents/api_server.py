"""
Yiling Protocol - REST API Server
Provides endpoints for external agent registration and market data queries.

Run standalone:  uvicorn api_server:app --host 0.0.0.0 --port 8000
Or import start_api_server() from run.py to run alongside the agent system.
"""

import threading
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from typing import Optional
from agent_registry import AgentRegistry

# ─── App & Registry ───────────────────────────────────────────────────────────

app = FastAPI(
    title="Yiling Protocol API",
    description="Oracle-Free Self-Resolving Prediction Market — Agent SDK API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

registry = AgentRegistry()

# These get injected at runtime by run.py via set_shared_state()
_market_client = None
_orchestrator = None
_chain_watcher = None


def set_shared_state(market_client, orchestrator, chain_watcher=None):
    """Called by run.py to inject shared market_client, orchestrator, and/or chain_watcher."""
    global _market_client, _orchestrator, _chain_watcher
    _market_client = market_client
    _orchestrator = orchestrator
    _chain_watcher = chain_watcher


# ─── Request / Response Models ─────────────────────────────────────────────────

class RegisterAgentRequest(BaseModel):
    name: str
    webhook_url: HttpUrl
    wallet_address: str
    description: str = ""


class RegisterAgentResponse(BaseModel):
    id: str
    name: str
    api_key: str
    message: str


# ─── Agent Endpoints ───────────────────────────────────────────────────────────

@app.post("/api/agents/register", response_model=RegisterAgentResponse)
def register_agent(req: RegisterAgentRequest):
    """Register a new external prediction agent."""
    try:
        record = registry.register(
            name=req.name,
            webhook_url=str(req.webhook_url),
            wallet_address=req.wallet_address,
            description=req.description,
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    return RegisterAgentResponse(
        id=record["id"],
        name=record["name"],
        api_key=record["api_key"],
        message=f"Agent '{record['name']}' registered successfully. Save your api_key — it cannot be retrieved later.",
    )


@app.delete("/api/agents/{agent_id}")
def unregister_agent(agent_id: str):
    """Remove a registered agent."""
    if not registry.unregister(agent_id):
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": "Agent unregistered successfully"}


@app.get("/api/agents")
def list_agents():
    """List all registered agents (api_key is redacted)."""
    agents = registry.list_all()
    # Redact api_key for security
    return [
        {
            "id": a["id"],
            "name": a["name"],
            "webhook_url": a["webhook_url"],
            "wallet_address": a["wallet_address"],
            "description": a["description"],
            "predictions_made": a["predictions_made"],
            "last_active": a["last_active"],
            "active": a["active"],
            "registered_at": a["registered_at"],
        }
        for a in agents
    ]


# ─── Market Endpoints ─────────────────────────────────────────────────────────

@app.get("/api/markets")
def list_markets():
    """List all markets with basic info."""
    if not _market_client:
        raise HTTPException(status_code=503, detail="Market client not initialized")

    count = _market_client.get_market_count()
    markets = []
    for i in range(count):
        try:
            info = _market_client.get_market_info(i)
            is_active = _market_client.is_market_active(i) if not info["resolved"] else False
            markets.append({
                "market_id": i,
                "question": info["question"],
                "creator": info["creator"],
                "current_price": info["current_price"] / 1e18,
                "resolved": info["resolved"],
                "is_active": is_active,
                "prediction_count": info["prediction_count"],
                "total_pool": info["total_pool"] / 1e18,
            })
        except Exception:
            pass
    return markets


@app.get("/api/markets/count")
def get_market_count():
    """Get total number of markets created."""
    if not _market_client:
        raise HTTPException(status_code=503, detail="Market client not initialized")

    return {"count": _market_client.get_market_count()}


@app.get("/api/markets/{market_id}")
def get_market(market_id: int):
    """Get detailed info for a single market including prediction history."""
    if not _market_client:
        raise HTTPException(status_code=503, detail="Market client not initialized")

    try:
        info = _market_client.get_market_info(market_id)
        params = _market_client.get_market_params(market_id)
        predictions = _market_client.get_predictions(market_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Market not found: {e}")

    return {
        "market_id": market_id,
        "question": info["question"],
        "current_price": info["current_price"] / 1e18,
        "creator": info["creator"],
        "resolved": info["resolved"],
        "total_pool": info["total_pool"] / 1e18,
        "prediction_count": info["prediction_count"],
        "params": {
            "alpha": params["alpha"] / 1e18,
            "k": params["k"],
            "flat_reward": params["flat_reward"] / 1e18,
            "bond_amount": params["bond_amount"] / 1e18,
            "liquidity_param": params["liquidity_param"] / 1e18,
            "created_at": params["created_at"],
        },
        "predictions": [
            {
                "index": i,
                "predictor": p["predictor"],
                "probability": p["probability"] / 1e18,
                "price_before": p["price_before"] / 1e18,
                "price_after": p["price_after"] / 1e18,
                "bond": p["bond"] / 1e18,
                "timestamp": p["timestamp"],
            }
            for i, p in enumerate(predictions)
        ],
    }


# ─── Leaderboard Endpoint ─────────────────────────────────────────────────────

@app.get("/api/leaderboard")
def get_leaderboard():
    """Get current agent leaderboard rankings.
    Uses orchestrator leaderboard if available, otherwise computes from on-chain data."""
    if _orchestrator:
        # Orchestrate mode: use in-memory leaderboard
        sorted_lb = sorted(
            _orchestrator.leaderboard.items(),
            key=lambda x: x[1],
            reverse=True,
        )
        return {
            "rankings": [
                {"rank": i + 1, "agent": name, "total_mon": round(mon, 6)}
                for i, (name, mon) in enumerate(sorted_lb)
            ]
        }

    if _chain_watcher:
        # Watch mode: compute leaderboard from on-chain data
        leaderboard = _chain_watcher.get_leaderboard()
        sorted_lb = sorted(leaderboard.items(), key=lambda x: x[1], reverse=True)
        return {
            "rankings": [
                {"rank": i + 1, "agent": name, "total_mon": round(mon, 6)}
                for i, (name, mon) in enumerate(sorted_lb)
            ]
        }

    if not _market_client:
        raise HTTPException(status_code=503, detail="No data source available")

    # Fallback: compute directly from chain (expensive)
    leaderboard = _compute_onchain_leaderboard()
    sorted_lb = sorted(leaderboard.items(), key=lambda x: x[1], reverse=True)
    return {
        "rankings": [
            {"rank": i + 1, "agent": name, "total_mon": round(mon, 6)}
            for i, (name, mon) in enumerate(sorted_lb)
        ]
    }


def _compute_onchain_leaderboard():
    """Compute leaderboard directly from on-chain data (fallback)."""
    leaderboard = {}
    try:
        count = _market_client.get_market_count()
    except Exception:
        return leaderboard

    for market_id in range(count):
        try:
            info = _market_client.get_market_info(market_id)
            if not info["resolved"]:
                continue

            params = _market_client.get_market_params(market_id)
            bond = params["bond_amount"]
            pred_count = info["prediction_count"]

            seen = set()
            for idx in range(pred_count):
                pred = _market_client.get_prediction(market_id, idx)
                address = pred["predictor"]
                if address in seen:
                    continue
                seen.add(address)

                payout = _market_client.get_payout(market_id, address)
                net_mon = (payout - bond) / 1e18 if payout > 0 else -bond / 1e18
                short_addr = f"{address[:6]}...{address[-4:]}"
                leaderboard[short_addr] = leaderboard.get(short_addr, 0.0) + net_mon
        except Exception:
            continue

    return leaderboard


# ─── Resolution & Payouts ────────────────────────────────────────────────────

@app.get("/api/markets/{market_id}/resolution")
def get_market_resolution(market_id: int):
    """Get resolution status and payout info for a market."""
    if not _market_client:
        raise HTTPException(status_code=503, detail="Market client not initialized")

    try:
        info = _market_client.get_market_info(market_id)
        params = _market_client.get_market_params(market_id)
        bond_stats = _market_client.contract.functions.getMarketBondStats(market_id).call()
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Market not found: {e}")

    return {
        "market_id": market_id,
        "resolved": info["resolved"],
        "final_price": info["current_price"] / 1e18,
        "prediction_count": info["prediction_count"],
        "total_pool": info["total_pool"] / 1e18,
        "total_bonds": bond_stats[0] / 1e18,
        "total_payouts_allocated": bond_stats[1] / 1e18,
        "alpha": params["alpha"] / 1e18,
        "k": params["k"],
        "resolution_mechanism": "Random stop (alpha) or force-resolve after 2 days",
    }


@app.get("/api/markets/{market_id}/leaderboard")
def get_market_leaderboard(market_id: int):
    """Get per-market leaderboard rankings in a single call."""
    if not _market_client:
        raise HTTPException(status_code=503, detail="Market client not initialized")

    try:
        info = _market_client.get_market_info(market_id)
        params = _market_client.get_market_params(market_id)
        predictions = _market_client.get_predictions(market_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Market not found: {e}")

    if not info["resolved"] or not predictions:
        return {"market_id": market_id, "resolved": info["resolved"], "rankings": []}

    # Get agent name mapping
    agent_name_map = _get_agent_name_map()
    bond = params["bond_amount"]

    # Fetch payout for each unique predictor
    seen = set()
    entries = []
    for pred in predictions:
        addr = pred["predictor"]
        if addr in seen:
            continue
        seen.add(addr)
        try:
            payout = _market_client.get_payout(market_id, addr)
            net_mon = (payout - bond) / 1e18 if payout > 0 else -bond / 1e18
            name = agent_name_map.get(addr.lower(), f"{addr[:6]}...{addr[-4:]}")
            entries.append({"agent": name, "total_mon": round(net_mon, 6)})
        except Exception:
            continue

    entries.sort(key=lambda x: x["total_mon"], reverse=True)
    return {"market_id": market_id, "resolved": True, "rankings": entries}


def _get_agent_name_map():
    """Get agent address -> name mapping."""
    import os
    from web3 import Account
    from agents.profiles import AGENT_PROFILES

    mapping = {}
    for i, profile in enumerate(AGENT_PROFILES):
        key = os.getenv(f"AGENT_KEY_{i+1}", "")
        if key:
            try:
                addr = Account.from_key(key).address
                mapping[addr.lower()] = profile["name"]
            except Exception:
                pass
    return mapping


@app.get("/api/markets/{market_id}/payouts/{address}")
def get_payout(market_id: int, address: str):
    """Get payout amount for a specific address in a resolved market."""
    if not _market_client:
        raise HTTPException(status_code=503, detail="Market client not initialized")

    try:
        payout = _market_client.get_payout(market_id, address)
        info = _market_client.get_market_info(market_id)
        has_claimed = _market_client.has_claimed(market_id, address)
        has_predicted = _market_client.has_predicted(market_id, address)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Not found: {e}")

    return {
        "market_id": market_id,
        "address": address,
        "has_predicted": has_predicted,
        "payout_amount": payout / 1e18,
        "resolved": info["resolved"],
        "has_claimed": has_claimed,
    }


@app.get("/api/markets/{market_id}/predictions")
def get_predictions(market_id: int, index: Optional[int] = None):
    """Get predictions for a market. Pass ?index=N for a single prediction."""
    if not _market_client:
        raise HTTPException(status_code=503, detail="Market client not initialized")

    try:
        if index is not None:
            p = _market_client.get_prediction(market_id, index)
            return {
                "market_id": market_id,
                "index": index,
                "predictor": p["predictor"],
                "probability": p["probability"] / 1e18,
                "price_before": p["price_before"] / 1e18,
                "price_after": p["price_after"] / 1e18,
                "bond": p["bond"] / 1e18,
                "timestamp": p["timestamp"],
            }

        predictions = _market_client.get_predictions(market_id)
        return {
            "market_id": market_id,
            "count": len(predictions),
            "predictions": [
                {
                    "index": i,
                    "predictor": p["predictor"],
                    "probability": p["probability"] / 1e18,
                    "price_before": p["price_before"] / 1e18,
                    "price_after": p["price_after"] / 1e18,
                    "bond": p["bond"] / 1e18,
                    "timestamp": p["timestamp"],
                }
                for i, p in enumerate(predictions)
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Not found: {e}")


# ─── Protocol Config ────────────────────────────────────────────────────────

@app.get("/api/protocol")
def get_protocol_config():
    """Get protocol-level configuration (owner, treasury, fee)."""
    if not _market_client:
        raise HTTPException(status_code=503, detail="Market client not initialized")

    try:
        config = _market_client.get_protocol_config()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read config: {e}")

    return {
        "owner": config["owner"],
        "treasury": config["treasury"],
        "protocol_fee_bps": config["protocol_fee_bps"],
        "protocol_fee_percent": config["protocol_fee_bps"] / 100,
    }


@app.get("/api/markets/{market_id}/active")
def is_market_active(market_id: int):
    """Check if a market is still active (not yet resolved)."""
    if not _market_client:
        raise HTTPException(status_code=503, detail="Market client not initialized")

    try:
        active = _market_client.is_market_active(market_id)
        return {"market_id": market_id, "active": active}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Market not found: {e}")


# ─── Agent Address Mapping ─────────────────────────────────────────────────────

@app.get("/api/agent-names")
def get_agent_names():
    """Get mapping of agent wallet addresses to names."""
    import os
    from web3 import Account
    from agents.profiles import AGENT_PROFILES

    mapping = {}
    for i, profile in enumerate(AGENT_PROFILES):
        key = os.getenv(f"AGENT_KEY_{i+1}", "")
        if key:
            try:
                addr = Account.from_key(key).address
                mapping[addr.lower()] = profile["name"]
            except Exception:
                pass
    return mapping


# ─── ABI Download ─────────────────────────────────────────────────────────────

@app.get("/api/abi")
def get_abi():
    """Download the contract ABI for direct on-chain interaction."""
    from fastapi.responses import JSONResponse
    from config import load_abi
    try:
        abi = load_abi()
        # Always return as a JSON array (not wrapped in an object)
        if isinstance(abi, list):
            return JSONResponse(content=abi)
        if isinstance(abi, dict) and "abi" in abi:
            return JSONResponse(content=abi["abi"])
        return JSONResponse(content=abi)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    mode = "orchestrate" if _orchestrator else ("watch" if _chain_watcher else "standalone")
    return {
        "status": "ok",
        "mode": mode,
        "registered_agents": len(registry.list_all()),
        "market_client": _market_client is not None,
        "orchestrator": _orchestrator is not None,
        "chain_watcher": _chain_watcher is not None,
    }


# ─── Server Launcher ──────────────────────────────────────────────────────────

def start_api_server(host: str = "0.0.0.0", port: int = 8000):
    """Start the API server in a background thread (non-blocking)."""
    thread = threading.Thread(
        target=uvicorn.run,
        args=(app,),
        kwargs={"host": host, "port": port, "log_level": "warning"},
        daemon=True,
    )
    thread.start()
    print(f"[API] REST server running on http://{host}:{port}")
    print(f"[API] Docs: http://localhost:{port}/docs")
    return thread
