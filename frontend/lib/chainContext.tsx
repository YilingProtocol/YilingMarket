"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { type ChainKey, CHAINS, DEFAULT_CHAIN, type ChainConfig } from "./contracts";

interface ChainContextValue {
  selectedChain: ChainKey;
  chainConfig: ChainConfig;
  setSelectedChain: (chain: ChainKey) => void;
}

const ChainContext = createContext<ChainContextValue | null>(null);

function getInitialChain(): ChainKey {
  if (typeof window === "undefined") return DEFAULT_CHAIN;
  const stored = localStorage.getItem("yiling-chain");
  if (stored === "base" || stored === "monad") return stored;
  return DEFAULT_CHAIN;
}

export function ChainProvider({ children }: { children: ReactNode }) {
  const [selectedChain, setSelectedChainState] = useState<ChainKey>(getInitialChain);

  const setSelectedChain = useCallback((chain: ChainKey) => {
    setSelectedChainState(chain);
    localStorage.setItem("yiling-chain", chain);
  }, []);

  const chainConfig = CHAINS[selectedChain];

  return (
    <ChainContext.Provider value={{ selectedChain, chainConfig, setSelectedChain }}>
      {children}
    </ChainContext.Provider>
  );
}

export function useChain() {
  const ctx = useContext(ChainContext);
  if (!ctx) throw new Error("useChain must be used within ChainProvider");
  return ctx;
}
