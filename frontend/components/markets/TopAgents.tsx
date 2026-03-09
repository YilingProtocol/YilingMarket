"use client";

import { useState, useEffect } from "react";
import { Bot, Trophy } from "lucide-react";
import { useChain } from "@/lib/chainContext";

interface AgentEntry {
  name: string;
  totalEth: number;
  predictions: number;
}

const RANK_COLORS = [
  "text-primary",
  "text-foreground",
  "text-foreground",
  "text-muted-foreground",
  "text-muted-foreground",
];

export function TopAgents() {
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { chainConfig } = useChain();

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch(`${chainConfig.apiUrl}/api/leaderboard`);
        if (!res.ok) throw new Error("Failed to fetch leaderboard");
        const data = await res.json();

        const rankings: AgentEntry[] = (data.rankings || [])
          .map((r: { agent: string; total_eth?: number; total_mon?: number; predictions?: number }) => ({
            name: r.agent,
            totalEth: r.total_eth ?? r.total_mon ?? 0,
            predictions: r.predictions ?? 0,
          }))
          .sort((a: AgentEntry, b: AgentEntry) => b.totalEth - a.totalEth)
          .slice(0, 5);

        setAgents(rankings);
      } catch {
        // silently fail - panel just stays empty
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30_000);
    return () => clearInterval(interval);
  }, [chainConfig.apiUrl]);

  if (isLoading) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-5 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="size-3.5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Top Agents</h3>
        </div>
        <div className="flex-1 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 px-2 animate-pulse">
              <div className="h-3 w-3 bg-secondary rounded" />
              <div className="size-7 bg-secondary rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-20 bg-secondary rounded" />
                <div className="h-3 w-14 bg-secondary rounded" />
              </div>
              <div className="h-3.5 w-16 bg-secondary rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-5 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="size-3.5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Top Agents</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground/60">No agent data yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="size-3.5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Top Agents</h3>
      </div>

      <div className="flex-1 space-y-0.5">
        {agents.map((agent, i) => (
          <div
            key={agent.name}
            className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-secondary/40 transition-colors"
          >
            <span className={`text-xs font-mono w-4 shrink-0 ${RANK_COLORS[i] || "text-muted-foreground"}`}>
              {i + 1}
            </span>

            <div className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${
              i === 0 ? "bg-primary/15" : "bg-secondary/80"
            }`}>
              <Bot className={`size-3.5 ${i === 0 ? "text-primary" : "text-muted-foreground"}`} />
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground">{agent.name}</span>
              {agent.predictions > 0 && (
                <div className="text-xs text-muted-foreground/50">
                  {agent.predictions} predictions
                </div>
              )}
            </div>

            <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
              {agent.totalEth.toFixed(4)} ETH
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
