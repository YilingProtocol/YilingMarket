import { formatEther } from "viem";

export function formatProbability(weiPrice: bigint): number {
  return parseFloat(formatEther(weiPrice)) * 100;
}

export function getMarketStatus(
  resolved: boolean,
  isActive: boolean
): "live" | "resolved" | "standby" {
  if (resolved) return "resolved";
  if (isActive) return "live";
  return "standby";
}
