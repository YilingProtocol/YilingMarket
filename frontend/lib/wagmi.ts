import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";
import { CHAINS } from "./contracts";

export const baseSepolia = defineChain({
  id: CHAINS.base.chainId,
  name: CHAINS.base.name,
  nativeCurrency: CHAINS.base.nativeCurrency,
  rpcUrls: {
    default: { http: [CHAINS.base.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "BaseScan", url: CHAINS.base.explorerUrl },
  },
  testnet: true,
});

export const monadTestnet = defineChain({
  id: CHAINS.monad.chainId,
  name: CHAINS.monad.name,
  nativeCurrency: CHAINS.monad.nativeCurrency,
  rpcUrls: {
    default: { http: [CHAINS.monad.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: CHAINS.monad.explorerUrl },
  },
  testnet: true,
});

export const config = createConfig({
  chains: [baseSepolia, monadTestnet],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(CHAINS.base.rpcUrl),
    [monadTestnet.id]: http(CHAINS.monad.rpcUrl),
  },
  ssr: true,
  multiInjectedProviderDiscovery: false,
});
