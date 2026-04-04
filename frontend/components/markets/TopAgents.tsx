"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, Trophy } from "lucide-react";
import { getActiveQueries, getQueryStatus, fromWad } from "@/lib/api";

interface AgentEntry {
  name: string;
  address: string;
  predictions: number;
}

export function TopAgents() {
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const agentsRef = useRef<AgentEntry[]>([]);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const queries = await getActiveQueries();
        // Aggregate reporters across all queries
        const agentMap = new Map<string, { predictions: number }>();

        // Fetch details for queries with reports
        const withReports = queries.filter((q) => Number(q.reportCount) > 0);
        const statuses = await Promise.all(
          withReports.slice(0, 5).map((q) => getQueryStatus(q.queryId).catch(() => null))
        );

        statuses.forEach((status) => {
          if (!status) return;
          status.reports.forEach((r) => {
            const addr = r.reporter.toLowerCase();
            const existing = agentMap.get(addr) || { predictions: 0 };
            existing.predictions += 1;
            agentMap.set(addr, existing);
          });
        });

        const sorted = [...agentMap.entries()]
          .map(([addr, data]) => ({
            name: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
            address: addr,
            predictions: data.predictions,
          }))
          .sort((a, b) => b.predictions - a.predictions)
          .slice(0, 5);

        agentsRef.current = sorted;
        setAgents(sorted);
      } catch {
        // Stale-while-error: keep showing last successful agent data
      } finally {
        setIsLoading(false);
      }
    }

    fetchAgents();
    const interval = setInterval(fetchAgents, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-5 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="size-3.5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Top Agents</h3>
        </div>
        <div className="flex-1 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 px-2 animate-pulse">
              <div className="h-3 w-3 bg-secondary rounded" />
              <div className="size-7 bg-secondary rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-20 bg-secondary rounded" />
              </div>
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

  const RANK_COLORS = ["text-primary", "text-foreground", "text-foreground", "text-muted-foreground", "text-muted-foreground"];

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="size-3.5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Top Agents</h3>
      </div>
      <div className="flex-1 space-y-0.5">
        {agents.map((agent, i) => (
          <div key={agent.address} className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-secondary/40 transition-colors">
            <span className={`text-xs font-mono w-4 shrink-0 ${RANK_COLORS[i] || "text-muted-foreground"}`}>
              {i + 1}
            </span>
            <div className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${i === 0 ? "bg-primary/15" : "bg-secondary/80"}`}>
              <Bot className={`size-3.5 ${i === 0 ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground font-mono">{agent.name}</span>
              <div className="text-xs text-muted-foreground/50">
                {agent.predictions} predictions
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
