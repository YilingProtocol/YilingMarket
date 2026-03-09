"use client";

import { useReadContract } from "wagmi";
import { CONTRACT_ABI } from "@/lib/contracts";
import { useChain } from "@/lib/chainContext";

export function useMarketDetail(marketId: number) {
  const { chainConfig } = useChain();

  const {
    data: marketInfo,
    isLoading: isInfoLoading,
  } = useReadContract({
    address: chainConfig.contractAddress,
    abi: CONTRACT_ABI,
    functionName: "getMarketInfo",
    args: [BigInt(marketId)],
    chainId: chainConfig.chainId,
    query: { refetchInterval: 30_000 },
  });

  const {
    data: params,
    isLoading: isParamsLoading,
  } = useReadContract({
    address: chainConfig.contractAddress,
    abi: CONTRACT_ABI,
    functionName: "getMarketParams",
    args: [BigInt(marketId)],
    chainId: chainConfig.chainId,
    query: { refetchInterval: 30_000 },
  });

  const {
    data: isActive,
    isLoading: isActiveLoading,
  } = useReadContract({
    address: chainConfig.contractAddress,
    abi: CONTRACT_ABI,
    functionName: "isMarketActive",
    args: [BigInt(marketId)],
    chainId: chainConfig.chainId,
    query: { refetchInterval: 30_000 },
  });

  return {
    marketInfo: marketInfo as
      | [string, bigint, string, boolean, bigint, bigint]
      | undefined,
    params: params as
      | [bigint, bigint, bigint, bigint, bigint, bigint]
      | undefined,
    isActive: isActive as boolean | undefined,
    isLoading: isInfoLoading || isParamsLoading || isActiveLoading,
  };
}
