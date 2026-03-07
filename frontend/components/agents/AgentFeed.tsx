"use client";

import { useEffect, useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface FeedEntry {
  id: number;
  type: "reasoning" | "system" | "payout" | "error";
  agentName?: string;
  reasoning?: string;
  probability?: number;
  confidence?: number;
  message?: string;
  amount?: number;
  color?: string;
}

const AGENT_COLORS: Record<string, string> = {
  analyst: "#00d4b4",
  contrarian: "#ff6040",
  bayesian: "#a855f7",
  sentiment: "#3b82f6",
  historian: "#f59e0b",
  futurist: "#ec4899",
  skeptic: "#ef4444",
  gametheorist: "#8b5cf6",
  economist: "#10b981",
  riskanalyst: "#f97316",
  optimist: "#22d3ee",
  pessimist: "#dc2626",
  philosopher: "#a78bfa",
  statistician: "#6366f1",
  crowdsynth: "#14b8a6",
};

function getAgentColor(name?: string): string {
  if (!name) return "#3b82f6";
  const key = name.toLowerCase().replace(/\s+/g, "");
  return AGENT_COLORS[key] || "#3b82f6";
}

export function AgentFeed({ feed }: { feed: FeedEntry[] }) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [feed]);

  return (
    <div ref={feedRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-3 md:py-4 space-y-2.5">
      {feed.map((entry, i) => {
        if (entry.type === "reasoning") {
          const color = getAgentColor(entry.agentName);
          return (
            <div
              key={entry.id}
              className="border-l-[3px] pl-3.5 py-2.5 space-y-1.5 hover:bg-secondary/50 transition-colors rounded-r-lg animate-fadeSlide"
              style={{
                borderColor: color,
                animationDelay: `${i * 0.03}s`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm" style={{ color }}>
                  {entry.agentName}
                </span>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {((entry.probability || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {entry.reasoning || ""}
              </p>
              {entry.confidence ? (
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-1 rounded-full"
                    style={{
                      width: `${(entry.confidence * 100)}%`,
                      maxWidth: "80px",
                      backgroundColor: color,
                      opacity: 0.5,
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {(entry.confidence * 100).toFixed(0)}% conf
                  </span>
                </div>
              ) : null}
            </div>
          );
        }

        if (entry.type === "payout") {
          const isPositive = (entry.amount || 0) >= 0;
          return (
            <div
              key={entry.id}
              className="border-l-[3px] pl-3.5 py-2.5 hover:bg-secondary/50 transition-colors rounded-r-lg flex items-center gap-2 animate-fadeSlide"
              style={{
                borderColor: isPositive ? "var(--accent)" : "var(--destructive)",
              }}
            >
              {isPositive ? (
                <TrendingUp className="size-3.5 text-accent shrink-0" />
              ) : (
                <TrendingDown className="size-3.5 text-destructive shrink-0" />
              )}
              <p className="text-sm font-mono tabular-nums">
                {entry.message}
              </p>
            </div>
          );
        }

        if (entry.type === "error") {
          return (
            <div
              key={entry.id}
              className="border-l-[3px] border-destructive pl-3.5 py-2.5 hover:bg-secondary/50 transition-colors rounded-r-lg animate-fadeSlide"
            >
              <p className="text-sm text-destructive">{entry.message}</p>
            </div>
          );
        }

        // system
        return (
          <div
            key={entry.id}
            className="border-l-[3px] border-border pl-3.5 py-2.5 hover:bg-secondary/50 transition-colors rounded-r-lg animate-fadeSlide"
          >
            <p className="text-xs text-muted-foreground">{entry.message}</p>
          </div>
        );
      })}
    </div>
  );
}
