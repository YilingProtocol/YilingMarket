export interface WSMessage {
  type: string;
  data: Record<string, unknown>;
}

export interface MarketData {
  market_id: number;
  question: string;
  initial_price: number;
  category?: string;
  source?: string;
}

export interface AgentReasoning {
  agent_name: string;
  reasoning: string;
  probability: number;
  confidence: number;
}

export interface PredictionData {
  agent_name: string;
  probability: number;
  tx_hash?: string;
  confirm_time?: number;
}

export interface DiceRollData {
  continues: boolean;
}

export interface LeaderboardEntry {
  agent: string;
  total_mon?: number;
  total_eth?: number;
}

export interface PayoutData {
  agent_name: string;
  amount: number;
  total_earned: number;
}

export interface MarketResolvedData {
  market_id: number;
  total_predictions: number;
  referee_agent?: string;
}

export interface MarketListItem {
  id: number;
  question: string;
  probability: number;
  status: "live" | "resolved" | "standby";
  predictionCount: number;
  totalPool: string;
  creator: string;
}
