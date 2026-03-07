"use client";

import { PriceChart } from "./PriceChart";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface MarketPanelProps {
  marketId: number | null;
  question: string;
  status: string;
  source: string;
  category: string;
  currentProb: number;
  priceHistory: { label: string; value: number }[];
}

export function MarketPanel({
  marketId,
  question,
  status,
  source,
  currentProb,
  priceHistory,
}: MarketPanelProps) {
  const isLive = status === "live";
  const isResolved = status === "resolved";

  return (
    <div className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-5 md:space-y-6 flex flex-col">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {marketId !== null && (
            <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1 tabular-nums">
              Market #{marketId}
            </Badge>
          )}
          <Badge
            variant="secondary"
            className={`text-xs px-2.5 py-1 flex items-center gap-1.5 ${
              isLive
                ? "text-accent"
                : isResolved
                ? "text-destructive"
                : ""
            }`}
          >
            <div
              className={`size-2 rounded-full ${
                isLive
                  ? "bg-accent animate-livePulse"
                  : isResolved
                  ? "bg-destructive"
                  : "bg-muted-foreground/50"
              }`}
            />
            <span className="font-medium">
              {isLive ? "Live" : isResolved ? "Resolved" : "Standby"}
            </span>
          </Badge>
        </div>
        {source && (
          <Badge variant="outline" className="text-xs px-2.5 py-1">
            {source}
          </Badge>
        )}
      </div>

      {/* Question */}
      <h2 className="text-lg md:text-xl font-semibold leading-relaxed text-card-foreground">
        {question}
      </h2>

      {/* Probability Display */}
      <div className="space-y-4">
        <div className="text-center py-2">
          <div className="text-5xl md:text-6xl font-bold text-foreground mb-1 tabular-nums">
            {currentProb.toFixed(1)}
            <span className="text-3xl md:text-4xl text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground">Current Probability</p>
        </div>

        {/* YES/NO Bar */}
        <div className="space-y-2.5">
          <Progress
            value={currentProb}
            className="h-2.5 bg-secondary"
            indicatorClassName="bg-primary transition-all duration-500"
          />
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-accent" />
              <span className="text-accent font-medium tabular-nums">
                YES {currentProb.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-destructive font-medium tabular-nums">
                NO {(100 - currentProb).toFixed(0)}%
              </span>
              <div className="size-2 rounded-full bg-destructive" />
            </div>
          </div>
        </div>
      </div>

      {/* Price History Chart */}
      <div className="space-y-3 flex-1 min-h-0">
        <h3 className="text-sm font-medium text-muted-foreground">Price History</h3>
        <div className="min-h-[200px] md:min-h-[250px]">
          <PriceChart data={priceHistory} />
        </div>
      </div>
    </div>
  );
}
