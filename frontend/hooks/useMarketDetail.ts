"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryStatus, type QueryStatus } from "@/lib/api";

export function marketQueryKey(marketId: number) {
  return ["market", marketId] as const;
}

export function useMarketStatus(marketId: number) {
  return useQuery<QueryStatus>({
    queryKey: marketQueryKey(marketId),
    queryFn: () => getQueryStatus(String(marketId)),
    refetchInterval: 15_000,
    enabled: Number.isFinite(marketId) && marketId >= 0,
  });
}

export function useMarketDetail(marketId: number) {
  const { data, isLoading } = useMarketStatus(marketId);

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
