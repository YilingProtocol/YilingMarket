from web3 import Web3
# ExtraDataToPOAMiddleware removed — not needed for Base Sepolia
from config import load_abi

WAD = 10**18


class MarketClient:
    """Yiling Protocol - Web3 client for interacting with the PredictionMarket contract."""

    def __init__(self, rpc_url: str, contract_address: str, private_key: str):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 60}))
        # POA middleware not needed for Base Sepolia

        self.account = self.w3.eth.account.from_key(private_key)
        self.address = self.account.address

        abi = load_abi()
        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=abi,
        )

    def _send_tx(self, fn, value=0, gas=300_000):
        """Build, sign, and send a transaction."""
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

        # Check transaction status
        if receipt.get("status") == 0:
            raise Exception(f"Transaction reverted: {tx_hash.hex()}")

        return receipt

    # ---- Read functions ----

    def get_market_info(self, market_id: int) -> dict:
        """Get core market data."""
        result = self.contract.functions.getMarketInfo(market_id).call()
        return {
            "question": result[0],
            "current_price": result[1],
            "creator": result[2],
            "resolved": result[3],
            "total_pool": result[4],
            "prediction_count": result[5],
        }

    def get_market_params(self, market_id: int) -> dict:
        """Get market configuration parameters."""
        result = self.contract.functions.getMarketParams(market_id).call()
        return {
            "alpha": result[0],
            "k": result[1],
            "flat_reward": result[2],
            "bond_amount": result[3],
            "liquidity_param": result[4],
            "created_at": result[5],
        }

    def get_protocol_config(self) -> dict:
        """Get protocol-level config (owner, treasury, fee)."""
        result = self.contract.functions.getProtocolConfig().call()
        return {
            "owner": result[0],
            "treasury": result[1],
            "protocol_fee_bps": result[2],
        }

    def get_market(self, market_id: int) -> dict:
        """Get full market state (info + params combined)."""
        info = self.get_market_info(market_id)
        params = self.get_market_params(market_id)
        return {**info, **params}

    def get_prediction(self, market_id: int, index: int) -> dict:
        """Get a specific prediction."""
        result = self.contract.functions.getPrediction(market_id, index).call()
        return {
            "predictor": result[0],
            "probability": result[1],
            "price_before": result[2],
            "price_after": result[3],
            "bond": result[4],
            "timestamp": result[5],
        }

    def get_predictions(self, market_id: int) -> list:
        """Get all predictions for a market."""
        count = self.contract.functions.getPredictionCount(market_id).call()
        return [self.get_prediction(market_id, i) for i in range(count)]

    def get_current_price(self, market_id: int) -> float:
        """Get current market price as a float (0-1)."""
        info = self.get_market_info(market_id)
        return info["current_price"] / WAD

    def get_payout(self, market_id: int, address: str) -> int:
        """Get payout amount for an address (unsigned, includes bond return)."""
        return self.contract.functions.getPayoutAmount(
            market_id, Web3.to_checksum_address(address)
        ).call()

    def is_market_active(self, market_id: int) -> bool:
        return self.contract.functions.isMarketActive(market_id).call()

    def has_predicted(self, market_id: int, address: str) -> bool:
        """Check if an address has already predicted on a market."""
        return self.contract.functions.hasPredicted(
            market_id, Web3.to_checksum_address(address)
        ).call()

    def has_claimed(self, market_id: int, address: str) -> bool:
        """Check if an address has already claimed payout from a resolved market."""
        return self.contract.functions.hasClaimed(
            market_id, Web3.to_checksum_address(address)
        ).call()

    def get_prediction_count(self, market_id: int) -> int:
        """Get the number of predictions for a market."""
        return self.contract.functions.getPredictionCount(market_id).call()

    def get_market_count(self) -> int:
        return self.contract.functions.getMarketCount().call()

    # ---- Write functions ----

    def create_market(
        self,
        question: str,
        alpha: int,
        k: int,
        flat_reward: int,
        bond_amount: int,
        liquidity_param: int,
        initial_price: int,
        funding: int = None,
    ) -> int:
        """Create a new prediction market. Returns market ID."""
        if funding is None:
            funding = flat_reward * k + liquidity_param

        market_id = self.get_market_count()

        fn = self.contract.functions.createMarket(
            question, alpha, k, flat_reward, bond_amount,
            liquidity_param, initial_price,
        )
        self._send_tx(fn, value=funding, gas=500_000)

        new_count = self.get_market_count()
        if new_count != market_id + 1:
            print(f"[WARNING] Market count mismatch: expected {market_id + 1}, got {new_count}")

        info = self.get_market_info(market_id)
        print(f"[Verify] Market #{market_id}: price={info['current_price']/1e18:.4f}, q={info['question'][:50]}")

        return market_id

    def predict(self, market_id: int, probability: int, bond_amount: int):
        """Make a prediction on a market. Bond is the deposit amount. Returns tx receipt.
        Gas limit is high because predict() may trigger _resolveMarket() internally,
        which iterates all predictions with expensive ln() math."""
        fn = self.contract.functions.predict(market_id, probability)
        return self._send_tx(fn, value=bond_amount, gas=3_000_000)

    def claim_payout(self, market_id: int):
        """Claim payout from a resolved market."""
        fn = self.contract.functions.claimPayout(market_id)
        return self._send_tx(fn)

    def force_resolve(self, market_id: int):
        """Force-resolve an unresolved market (owner or after 2 days)."""
        fn = self.contract.functions.forceResolve(market_id)
        return self._send_tx(fn, gas=3_000_000)

    def sweep_residual(self, market_id: int):
        """Sweep remaining funds from a resolved market to treasury."""
        fn = self.contract.functions.sweepResidual(market_id)
        return self._send_tx(fn)

