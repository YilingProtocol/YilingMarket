"""
Yiling Protocol — Chain Watcher

Polling-based blockchain watcher that monitors on-chain prediction market events
and broadcasts them to the frontend dashboard via EventBroadcaster.

Replaces the Orchestrator in "watch" mode — no agents, no TX sending,
just read-only monitoring + WebSocket event broadcast.
"""

import time
from market_client import MarketClient, WAD
from event_broadcaster import EventBroadcaster


class ChainWatcher:
    """Watches blockchain state and broadcasts events to frontend."""

    def __init__(
        self,
        market_client: MarketClient,
        broadcaster: EventBroadcaster,
        poll_interval: float = 5.0,
        address_labels: dict = None,
    ):
        self.client = market_client
        self.broadcaster = broadcaster
        self.poll_interval = poll_interval

        # Address → display name mapping
        self.address_labels = address_labels or {}

        # Tracked state
        self.known_market_count = 0
        self.market_prediction_counts = {}   # market_id → last known prediction count
        self.resolved_markets = set()        # market_ids we've already seen as resolved

    def start(self):
        """Initialize baseline state from chain."""
        try:
            self.known_market_count = self.client.get_market_count()
        except Exception as e:
            print(f"[ChainWatcher] Failed to get initial market count: {e}")
            self.known_market_count = 0

        # Build initial state for all existing markets
        for market_id in range(self.known_market_count):
            try:
                info = self.client.get_market_info(market_id)
                self.market_prediction_counts[market_id] = info["prediction_count"]
                if info["resolved"]:
                    self.resolved_markets.add(market_id)
            except Exception:
                self.market_prediction_counts[market_id] = 0

        print(f"[ChainWatcher] Baseline: {self.known_market_count} markets, "
              f"{len(self.resolved_markets)} resolved")
        self.broadcaster.emit("system", {
            "message": f"Chain watcher active — monitoring {self.known_market_count} markets",
        })

    def poll(self):
        """One poll cycle: check for new markets, new predictions, resolutions."""
        self._check_new_markets()
        self._check_market_updates()
        self._update_gas()

    def _check_new_markets(self):
        """Detect newly created markets."""
        try:
            current_count = self.client.get_market_count()
        except Exception as e:
            print(f"[ChainWatcher] Poll error (market count): {e}")
            return

        if current_count <= self.known_market_count:
            return

        for market_id in range(self.known_market_count, current_count):
            try:
                info = self.client.get_market_info(market_id)
                question = info["question"]
                price = info["current_price"] / WAD

                print(f"[ChainWatcher] New market #{market_id}: {question}")

                self.broadcaster.market_created(
                    market_id=market_id,
                    question=question,
                    initial_price=price,
                    category="User",
                    source="user",
                )

                self.market_prediction_counts[market_id] = info["prediction_count"]
                if info["resolved"]:
                    self.resolved_markets.add(market_id)

            except Exception as e:
                print(f"[ChainWatcher] Error reading new market #{market_id}: {e}")
                self.market_prediction_counts[market_id] = 0

        self.known_market_count = current_count

    def _check_market_updates(self):
        """Check active markets for new predictions and resolutions."""
        for market_id in range(self.known_market_count):
            if market_id in self.resolved_markets:
                continue

            try:
                info = self.client.get_market_info(market_id)
            except Exception:
                continue

            # Check for new predictions
            old_count = self.market_prediction_counts.get(market_id, 0)
            new_count = info["prediction_count"]

            if new_count > old_count:
                self._broadcast_new_predictions(market_id, old_count, new_count)
                self.market_prediction_counts[market_id] = new_count

            # Check for resolution
            if info["resolved"] and market_id not in self.resolved_markets:
                self._broadcast_resolution(market_id, info)
                self.resolved_markets.add(market_id)

    def _broadcast_new_predictions(self, market_id, old_count, new_count):
        """Broadcast each new prediction on a market."""
        for idx in range(old_count, new_count):
            try:
                pred = self.client.get_prediction(market_id, idx)
                predictor = pred["predictor"]
                prob = pred["probability"] / WAD
                display_name = self._resolve_name(predictor)

                print(f"[ChainWatcher] Market #{market_id} prediction #{idx}: "
                      f"{display_name} → {prob:.4f}")

                self.broadcaster.prediction_submitted(
                    agent_name=display_name,
                    probability=prob,
                    tx_hash="",  # We don't have the TX hash from polling
                    gas_used=0,
                    confirm_time=0,
                )

                # Dice roll: continues if market is still active after this prediction
                # We check after broadcasting all new predictions
                if idx == new_count - 1:
                    try:
                        still_active = self.client.is_market_active(market_id)
                        self.broadcaster.dice_roll(market_id, continues=still_active)
                    except Exception:
                        pass

            except Exception as e:
                print(f"[ChainWatcher] Error reading prediction #{idx} on market #{market_id}: {e}")

    def _broadcast_resolution(self, market_id, info):
        """Broadcast market resolution and payout updates."""
        final_price = info["current_price"] / WAD
        pred_count = info["prediction_count"]

        # Find the last predictor (referee)
        referee = "Unknown"
        if pred_count > 0:
            try:
                last_pred = self.client.get_prediction(market_id, pred_count - 1)
                referee = self._resolve_name(last_pred["predictor"])
            except Exception:
                pass

        print(f"[ChainWatcher] Market #{market_id} RESOLVED at {final_price:.4f} "
              f"(referee: {referee}, {pred_count} predictions)")

        self.broadcaster.market_resolved(
            market_id=market_id,
            final_price=final_price,
            referee_agent=referee,
            total_predictions=pred_count,
        )

        # Broadcast payouts for all predictors
        self._broadcast_payouts(market_id, pred_count)

    def _broadcast_payouts(self, market_id, pred_count):
        """Read and broadcast payout info for all predictors of a resolved market."""
        try:
            params = self.client.get_market_params(market_id)
            bond = params["bond_amount"]
        except Exception:
            bond = int(0.1e18)

        seen_addresses = set()
        for idx in range(pred_count):
            try:
                pred = self.client.get_prediction(market_id, idx)
                address = pred["predictor"]

                if address in seen_addresses:
                    continue
                seen_addresses.add(address)

                payout = self.client.get_payout(market_id, address)
                display_name = self._resolve_name(address)
                net_mon = (payout - bond) / WAD if payout > 0 else -bond / WAD

                self.broadcaster.payout_update(
                    agent_name=display_name,
                    amount=round(net_mon, 6),
                    total_earned=round(net_mon, 6),  # Per-market, not cumulative
                )
            except Exception:
                continue

    def _update_gas(self):
        """Broadcast current gas price."""
        try:
            gas_price = self.client.w3.eth.gas_price
            gwei = gas_price / 1e9
            self.broadcaster.gas_update(round(gwei, 2))
        except Exception:
            pass

    def _resolve_name(self, address):
        """Resolve an address to a display name."""
        address_lower = address.lower()
        for label_addr, name in self.address_labels.items():
            if label_addr.lower() == address_lower:
                return name
        # Shortened address as fallback
        return f"{address[:6]}...{address[-4:]}"

    def get_leaderboard(self):
        """Compute leaderboard from on-chain data for all resolved markets."""
        leaderboard = {}  # address → total net ETH

        for market_id in self.resolved_markets:
            try:
                info = self.client.get_market_info(market_id)
                params = self.client.get_market_params(market_id)
                bond = params["bond_amount"]
                pred_count = info["prediction_count"]

                seen_addresses = set()
                for idx in range(pred_count):
                    pred = self.client.get_prediction(market_id, idx)
                    address = pred["predictor"]

                    if address in seen_addresses:
                        continue
                    seen_addresses.add(address)

                    payout = self.client.get_payout(market_id, address)
                    net_mon = (payout - bond) / WAD if payout > 0 else -bond / WAD

                    display_name = self._resolve_name(address)
                    leaderboard[display_name] = leaderboard.get(display_name, 0.0) + net_mon

            except Exception:
                continue

        return leaderboard
