"use client";

import { useMemo } from "react";
import { fromWad } from "@/lib/api";
import { useMarketStatus } from "./useMarketDetail";

interface RankingEntry {
  agent: string;
  total_mon?: number;
  total_eth?: number;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function useMarketHistory(marketId: number) {
  const { data: history, isLoading } = useMarketStatus(marketId);

  const derived = useMemo(() => {
    if (!history) {
      return {
        priceHistory: [] as { label: string; value: number }[],
        txList: [] as { agent: string; prob: string; txHash: string; confirmTime: string }[],
        feed: [] as {
          id: number;
          type: "reasoning";
          agentName: string;
          probability: number;
          reasoning: string;
        }[],
        agentPredictions: {} as Record<string, number>,
        rankings: [] as RankingEntry[],
      };
    }

    const reports = history.reports ?? [];

    const priceHistory = [
      {
        label: "Start",
        value:
          reports.length > 0
            ? fromWad(reports[0].priceBefore) * 100
            : fromWad(history.currentPrice) * 100,
      },
      ...reports.map((r) => ({
        label: shortAddress(r.reporter).substring(0, 6),
        value: fromWad(r.probability) * 100,
      })),
    ];

    const txList = reports.map((r) => ({
      agent: shortAddress(r.reporter),
      prob: (fromWad(r.probability) * 100).toFixed(1),
      txHash: "",
      confirmTime: "",
    }));

    const feed = reports.map((r, i) => ({
      id: i + 1,
      type: "reasoning" as const,
      agentName: shortAddress(r.reporter),
      probability: fromWad(r.probability),
      reasoning: `Predicted ${(fromWad(r.probability) * 100).toFixed(1)}% (moved from ${(fromWad(r.priceBefore) * 100).toFixed(1)}%)`,
    }));

    const agentPredictions: Record<string, number> = {};
    reports.forEach((r) => {
      const name = shortAddress(r.reporter);
      agentPredictions[name] = (agentPredictions[name] || 0) + 1;
    });

    // Rankings: for now, count-based. Once reputation API is wired in,
    // swap `total_mon: 0` for the real score.
    const rankings: RankingEntry[] = Object.entries(agentPredictions)
      .map(([agent]) => ({ agent, total_mon: 0 }))
      .sort((a, b) => (b.total_mon ?? 0) - (a.total_mon ?? 0));

    return { priceHistory, txList, feed, agentPredictions, rankings };
  }, [history]);

  return {
    history: history ?? null,
    isLoading,
    ...derived,
    getAgentName: shortAddress,
  };
}
