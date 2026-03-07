"use client";

import { useEffect, useReducer, useCallback, useRef } from "react";
import type {
  WSMessage,
  MarketData,
  AgentReasoning,
  PredictionData,
  DiceRollData,
  LeaderboardEntry,
  PayoutData,
  MarketResolvedData,
} from "@/lib/types";

interface TxEntry {
  agent: string;
  prob: string;
  txHash: string;
  confirmTime: string;
}

interface FeedEntry {
  id: number;
  type: "reasoning" | "system" | "payout" | "error";
  agentName?: string;
  reasoning?: string;
  probability?: number;
  confidence?: number;
  message?: string;
  amount?: number;
  color?: string;
}

interface MarketState {
  marketId: number | null;
  question: string;
  status: "standby" | "live" | "resolved";
  source: string;
  category: string;
  currentProb: number;
  priceHistory: { label: string; value: number }[];
  round: number;
  maxRounds: number;
  activeAgent: string;
  agentPredictions: Record<string, number>;
  rankings: LeaderboardEntry[];
  agentCount: number;
  feed: FeedEntry[];
  txList: TxEntry[];
  gasPrice: string;
  protocolState: string;
  diceState: "idle" | "rolling" | "continues" | "resolved";
  diceText: string;
  params: {
    alpha: string;
    b: string;
    k: string;
    r: string;
    bond: string;
    fee: string;
  };
}

type Action =
  | { type: "MARKET_CREATED"; data: MarketData }
  | { type: "ROUND_UPDATE"; data: { round: number; max_rounds: number } }
  | { type: "AGENT_THINKING"; data: { agent_name: string } }
  | { type: "AGENT_REASONING"; data: AgentReasoning }
  | { type: "PREDICTION_SUBMITTED"; data: PredictionData }
  | { type: "DICE_ROLL"; data: DiceRollData }
  | { type: "MARKET_RESOLVED"; data: MarketResolvedData }
  | { type: "PAYOUT_UPDATE"; data: PayoutData }
  | { type: "LEADERBOARD"; data: { rankings: LeaderboardEntry[] } }
  | { type: "GAS_UPDATE"; data: Record<string, unknown> }
  | { type: "SYSTEM"; data: { message: string } }
  | { type: "ERROR"; data: { agent?: string; message?: string } }
  | { type: "DICE_ANIMATION_DONE"; continues: boolean };

let feedIdCounter = 0;

const initialState: MarketState = {
  marketId: null,
  question: "Connecting to agent system...",
  status: "standby",
  source: "",
  category: "",
  currentProb: 50,
  priceHistory: [],
  round: 0,
  maxRounds: 30,
  activeAgent: "",
  agentPredictions: {},
  rankings: [],
  agentCount: 0,
  feed: [],
  txList: [],
  gasPrice: "--",
  protocolState: "Awaiting arcane invocation...",
  diceState: "idle",
  diceText: "Awaiting...",
  params: { alpha: "10%", b: "0.003 ETH", k: "2", r: "0.001", bond: "0.001 ETH", fee: "2%" },
};

