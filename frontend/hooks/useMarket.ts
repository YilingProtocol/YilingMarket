"use client";

import type { WSMessage } from "@/lib/types";

/**
 * Market state hook — returns empty defaults.
 * Data now comes from useMarketDetail and useMarketHistory via Protocol API.
 * This hook provides fallback values so the page doesn't crash.
 */

export function useMarket(lastMessage: WSMessage | null, filterMarketId?: number) {
  return {
    question: "Connecting to protocol...",
    probability: 50,
    currentProb: 50,
    totalPredictions: 0,
    currentRound: 0,
    totalRounds: 0,
    isResolved: false,
    totalPool: "0",
    status: "live" as const,
    feed: [] as any[],
    txList: [] as any[],
    priceHistory: [] as any[],
    rankings: [] as any[],
    diceRoll: null,
    payouts: [] as any[],
    agentPredictions: {} as Record<string, number>,
    round: 0,
    agentCount: 0,
    protocolState: "Awaiting arcane invocation...",
    diceState: "idle",
    diceText: "Awaiting...",
    gasPrice: "",
    params: null as any,
    source: "",
    category: "",
    maxRounds: 0,
    activeAgent: "",
  };
}
