/**
 * x402 Payment Helper for Yiling Market
 * Creates an x402-enabled fetch that signs payments with the user's wallet.
 * Supports multiple EVM chains — chain is determined by the selected payment chain.
 */

import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import { createPublicClient, http, type WalletClient } from "viem";
import type { ChainConfig } from "./contracts";

/**
 * Build a minimal viem-compatible chain object from ChainConfig.
 */
function toViemChain(chain: ChainConfig) {
  return {
    id: chain.chainId,
    name: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: { default: { http: [chain.rpcUrl] } },
  };
}

/**
 * Create an x402-enabled fetch using the user's connected wallet.
 * The chain parameter determines which network is used for payment signing.
 */
export function createX402Fetch(
  walletClient: WalletClient,
  address: `0x${string}`,
  chain: ChainConfig
) {
  const viemChain = toViemChain(chain);

  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(chain.rpcUrl),
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
