"use client";

import { MarketCard } from "./MarketCard";
import type { MarketListItem } from "@/lib/types";
import { BarChart3 } from "lucide-react";

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="bg-card border border-border rounded-xl p-5 animate-pulse"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* Header row */}
      <div className="flex justify-between mb-4">
        <div className="h-6 w-12 bg-secondary rounded-md" />
        <div className="flex items-center gap-1.5">
          <div className="size-2 bg-secondary rounded-full" />
          <div className="h-4 w-10 bg-secondary rounded-md" />
        </div>
      </div>
      {/* Question lines */}
      <div className="space-y-2 mb-6">
        <div className="h-4 w-full bg-secondary rounded-md" />
        <div className="h-4 w-3/4 bg-secondary rounded-md" />
      </div>
      {/* Probability */}
      <div className="mb-4">
        <div className="h-10 w-20 bg-secondary rounded-md mb-3" />
        <div className="h-1.5 w-full bg-secondary rounded-full" />
      </div>
      {/* Footer */}
      <div className="flex justify-between pt-4 border-t border-border/60">
        <div className="h-4 w-24 bg-secondary rounded-md" />
        <div className="h-4 w-20 bg-secondary rounded-md" />
      </div>
    </div>
  );
}

interface MarketGridProps {
  markets: MarketListItem[];
  isLoading: boolean;
}

export function MarketGrid({ markets, isLoading }: MarketGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} index={i} />
        ))}
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fadeUp">
        <div className="size-16 rounded-2xl bg-secondary flex items-center justify-center mb-5">
          <BarChart3 className="size-7 text-muted-foreground" />
        </div>
        <div className="text-foreground text-lg font-semibold mb-1.5">
          No markets found
        </div>
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          Create the first prediction market to get started, or switch filters to see other markets.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {markets.map((market, i) => (
        <MarketCard key={market.id} market={market} index={i} />
      ))}
    </div>
  );
}
