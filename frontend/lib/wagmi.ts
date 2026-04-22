import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";
import { CHAINS, CHAIN_LIST } from "./contracts";

// Build viem chain definitions dynamically from our chain list
const viemChains = CHAIN_LIST.map((c) =>
  defineChain({
    id: c.chainId,
    name: c.name,
    nativeCurrency: c.nativeCurrency,
    rpcUrls: {
      default: { http: [c.rpcUrl] },
    },
    blockExplorers: {
      default: { name: `${c.name} Explorer`, url: c.explorerUrl },
    },
    testnet: c.testnet,
  })
);

// Build transports map
const transports: Record<number, ReturnType<typeof http>> = {};
for (const c of CHAIN_LIST) {
  transports[c.chainId] = http(c.rpcUrl);
}

// Export named chains for direct access if needed
export const monadTestnet = viemChains.find((c) => c.id === CHAINS.monad.chainId)!;
export const baseSepolia = viemChains.find((c) => c.id === CHAINS.baseSepolia.chainId)!;

export const config = createConfig({
  chains: viemChains as [typeof viemChains[0], ...typeof viemChains],
  connectors: [injected()],
  transports,
  ssr: true,
  multiInjectedProviderDiscovery: false,
});
