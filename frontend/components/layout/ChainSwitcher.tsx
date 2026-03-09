"use client";

import { useChain } from "@/lib/chainContext";
import { CHAINS, type ChainKey } from "@/lib/contracts";
import { useSwitchChain, useChainId } from "wagmi";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const chainEntries = Object.values(CHAINS);

export function ChainSwitcher() {
  const { selectedChain, setSelectedChain, chainConfig } = useChain();
  const { switchChain } = useSwitchChain();
  const walletChainId = useChainId();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (key: ChainKey) => {
    setSelectedChain(key);
    const target = CHAINS[key];
    if (walletChainId !== target.chainId) {
      switchChain({ chainId: target.chainId });
    }
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors text-sm font-medium cursor-pointer"
      >
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: chainConfig.color }}
        />
        <span className="hidden sm:inline">{chainConfig.name}</span>
        <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden animate-fadeIn">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Select Network</p>
          </div>
          {chainEntries.map((chain) => (
            <button
              key={chain.key}
              onClick={() => handleSelect(chain.key)}
              className={`w-full flex items-center gap-3 px-3 py-3 text-sm transition-colors cursor-pointer ${
                selectedChain === chain.key
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: chain.color }}
              />
              <div className="flex flex-col items-start">
                <span className="font-medium">{chain.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {chain.nativeCurrency.symbol} · {chain.testnet ? "Testnet" : "Mainnet"}
                </span>
              </div>
              {selectedChain === chain.key && (
                <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/20" style={{ color: chain.color }}>
                  Active
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
