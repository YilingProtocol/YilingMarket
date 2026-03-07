"use client";

import Link from "next/link";
import type { MarketListItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Wallet } from "lucide-react";

interface MarketCardProps {
  market: MarketListItem;
  index?: number;
}

export function MarketCard({ market, index = 0 }: MarketCardProps) {
  const isLive = market.status === "live";
  const isResolved = market.status === "resolved";

  return (
    <Link href={`/market/${market.id}`}>
      <div
        className={`group relative bg-card border border-border/80 rounded-xl p-5 transition-all duration-300 cursor-pointer
          hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_8px_32px_var(--color-glow-primary)]
          animate-fadeUp`}
        style={{ animationDelay: `${index * 0.06}s` }}
      >
        {/* Subtle top glow for live markets */}
        {isLive && (
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
        )}

        {/* Header: ID + Status */}
        <div className="flex items-center justify-between mb-4">
          <Badge
            variant="secondary"
            className="font-mono text-xs px-2.5 py-1"
          >
            #{String(market.id).padStart(2, "0")}
          </Badge>
          <div className="flex items-center gap-1.5">
            <div
              className={`size-2 rounded-full ${
                isLive
                  ? "bg-accent animate-livePulse"
                  : isResolved
                  ? "bg-muted-foreground/50"
                  : "bg-muted-foreground/30"
              }`}
            />
            <span
              className={`text-xs capitalize font-medium ${
                isLive ? "text-accent" : "text-muted-foreground"
              }`}
            >
              {market.status}
            </span>
          </div>
        </div>

        {/* Question */}
        <h3 className="text-card-foreground text-base font-medium mb-6 leading-relaxed min-h-[3rem] line-clamp-2">
          {market.question}
        </h3>

        {/* Probability */}
        <div className="mb-4">
          <div className="text-4xl font-bold mb-3 tabular-nums text-primary">
            {market.probability.toFixed(0)}
            <span className="text-2xl text-primary/60">%</span>
          </div>
          <Progress
            value={market.probability}
            className="h-1.5 bg-secondary"
            indicatorClassName="bg-primary transition-all duration-500"
          />
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border/60">
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            <span className="tabular-nums">{market.predictionCount}</span>
            <span className="hidden sm:inline">predictions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wallet className="size-3.5" />
            <span className="font-mono tabular-nums">{market.totalPool}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
