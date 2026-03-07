import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";
import { RPC_URL, CHAIN_ID, EXPLORER_URL } from "./contracts";

export const baseSepolia = defineChain({
  id: CHAIN_ID,
  name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: "BaseScan", url: EXPLORER_URL },
  },
  testnet: true,
});

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(RPC_URL),
  },
  ssr: true,
  multiInjectedProviderDiscovery: false,
});
