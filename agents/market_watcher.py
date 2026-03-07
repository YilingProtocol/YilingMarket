"""
Market Watcher — Polls for new on-chain markets and triggers AI agents reactively.

When users create markets via the frontend (wallet connect), this watcher detects
the new market and dispatches the orchestrator to run predictions on it.
"""

import threading
import time
from market_client import MarketClient
from orchestrator import Orchestrator
from event_broadcaster import EventBroadcaster


class MarketWatcher:
    """Watches for new on-chain markets and triggers AI agent predictions."""

    def __init__(
        self,
        market_client: MarketClient,
        orchestrator: Orchestrator,
        broadcaster: EventBroadcaster,
        poll_interval: float = 5.0,
    ):
        self.market_client = market_client
        self.orchestrator = orchestrator
        self.broadcaster = broadcaster
        self.poll_interval = poll_interval
        self.baseline = 0
        self._lock = threading.Lock()
        self._running = False

    def start(self):
        """Read current market count as baseline, then begin polling."""
        self.baseline = self.market_client.get_market_count()
        self._running = True
        print(f"[MarketWatcher] Baseline: {self.baseline} existing markets")
        print(f"[MarketWatcher] Polling every {self.poll_interval}s for new markets...")
        self.broadcaster.emit("system", {
            "message": f"Watcher active — monitoring for new markets (baseline: {self.baseline})",
        })

    def stop(self):
        self._running = False

    def poll(self):
        """Check for new markets. Call this in a loop from the main thread."""
        if not self._running:
            return

        try:
            current_count = self.market_client.get_market_count()
        except Exception as e:
            print(f"[MarketWatcher] Poll error: {e}")
            return

        if current_count <= self.baseline:
            return

        # New markets detected
        for market_id in range(self.baseline, current_count):
            self._handle_new_market(market_id)

        self.baseline = current_count

    def _handle_new_market(self, market_id: int):
        """Process a newly detected market."""
        with self._lock:
            try:
                info = self.market_client.get_market_info(market_id)
                creator = info["creator"].lower()
                question = info["question"]
                price = info["current_price"] / (10**18)

                print(f"[MarketWatcher] New market #{market_id} detected!")
                print(f"  Creator: {creator}")
                print(f"  Question: {question}")

                # Broadcast the new market to frontend
                self.broadcaster.market_created(
                    market_id=market_id,
                    question=question,
                    initial_price=price,
                    category="User",
                    source="user",
                )

                self.broadcaster.emit("system", {
                    "message": f"Market #{market_id} detected — dispatching agents...",
                })

                # Run agents on the market
                report = self.orchestrator.run_market(market_id)

                # Claim payouts if resolved
                if report.get("market", {}).get("resolved"):
                    self._claim_payouts(market_id)

            except Exception as e:
                print(f"[MarketWatcher] Error handling market #{market_id}: {e}")
                self.broadcaster.emit("error", {
                    "message": f"Watcher error on market #{market_id}: {e}",
                })

    def _claim_payouts(self, market_id: int):
        """Claim payouts for all built-in agents on a resolved market."""
        for agent in self.orchestrator.agents:
            try:
                payout = self.market_client.get_payout(market_id, agent.address)
                if payout > 0:
                    agent.client.claim_payout(market_id)
                    print(f"[MarketWatcher] Claimed payout for {agent.name} on market #{market_id}")
            except Exception as e:
                print(f"[MarketWatcher] Claim failed for {agent.name}: {e}")
