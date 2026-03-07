import asyncio
import json
import queue
import threading
import time
import websockets


class EventBroadcaster:
    """WebSocket server that broadcasts agent events to the frontend dashboard."""

    def __init__(self, host="0.0.0.0", port=8765):
        self.host = host
        self.port = port
        self.clients = set()
        self._ready_clients = set()  # Clients that finished replay and are ready for live
        self.loop = None
        self._thread = None
        self._ready = threading.Event()
        self._queue = queue.Queue()
        self._market_events = []
        self._send_count = 0

    def start(self):
        """Start the WebSocket server in a background thread."""
        self._thread = threading.Thread(target=self._run_server, daemon=True)
        self._thread.start()
        self._ready.wait(timeout=5)

    def _kill_port(self):
        """Kill any stale process holding our port (Windows)."""
        import subprocess
        subprocess.run(
            ["powershell", "-Command",
             f"Get-NetTCPConnection -LocalPort {self.port} -ErrorAction SilentlyContinue"
             f" | ForEach-Object {{ Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }}"],
            capture_output=True,
        )

    def _run_server(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        try:
            self.loop.run_until_complete(self._serve())
        except OSError:
            print(f"[EventBroadcaster] Port {self.port} busy, killing stale process...")
            self._kill_port()
            time.sleep(1)
            try:
                self.loop.run_until_complete(self._serve())
            except OSError:
                print(f"[EventBroadcaster] FAILED to bind port {self.port}. Dashboard will not work.")
                self._ready.set()

    async def _serve(self):
        async with websockets.serve(self._handler, self.host, self.port):
            print(f"[EventBroadcaster] WebSocket server running on ws://{self.host}:{self.port}")
            self._ready.set()
            await self._drain_queue()

    async def _drain_queue(self):
        """Drain the thread-safe queue and broadcast messages to ready clients."""
        while True:
            try:
                message = self._queue.get_nowait()
                await self._broadcast(message)
            except queue.Empty:
                await asyncio.sleep(0.05)
            except Exception as e:
                # Never let the drain loop die
                print(f"[EventBroadcaster] Broadcast error (continuing): {e}")

    async def _handler(self, websocket):
        self.clients.add(websocket)
        print(f"[EventBroadcaster] Client connected ({len(self.clients)} total)")
        # Replay buffered events so late-joiners see full market history
        # Client is NOT in _ready_clients yet, so _drain_queue won't send to it during replay
        try:
            for msg in list(self._market_events):  # snapshot copy
                await websocket.send(msg)
        except websockets.exceptions.ConnectionClosed:
            self.clients.discard(websocket)
            return
        # Now mark ready for live events
        self._ready_clients.add(websocket)
        try:
            async for _ in websocket:
                pass
        finally:
            self.clients.discard(websocket)
            self._ready_clients.discard(websocket)
            print(f"[EventBroadcaster] Client disconnected ({len(self.clients)} total)")

    def emit(self, event_type: str, data: dict):
        """Emit an event to all connected clients (thread-safe, never drops)."""
        message = json.dumps({
            "type": event_type,
            "data": data,
            "timestamp": time.time(),
        })

        # Buffer for replay (reset on new market)
        if event_type == "market_created":
            self._market_events = []
        self._market_events.append(message)

        # Enqueue for broadcast
        self._queue.put(message)

        # Terminal log
        if event_type not in ("gas_update",):
            print(f"[EVENT] {event_type}: {json.dumps(data, default=str)[:200]}")

    async def _broadcast(self, message):
        """Send message only to clients that finished replay."""
        dead = set()
        for client in list(self._ready_clients):
            try:
                await client.send(message)
                self._send_count += 1
            except Exception:
                dead.add(client)
        self._ready_clients -= dead
        self.clients -= dead

    # ---- Convenience event methods ----

    def market_created(self, market_id, question, initial_price, category="", source="ai"):
        self.emit("market_created", {
            "market_id": market_id,
            "question": question,
            "initial_price": initial_price,
            "category": category,
            "source": source,
        })

    def agent_thinking(self, agent_name, market_id):
        self.emit("agent_thinking", {
            "agent_name": agent_name,
            "market_id": market_id,
        })

    def agent_reasoning(self, agent_name, reasoning, probability, confidence):
        self.emit("agent_reasoning", {
            "agent_name": agent_name,
            "reasoning": reasoning,
            "probability": probability,
            "confidence": confidence,
        })

    def prediction_submitted(self, agent_name, probability, tx_hash, gas_used, confirm_time):
        self.emit("prediction_submitted", {
            "agent_name": agent_name,
            "probability": probability,
            "tx_hash": tx_hash,
            "gas_used": gas_used,
            "confirm_time": confirm_time,
        })

    def dice_roll(self, market_id, continues):
        self.emit("dice_roll", {
            "market_id": market_id,
            "continues": continues,
        })

    def market_resolved(self, market_id, final_price, referee_agent, total_predictions):
        self.emit("market_resolved", {
            "market_id": market_id,
            "final_price": final_price,
            "referee": referee_agent,
            "total_predictions": total_predictions,
        })

    def payout_update(self, agent_name, amount, total_earned):
        self.emit("payout_update", {
            "agent_name": agent_name,
            "amount": amount,
            "total_earned": total_earned,
        })

    def gas_update(self, gas_price_gwei):
        self.emit("gas_update", {
            "gas_price_gwei": gas_price_gwei,
        })

    def round_update(self, round_num, max_rounds, current_agent):
        self.emit("round_update", {
            "round": round_num,
            "max_rounds": max_rounds,
            "current_agent": current_agent,
        })
