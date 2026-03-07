import { formatEther } from "viem";

export function formatETH(value: bigint): string {
  const formatted = parseFloat(formatEther(value));
  return `${formatted.toFixed(2)} ETH`;
}

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
