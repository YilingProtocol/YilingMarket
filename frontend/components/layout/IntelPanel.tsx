"use client";

import { Leaderboard } from "./Leaderboard";
import { DiceRoll } from "./DiceRoll";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useChain } from "@/lib/chainContext";
import { ExternalLink, ArrowRightLeft } from "lucide-react";

interface TxEntry {
  agent: string;
  prob: string;
  txHash: string;
  confirmTime: string;
}

interface LeaderboardEntry {
  agent: string;
  total_mon?: number;
  total_eth?: number;
}

interface IntelPanelProps {
  rankings: LeaderboardEntry[];
  round: number;
  maxRounds: number;
  agentPredictions: Record<string, number>;
  diceState: "idle" | "rolling" | "continues" | "resolved";
  diceText: string;
  txList: TxEntry[];
  params: {
    alpha: string;
    b: string;
    k: string;
    r: string;
    bond: string;
    fee: string;
  };
}

export function IntelPanel({
  rankings,
  round,
  maxRounds,
  agentPredictions,
  diceState,
  diceText,
  txList,
  params,
}: IntelPanelProps) {
  const { chainConfig } = useChain();
  const agents = Object.keys(agentPredictions);
  const maxPred = Math.max(1, ...Object.values(agentPredictions));

  return (
    <div className="bg-card border border-border rounded-xl h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 md:px-6 py-3.5 md:py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Intelligence</h3>
        <Badge variant="secondary" className="text-xs px-3 py-1">
          Leaderboard
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 md:space-y-6">
        {/* Rankings */}
        <Leaderboard rankings={rankings} />

        {/* Protocol Parameters */}
        <div className="space-y-3 pt-5 border-t border-border/50">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Protocol Parameters
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Alpha", value: params.alpha },
              { label: "Liquidity", value: params.b },
              { label: "Last-K", value: params.k },
              { label: "Reward", value: params.r },
              { label: "Bond", value: params.bond },
              { label: "Fee", value: params.fee },
            ].map((p) => (
              <div
                key={p.label}
                className="bg-secondary/50 rounded-lg p-2.5 text-center border border-border/40"
              >
                <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">
                  {p.label}
                </div>
                <div className="text-sm font-semibold text-foreground font-mono tabular-nums">
                  {p.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress */}
        {agents.length > 0 && (
          <div className="space-y-3 pt-5 border-t border-border/50">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Progress
              </h4>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {round}/{maxRounds}
              </span>
            </div>
            <div className="space-y-2.5">
              {agents.map((name) => {
                const pct = Math.round((agentPredictions[name] / maxPred) * 100);
                return (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">
                        {name.length > 10 ? name.substring(0, 8) + "..." : name}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {agentPredictions[name]}<span className="opacity-50"> / {maxPred}</span>
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      className="h-1.5 bg-secondary"
                      indicatorClassName="bg-primary transition-all duration-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dice Roll */}
        <div className="pt-5 border-t border-border/50">
          <DiceRoll state={diceState} text={diceText} />
        </div>

        {/* Transactions */}
        <div className="space-y-3 pt-5 border-t border-border/50">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Transactions
          </h4>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {txList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
                <ArrowRightLeft className="size-5 opacity-40" />
                <span className="text-xs">No transactions yet</span>
              </div>
            ) : (
              txList.map((tx, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-secondary/40 rounded-lg border border-border/40 hover:border-primary/30 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-foreground font-medium truncate">
                      {tx.agent}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0">
                      {tx.prob}%
                    </span>
                  </div>
                  {tx.txHash && (
                    <a
                      href={`${chainConfig.explorerUrl}/tx/0x${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-mono text-primary hover:underline shrink-0 cursor-pointer"
                    >
                      {tx.txHash.substring(0, 8)}...
                      <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
