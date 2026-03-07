"use client";

import { useState, useEffect } from "react";

interface Prediction {
  index: number;
  predictor: string;
  probability: number;
  price_before: number;
  price_after: number;
  bond: number;
  timestamp: number;
}

interface MarketHistory {
  question: string;
  resolved: boolean;
  current_price: number;
  prediction_count: number;
  total_pool: number;
  predictions: Prediction[];
  params?: {
    bond_amount: number;
  };
}

interface AgentNames {
  [address: string]: string;
}

interface RankingEntry {
  agent: string;
  total_mon?: number;
  total_eth?: number;
}

export function useMarketHistory(marketId: number) {
  const [history, setHistory] = useState<MarketHistory | null>(null);
  const [agentNames, setAgentNames] = useState<AgentNames>({});
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    Promise.all([
      fetch(`${API}/api/markets/${marketId}`).then((r) => r.ok ? r.json() : null),
      fetch(`${API}/api/agent-names`).then((r) => r.ok ? r.json() : {}) as Promise<AgentNames>,
      fetch(`${API}/api/markets/${marketId}/leaderboard`).then((r) => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([marketData, names, leaderboardData]) => {
        if (marketData) setHistory(marketData);
        setAgentNames(names);

        // Use bulk leaderboard endpoint (single call instead of N)
        if (leaderboardData?.rankings?.length > 0) {
          setRankings(leaderboardData.rankings);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [marketId]);

  const getAgentName = (address: string): string => {
    return agentNames[address.toLowerCase()] || `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Build price history from predictions
  const priceHistory = history
    ? [
        { label: "Start", value: (history.predictions[0]?.price_before ?? history.current_price) * 100 },
        ...history.predictions.map((p) => ({
          label: getAgentName(p.predictor).substring(0, 3).toUpperCase(),
          value: p.probability * 100,
        })),
      ]
    : [];

  // Build tx list from predictions
  const txList = history
    ? history.predictions.map((p) => ({
        agent: getAgentName(p.predictor),
        prob: (p.probability * 100).toFixed(1),
        txHash: "",
        confirmTime: "",
      }))
    : [];

  // Build feed entries from predictions
  const feed = history
    ? history.predictions.map((p, i) => ({
        id: i + 1,
        type: "reasoning" as const,
        agentName: getAgentName(p.predictor),
        probability: p.probability,
        reasoning: `Predicted ${(p.probability * 100).toFixed(1)}% (moved from ${(p.price_before * 100).toFixed(1)}%)`,
      }))
    : [];

  // Build agent predictions count
  const agentPredictions: Record<string, number> = {};
  if (history) {
    history.predictions.forEach((p) => {
      const name = getAgentName(p.predictor);
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
