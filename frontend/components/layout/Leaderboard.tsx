"use client";

import { Trophy } from "lucide-react";
import { useChain } from "@/lib/chainContext";

interface LeaderboardEntry {
  agent: string;
  total_mon?: number;
  total_eth?: number;
}

const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const RANK_LABELS = ["1st", "2nd", "3rd"];

export function Leaderboard({ rankings }: { rankings: LeaderboardEntry[] }) {
  const { chainConfig } = useChain();
  if (rankings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
        <Trophy className="size-5 opacity-40" />
        <span className="text-xs">No rankings yet</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rankings.map((r, i) => {
        const isTop3 = i < 3;
        const rankColor = RANK_COLORS[i] || "var(--muted-foreground)";

        return (
          <div
            key={r.agent}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              isTop3
                ? "bg-secondary/60 border-border/60"
                : "bg-background/50 border-border/40"
            }`}
          >
            {/* Rank */}
            <div
              className="text-sm font-bold w-8 text-center tabular-nums"
              style={{ color: rankColor }}
            >
              {isTop3 ? RANK_LABELS[i] : `${i + 1}th`}
            </div>

            {/* Agent name */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {r.agent}
              </div>
            </div>

            {/* P&L */}
            <div
              className={`font-mono text-sm font-semibold tabular-nums shrink-0 ${
                (r.total_eth ?? r.total_mon ?? 0) >= 0 ? "text-accent" : "text-destructive"
              }`}
            >
              {(r.total_eth ?? r.total_mon ?? 0) >= 0 ? "+" : ""}
              {(r.total_eth ?? r.total_mon ?? 0).toFixed(4)} USDC
            </div>
          </div>
        );
      })}
    </div>
  );
}
