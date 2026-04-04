"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { MarketListItem } from "@/lib/types";
import { getActiveQueries, getResolvedQueries, wadToPercent, wadToUsdc, APP_SOURCE } from "@/lib/api";

export function useMarketList() {
  const [markets, setMarkets] = useState<MarketListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const marketsRef = useRef<MarketListItem[]>([]);

  const fetchMarkets = useCallback(async () => {
    try {
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

      marketsRef.current = [...liveItems, ...resolvedItems].reverse();
      setMarkets(marketsRef.current);
      setError(null);
    } catch (err) {
      if (marketsRef.current.length === 0) {
        setError(err as Error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 15_000);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  return {
    markets,
    isLoading: isLoading && marketsRef.current.length === 0,
    error,
    refetch: fetchMarkets,
  };
}
