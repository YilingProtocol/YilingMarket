/**
 * x402 Payment Helper for Yiling Market
 * Creates an x402-enabled fetch that signs payments with the user's wallet.
 * Any external developer can use this same pattern.
 */

import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import { createPublicClient, http, type WalletClient } from "viem";

const MONAD_CHAIN = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
};

/**
 * Create an x402-enabled fetch using the user's connected wallet.
 */
export function createX402Fetch(walletClient: WalletClient, address: `0x${string}`) {
  const publicClient = createPublicClient({
    chain: MONAD_CHAIN,
    transport: http("https://testnet-rpc.monad.xyz"),
  });

  // toClientEvmSigner expects signer.address at top level
  // wagmi walletClient may not have it, so we create a compatible signer
  const signer = {
    address,
    signTypedData: (msg: any) => walletClient.signTypedData(msg),
    readContract: publicClient.readContract.bind(publicClient),
  };

  const client = new x402Client();
  const evmSigner = toClientEvmSigner(signer as any, publicClient);
  registerExactEvmScheme(client, { signer: evmSigner });

  return wrapFetchWithPayment(fetch, new x402HTTPClient(client));
}
