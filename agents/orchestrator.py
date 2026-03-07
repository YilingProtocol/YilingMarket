import time
import random
from base_agent import BaseAgent
from market_client import MarketClient, WAD
from event_broadcaster import EventBroadcaster
from agents.profiles import AGENT_PROFILES


class Orchestrator:
    """Yiling Protocol orchestrator - runs AI agents on detected markets."""

    AGENT_TITLES = {p["name"]: p["title"] for p in AGENT_PROFILES}

    def __init__(
        self,
        prediction_agents: list[BaseAgent],
        market_client: MarketClient,
        broadcaster: EventBroadcaster = None,
        alpha: int = int(0.1e18),
        k: int = 2,
        flat_reward: int = int(0.05e18),
        bond_amount: int = int(0.1e18),
        liquidity_param: int = int(1e18),
        delay: float = 2.0,
        owner_client: MarketClient = None,
    ):
        self.agents = prediction_agents
        self.remote_agents = []  # RemoteAgent instances from registry
        self.market_client = market_client
        self.broadcaster = broadcaster or EventBroadcaster()
        self.alpha = alpha
        self.k = k
        self.flat_reward = flat_reward
        self.bond_amount = bond_amount
        self.liquidity_param = liquidity_param
        self.delay = delay
        self.owner_client = owner_client
        self.leaderboard = {a.name: 0.0 for a in prediction_agents}

    def add_remote_agent(self, remote_agent):
        """Add a remote (webhook-based) agent to the prediction pool."""
        self.remote_agents.append(remote_agent)
        if remote_agent.name not in self.leaderboard:
            self.leaderboard[remote_agent.name] = 0.0
        print(f"[Orchestrator] Remote agent added: {remote_agent.name}")

    def remove_remote_agent(self, agent_id: str):
        """Remove a remote agent by ID."""
        self.remote_agents = [a for a in self.remote_agents if a.agent_id != agent_id]

    def _get_all_agents(self):
        """Get combined list of local + remote agents."""
        return list(self.agents) + list(self.remote_agents)

    def _update_gas(self):
        """Broadcast current gas price."""
        try:
            gas_price = self.market_client.w3.eth.gas_price
            gwei = gas_price / 1e9
            self.broadcaster.gas_update(round(gwei, 2))
        except Exception:
            pass

    def run_market(self, market_id: int) -> dict:
        """Run agents on a market — each agent predicts once (paper-faithful).
        Market resolves via random stop or force-resolve after all agents predicted."""
        results = []
        total_agents = len(self.agents)

        self._update_gas()

        # Single pass: each agent predicts once (paper assumption)
        agent_order = self._get_all_agents()
        random.shuffle(agent_order)

        for round_num, agent in enumerate(agent_order, 1):
            # Broadcast round progress
            self.broadcaster.round_update(round_num, total_agents, agent.name)

            # Agent thinking phase
            self.broadcaster.agent_thinking(agent.name, market_id)
            time.sleep(0.5)

            try:
                # Balance check - skip agent if too low
                balance = agent.client.w3.eth.get_balance(agent.address)
                needed = self.bond_amount + 500_000 * agent.client.w3.eth.gas_price
                if balance < needed:
                    print(f"[{agent.name}] Insufficient balance ({balance/1e18:.4f} ETH), skipping")
                    self.broadcaster.emit("error", {
                        "agent": agent.name,
                        "message": f"Low balance: {balance/1e18:.4f} ETH, skipping turn",
                    })
                    continue

                # Observe
                state = agent.observe_market(market_id)
                if state["resolved"]:
                    return self._generate_report(market_id, results)

                # Reason (LLM call)
                reasoning = agent.reason(state)
                prob = reasoning["probability"]
                confidence = reasoning.get("confidence", 0)

                self.broadcaster.agent_reasoning(
                    agent_name=agent.name,
                    reasoning=reasoning["reasoning"],
                    probability=prob,
                    confidence=confidence,
                )

                # Submit prediction on-chain (bond is the deposit)
                prob_wad = int(prob * WAD)
                prob_wad = max(int(0.01e18), min(int(0.99e18), prob_wad))

                t0 = time.time()
                receipt = agent.client.predict(market_id, prob_wad, self.bond_amount)
                confirm_time = round(time.time() - t0, 1)

                tx_hash = receipt["transactionHash"].hex()
                gas_used = receipt.get("gasUsed", 0)

                self.broadcaster.prediction_submitted(
                    agent_name=agent.name,
                    probability=prob,
                    tx_hash=tx_hash,
                    gas_used=gas_used,
                    confirm_time=confirm_time,
                )

                # Check if market resolved (dice roll)
                market_info = agent.client.get_market_info(market_id)
                resolved = market_info["resolved"]

                # Dice roll animation
                time.sleep(0.3)
                self.broadcaster.dice_roll(market_id, continues=not resolved)

                results.append({
                    "round": round_num,
                    "agent": agent.name,
                    "probability": prob,
                    "reasoning": reasoning["reasoning"],
                    "confidence": confidence,
                    "tx_hash": tx_hash,
                    "gas_used": gas_used,
                    "confirm_time": confirm_time,
                    "status": "predicted",
                })

                if resolved:
                    # Find the last predictor (referee)
                    self.broadcaster.market_resolved(
                        market_id=market_id,
                        final_price=prob,
                        referee_agent=self.AGENT_TITLES.get(agent.name, agent.name),
                        total_predictions=round_num,
                    )
                    return self._generate_report(market_id, results)

            except Exception as e:
                print(f"[{agent.name}] Error: {e}")
                self.broadcaster.emit("error", {
                    "agent": agent.name,
                    "message": str(e),
                })
                results.append({
                    "round": round_num,
                    "agent": agent.name,
                    "status": "error",
                    "error": str(e),
                })

            self._update_gas()
            time.sleep(self.delay)

        # All agents predicted, market not resolved → force resolve now
        market_info = self.market_client.get_market_info(market_id)
        if not market_info["resolved"]:
            self.broadcaster.emit("system", {
                "message": f"All agents predicted on market #{market_id}. Force-resolving...",
            })
            try:
                resolve_client = self.owner_client or self.market_client
                resolve_client.force_resolve(market_id)
                time.sleep(2)
                final_info = self.market_client.get_market_info(market_id)
                final_price = final_info["current_price"] / WAD
                self.broadcaster.dice_roll(market_id, continues=False)
                self.broadcaster.market_resolved(
                    market_id=market_id,
                    final_price=final_price,
                    referee_agent="All agents predicted",
                    total_predictions=final_info["prediction_count"],
                )
            except Exception as e:
                print(f"[Orchestrator] Force-resolve failed: {e}")
                self.broadcaster.emit("error", {
                    "message": f"Force-resolve failed: {e}",
                })

        return self._generate_report(market_id, results)

    def _generate_report(self, market_id: int, results: list) -> dict:
        """Generate report and update leaderboard."""
        market = self.market_client.get_market(market_id)

        # Update leaderboard with payouts
        if market["resolved"]:
            # Count predictions per agent from on-chain data
            all_preds = self.market_client.get_predictions(market_id)
            for agent in self._get_all_agents():
                try:
                    payout = self.market_client.get_payout(market_id, agent.address)
                    pred_count = sum(1 for p in all_preds if p["predictor"].lower() == agent.address.lower())
                    total_bonds = pred_count * self.bond_amount

                    # Net profit = payout - total bonds deposited
                    net_mon = (payout - total_bonds) / WAD if payout > 0 else -total_bonds / WAD
                    self.leaderboard[agent.name] += net_mon

                    self.broadcaster.payout_update(
                        agent_name=agent.name,
                        amount=round(net_mon, 6),
                        total_earned=round(self.leaderboard[agent.name], 6),
                    )
                except Exception:
                    pass

        # Broadcast leaderboard
        sorted_lb = sorted(self.leaderboard.items(), key=lambda x: x[1], reverse=True)
        self.broadcaster.emit("leaderboard", {
            "rankings": [{"agent": k, "total_mon": round(v, 6)} for k, v in sorted_lb],
        })

        print(f"\nMarket #{market_id} Report:")
        print(f"  Question: {market['question']}")
        print(f"  Final Price: {market['current_price'] / WAD:.4f}")
        print(f"  Resolved: {market['resolved']}")
        print(f"  Predictions: {market['prediction_count']}")

        return {
            "market_id": market_id,
            "market": market,
            "results": results,
            "leaderboard": dict(self.leaderboard),
        }


