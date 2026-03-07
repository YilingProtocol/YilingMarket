"""
Yiling Protocol - Agent Registry
Manages registration and lookup of external (remote) prediction agents.
Persists data to a JSON file so registrations survive restarts.
"""

import json
import os
import time
import uuid
from threading import Lock

REGISTRY_FILE = os.path.join(os.path.dirname(__file__), "registered_agents.json")


class AgentRegistry:
    """Thread-safe registry for external prediction agents."""

    def __init__(self, filepath: str = REGISTRY_FILE):
        self._filepath = filepath
        self._lock = Lock()
        self._agents: dict[str, dict] = {}
        self._load()

    def _load(self):
        """Load registered agents from disk."""
        if os.path.exists(self._filepath):
            try:
                with open(self._filepath, "r") as f:
                    self._agents = json.load(f)
            except (json.JSONDecodeError, IOError):
                self._agents = {}

    def _save(self):
        """Persist registry to disk."""
        with open(self._filepath, "w") as f:
            json.dump(self._agents, f, indent=2)

    def register(self, name: str, webhook_url: str, wallet_address: str, description: str = "") -> dict:
        """Register a new external agent. Returns the created agent record."""
        with self._lock:
            # Check for duplicate name
            for agent in self._agents.values():
                if agent["name"].lower() == name.lower():
                    raise ValueError(f"Agent with name '{name}' already registered")

            agent_id = uuid.uuid4().hex[:12]
            api_key = uuid.uuid4().hex  # Simple API key for authentication

            record = {
                "id": agent_id,
                "name": name,
                "webhook_url": webhook_url,
                "wallet_address": wallet_address,
                "description": description,
                "api_key": api_key,
                "registered_at": time.time(),
                "predictions_made": 0,
                "last_active": None,
                "active": True,
            }

            self._agents[agent_id] = record
            self._save()
            return record

    def unregister(self, agent_id: str) -> bool:
        """Remove an agent from the registry."""
        with self._lock:
            if agent_id in self._agents:
                del self._agents[agent_id]
                self._save()
                return True
            return False

    def get(self, agent_id: str) -> dict | None:
        """Get a single agent by ID."""
        return self._agents.get(agent_id)

    def get_by_api_key(self, api_key: str) -> dict | None:
        """Look up agent by API key (for webhook authentication)."""
        for agent in self._agents.values():
            if agent["api_key"] == api_key:
                return agent
        return None

    def list_active(self) -> list[dict]:
        """Return all active agents."""
        return [a for a in self._agents.values() if a.get("active", True)]

    def list_all(self) -> list[dict]:
        """Return all agents."""
        return list(self._agents.values())

    def record_prediction(self, agent_id: str):
        """Increment prediction count and update last_active timestamp."""
        with self._lock:
            if agent_id in self._agents:
                self._agents[agent_id]["predictions_made"] += 1
                self._agents[agent_id]["last_active"] = time.time()
                self._save()

    def set_active(self, agent_id: str, active: bool):
        """Enable or disable an agent."""
        with self._lock:
            if agent_id in self._agents:
                self._agents[agent_id]["active"] = active
                self._save()
