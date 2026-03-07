"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { MarketListItem } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Hidden test markets (spam/test questions)
const HIDDEN_MARKET_IDS = new Set([4, 6, 7, 9]);

export function useMarketList() {
  const [markets, setMarkets] = useState<MarketListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const marketsRef = useRef<MarketListItem[]>([]);

  const fetchMarkets = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/markets`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();

      const items: MarketListItem[] = data.map((m: {
        market_id: number;
        question: string;
        current_price: number;
        resolved: boolean;
        is_active: boolean;
        prediction_count: number;
        total_pool: number;
        creator: string;
      }) => ({
        id: m.market_id,
        question: m.question,
        probability: Math.round(m.current_price * 100),
        status: m.resolved ? "resolved" as const : m.is_active ? "live" as const : "standby" as const,
        predictionCount: m.prediction_count,
        totalPool: `${m.total_pool.toFixed(4)} ETH`,
        creator: m.creator || "",
      }));

      const filtered = items.filter((m: MarketListItem) => !HIDDEN_MARKET_IDS.has(m.id));
      marketsRef.current = filtered;
      setMarkets(filtered);
      setError(null);
    } catch (err) {
      // On error, keep showing last known data
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