function reducer(state: MarketState, action: Action): MarketState {
  switch (action.type) {
    case "MARKET_CREATED": {
      const d = action.data;
      const prob = d.initial_price * 100;
      return {
        ...initialState,
        marketId: d.market_id,
        question: d.question,
        status: "live",
        source: d.source || "ai",
        category: d.category || "",
        currentProb: prob,
        priceHistory: [{ label: "Start", value: prob }],
        protocolState: "Market active — agents engaging...",
        gasPrice: state.gasPrice,
        rankings: state.rankings,
        agentCount: state.agentCount,
      };
    }
    case "ROUND_UPDATE":
      return {
        ...state,
        round: action.data.round,
        maxRounds: action.data.max_rounds || 30,
      };
    case "AGENT_THINKING":
      return {
        ...state,
        activeAgent: action.data.agent_name,
        protocolState: `${action.data.agent_name} analyzing market...`,
      };
    case "AGENT_REASONING": {
      const d = action.data;
      return {
        ...state,
        activeAgent: `${d.agent_name} → predicting`,
        feed: [
          ...state.feed,
          {
            id: ++feedIdCounter,
            type: "reasoning",
            agentName: d.agent_name,
            reasoning: d.reasoning,
            probability: d.probability,
            confidence: d.confidence,
          },
        ],
      };
    }
    case "PREDICTION_SUBMITTED": {
      const d = action.data;
      const prob = d.probability * 100;
      const label = d.agent_name ? d.agent_name.substring(0, 3).toUpperCase() : `#${state.round}`;
      const newPredictions = { ...state.agentPredictions };
      if (d.agent_name) {
        newPredictions[d.agent_name] = (newPredictions[d.agent_name] || 0) + 1;
      }
      return {
        ...state,
        currentProb: prob,
        activeAgent: "",
        priceHistory: [...state.priceHistory, { label, value: prob }],
        agentPredictions: newPredictions,
        txList: [
          ...state.txList,
          {
            agent: d.agent_name,
            prob: prob.toFixed(1),
            txHash: d.tx_hash || "",
            confirmTime: d.confirm_time ? `${d.confirm_time}s` : "",
          },
        ],
      };
    }
    case "DICE_ROLL":
      return { ...state, diceState: "rolling", diceText: "ROLLING..." };
    case "DICE_ANIMATION_DONE":
      if (action.continues) {
        return { ...state, diceState: "continues", diceText: "CONTINUES..." };
      }
      return { ...state, diceState: "resolved", diceText: "STOP! RESOLVED" };
    case "MARKET_RESOLVED": {
      const d = action.data;
      return {
        ...state,
        status: "resolved",
        activeAgent: "",
        diceState: "resolved",
        diceText: `RESOLVED — ${d.referee_agent || "referee"}`,
        protocolState: `Market #${d.market_id} resolved — ${d.total_predictions} predictions`,
      };
    }
    case "PAYOUT_UPDATE": {
      const d = action.data;
      const sign = d.amount >= 0 ? "+" : "";
      return {
        ...state,
        feed: [
          ...state.feed,
          {
            id: ++feedIdCounter,
            type: "payout",
            agentName: d.agent_name,
            message: `${d.agent_name}: ${sign}${d.amount} ETH (total: ${d.total_earned} ETH)`,
            amount: d.amount,
            color: d.amount >= 0 ? "#00e868" : "#ff3040",
          },
        ],
      };
    }
    case "LEADERBOARD":
      return {
        ...state,
        rankings: action.data.rankings || [],
        agentCount: (action.data.rankings || []).length,
      };
    case "GAS_UPDATE": {
      const d = action.data;
      const gwei = (d.gas_price_gwei || d.gwei || d.gas_price || "--") as string;
      return { ...state, gasPrice: `${gwei} gwei` };
    }
    case "SYSTEM":
      return {
        ...state,
        protocolState: action.data.message,
        feed: [
          ...state.feed,
          {
            id: ++feedIdCounter,
            type: "system",
            message: action.data.message,
          },
        ],
      };
    case "ERROR":
      return {
        ...state,
        feed: [
          ...state.feed,
          {
            id: ++feedIdCounter,
            type: "error",
            message: `[ERROR] ${action.data.agent || ""}: ${action.data.message || ""}`,
          },
        ],
      };
    default:
      return state;
  }
}

export function useMarket(lastMessage: WSMessage | null, filterMarketId?: number) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const seenTimestamps = useRef(new Set<string>());

  const handleMessage = useCallback((msg: WSMessage) => {
    const { type, data } = msg;

    // Deduplicate replayed events using timestamp
    const ts = (msg as unknown as { timestamp?: number }).timestamp;
    if (ts) {
      const key = `${type}:${ts}`;
      if (seenTimestamps.current.has(key)) return;
      seenTimestamps.current.add(key);
    }
    switch (type) {
      case "system":
        dispatch({ type: "SYSTEM", data: data as { message: string } });
        break;
      case "market_created": {
        const mData = data as unknown as MarketData;
        if (filterMarketId !== undefined && mData.market_id !== filterMarketId) return;
        seenTimestamps.current.clear();
        dispatch({ type: "MARKET_CREATED", data: mData });
        break;
      }
      case "round_update":
        dispatch({ type: "ROUND_UPDATE", data: data as { round: number; max_rounds: number } });
        break;
      case "agent_thinking":
        dispatch({ type: "AGENT_THINKING", data: data as { agent_name: string } });
        break;
      case "agent_reasoning":
        dispatch({ type: "AGENT_REASONING", data: data as unknown as AgentReasoning });
        break;
      case "prediction_submitted":
        dispatch({ type: "PREDICTION_SUBMITTED", data: data as unknown as PredictionData });
        break;
      case "dice_roll": {
        const diceData = data as unknown as DiceRollData;
        dispatch({ type: "DICE_ROLL", data: diceData });
        setTimeout(() => {
          dispatch({ type: "DICE_ANIMATION_DONE", continues: diceData.continues });
        }, 1000);
        break;
      }
      case "market_resolved":
        dispatch({ type: "MARKET_RESOLVED", data: data as unknown as MarketResolvedData });
        break;
      case "payout_update":
        dispatch({ type: "PAYOUT_UPDATE", data: data as unknown as PayoutData });
        break;
      case "leaderboard":
        dispatch({ type: "LEADERBOARD", data: data as { rankings: LeaderboardEntry[] } });
        break;
      case "gas_update":
        dispatch({ type: "GAS_UPDATE", data });
        break;
      case "error":
        dispatch({ type: "ERROR", data: data as { agent?: string; message?: string } });
        break;
    }
  }, [filterMarketId]);

  useEffect(() => {
    if (lastMessage) handleMessage(lastMessage);
  }, [lastMessage, handleMessage]);

  return state;
}
