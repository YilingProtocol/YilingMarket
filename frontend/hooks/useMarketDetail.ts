"use client";

import { useState, useEffect } from "react";
import { getQueryStatus, type QueryStatus } from "@/lib/api";

export function useMarketDetail(marketId: number) {
  const [data, setData] = useState<QueryStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const status = await getQueryStatus(String(marketId));
        setData(status);
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetail();
    const interval = setInterval(fetchDetail, 30_000);
    return () => clearInterval(interval);
  }, [marketId]);

  // Map to the tuple format that market/[id]/page.tsx expects
  let marketInfo: [string, bigint, string, boolean, bigint, bigint] | undefined;
  let params: [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;

  try {
    if (data?.question && data?.currentPrice) {
      marketInfo = [
        data.question,
        BigInt(data.currentPrice),
        data.creator,
        data.resolved,
        BigInt(data.totalPool),
        BigInt(data.reportCount),
      ];
    }
    if (data?.params?.alpha) {
      params = [
        BigInt(data.params.alpha),
        BigInt(data.params.k),
        BigInt(data.params.flatReward),
        BigInt(data.params.bondAmount),
        BigInt(data.params.liquidityParam),
        BigInt(data.params.createdAt),
      ];
    }
  } catch {
    // API returned bad data, keep undefined
  }

  return {
    marketInfo,
    params,
    isActive: data ? !data.resolved : undefined,
    isLoading,
  };
}
