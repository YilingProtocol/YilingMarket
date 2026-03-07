"use client";

import { AgentFeed } from "./AgentFeed";
import { Bot } from "lucide-react";

const AGENT_COLORS: Record<string, string> = {
  Analyst: "#00d4b4",
  Bayesian: "#a855f7",
  Economist: "#10b981",
  Statistician: "#6366f1",
  CrowdSynth: "#14b8a6",
};

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

interface AgentPanelProps {
  round: number;
  maxRounds: number;
  activeAgent: string;
  agentCount: number;
  protocolState: string;
  feed: FeedEntry[];
}

export function AgentPanel({
  round,
  maxRounds,
  activeAgent,
  agentCount,
  protocolState,
  feed,
}: AgentPanelProps) {
  const agentEntries = Object.entries(AGENT_COLORS);
  const agentTotal = agentEntries.length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 md:px-6 py-3.5 md:py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Agent Logic</h2>
        <span className="text-sm text-muted-foreground font-mono tabular-nums">
          Round {round}/{maxRounds}
        </span>
      </div>

      {/* Agent Constellation */}
      <div className="px-5 md:px-6 py-5 md:py-6 border-b border-border">
        <div className="flex flex-col items-center space-y-4">
          {/* Circular Visualization */}
          <div className="relative size-36">
            {/* Center Circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-16 rounded-full bg-primary/10 border-2 border-primary/40 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">Oracle</span>
              </div>
            </div>

            {/* Agent Dots */}
            {agentEntries.map(([agent, color], index) => {
              const angle = (index / agentTotal) * 2 * Math.PI - Math.PI / 2;
              const radius = 58;
              const cx = 72;
              const cy = 72;
              const x = cx + radius * Math.cos(angle);
              const y = cy + radius * Math.sin(angle);
              const isActive = activeAgent.toLowerCase().includes(agent.toLowerCase());

              return (
                <div
                  key={agent}
                  className="absolute flex items-center justify-center transition-transform duration-200 hover:scale-125"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                  title={agent}
                >
                  <div
                    className={`size-3.5 rounded-full ${isActive ? "animate-livePulse" : ""}`}
                    style={{
                      backgroundColor: color,
                      boxShadow: isActive
                        ? `0 0 12px ${color}90, 0 0 4px ${color}60`
                        : `0 0 6px ${color}40`,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Labels */}
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground tabular-nums">
              {agentCount} Agent{agentCount !== 1 ? "s" : ""}
            </p>
            <p className="text-base font-semibold text-foreground tracking-tight">
              Yiling Protocol
            </p>
            <p className="text-xs text-muted-foreground">
              Oracle-Free Prediction Market
            </p>
            {activeAgent && activeAgent !== "" && (
              <p className="text-xs text-primary font-medium mt-1.5">
                {activeAgent}
              </p>
            )}
            <p className="text-xs italic text-muted-foreground/60 mt-2 max-w-[240px] mx-auto line-clamp-2">
              {protocolState}
            </p>
          </div>
        </div>
      </div>

      {/* Agent Feed */}
      {feed.length > 0 ? (
        <AgentFeed feed={feed} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
          <Bot className="size-6 opacity-40" />
          <span className="text-xs">Waiting for agents...</span>
        </div>
      )}
    </div>
  );
}
