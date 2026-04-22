"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketListItem } from "@/lib/types";
import {
  APP_SOURCE,
  getActiveQueries,
  getResolvedQueries,
  wadToPercent,
  wadToUsdc,
} from "@/lib/api";

async function fetchMarketList(): Promise<MarketListItem[]> {
  const [activeQueries, resolvedQueries] = await Promise.all([
    getActiveQueries(APP_SOURCE),
    getResolvedQueries(APP_SOURCE),
  ]);

  const liveItems: MarketListItem[] = activeQueries.map((q) => ({
    id: Number(q.queryId),
    question: q.question,
    probability: wadToPercent(q.currentPrice),
    status: "live" as const,
    predictionCount: Number(q.reportCount),
    totalPool: `${wadToUsdc(q.totalPool)} USDC`,
    creator: q.creator,
  }));

  const resolvedItems: MarketListItem[] = resolvedQueries.map((q) => ({
    id: Number(q.queryId),
    question: q.question,
    probability: wadToPercent(q.currentPrice),
    status: "resolved" as const,
    predictionCount: Number(q.reportCount),
    totalPool: `${wadToUsdc(q.totalPool)} USDC`,
    creator: q.creator,
  }));

  return [...liveItems, ...resolvedItems].reverse();
}

export function useMarketList() {
  const { data, isLoading, error, refetch } = useQuery<MarketListItem[]>({
    queryKey: ["markets", APP_SOURCE],
    queryFn: fetchMarketList,
    refetchInterval: 15_000,
  });

  return {
    markets: data ?? [],
    isLoading: isLoading && !data,
    error: error as Error | null,
    refetch,
  };
}
