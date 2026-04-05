"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type ChainKey, CHAINS, DEFAULT_CHAIN, type ChainConfig } from "./contracts";

interface ChainContextValue {
  selectedChain: ChainKey;
  chainConfig: ChainConfig;
  setSelectedChain: (chain: ChainKey) => void;
}

const STORAGE_KEY = "yiling-selected-chain";

function getInitialChain(): ChainKey {
  if (typeof window === "undefined") return DEFAULT_CHAIN;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in CHAINS) return stored as ChainKey;
  return DEFAULT_CHAIN;
}

const ChainContext = createContext<ChainContextValue | null>(null);

export function ChainProvider({ children }: { children: ReactNode }) {
  const [selectedChain, setSelectedChainState] = useState<ChainKey>(DEFAULT_CHAIN);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setSelectedChainState(getInitialChain());
  }, []);

  const setSelectedChain = (chain: ChainKey) => {
    setSelectedChainState(chain);
    localStorage.setItem(STORAGE_KEY, chain);
  };

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
