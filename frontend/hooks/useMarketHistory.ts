"use client";

import { useState, useEffect } from "react";
import { getQueryStatus, getAgentReputation, fromWad, type QueryStatus } from "@/lib/api";

interface RankingEntry {
  agent: string;
  total_mon?: number;
  total_eth?: number;
}

export function useMarketHistory(marketId: number) {
  const [history, setHistory] = useState<QueryStatus | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const status = await getQueryStatus(String(marketId));
        setHistory(status);

        // Build rankings from agent reputations
        const agentIds = [...new Set(status.reports.map((r) => r.agentId))];
        const reps = await Promise.all(
          agentIds.map(async (id) => {
            try {
              const rep = await getAgentReputation(id);
              const report = status.reports.find((r) => r.agentId === id);
              return {
                agent: report ? `${report.reporter.slice(0, 6)}...${report.reporter.slice(-4)}` : `Agent #${id}`,
                total_mon: Number(rep.score),
              };
            } catch {
              return null;
            }
          })
        );
        setRankings(reps.filter(Boolean) as RankingEntry[]);
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 15_000);
    return () => clearInterval(interval);
  }, [marketId]);

  const getAgentName = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const priceHistory = history
    ? [
        {
          label: "Start",
          value: history.reports.length > 0
            ? fromWad(history.reports[0].priceBefore) * 100
            : fromWad(history.currentPrice) * 100,
        },
        ...history.reports.map((r) => ({
          label: getAgentName(r.reporter).substring(0, 6),
          value: fromWad(r.probability) * 100,
        })),
      ]
    : [];

  const txList = history
    ? history.reports.map((r) => ({
        agent: getAgentName(r.reporter),
        prob: (fromWad(r.probability) * 100).toFixed(1),
        txHash: "",
        confirmTime: "",
      }))
    : [];

  const feed = history
    ? history.reports.map((r, i) => ({
        id: i + 1,
        type: "reasoning" as const,
        agentName: getAgentName(r.reporter),
        probability: fromWad(r.probability),
        reasoning: `Predicted ${(fromWad(r.probability) * 100).toFixed(1)}% (moved from ${(fromWad(r.priceBefore) * 100).toFixed(1)}%)`,
      }))
    : [];

  const agentPredictions: Record<string, number> = {};
  if (history) {
    history.reports.forEach((r) => {
      const name = getAgentName(r.reporter);
      agentPredictions[name] = (agentPredictions[name] || 0) + 1;
    });
  }

  return {
    history,
    isLoading,
    priceHistory,
    txList,
    feed,
    agentPredictions,
    rankings,
    getAgentName,
  };
}
