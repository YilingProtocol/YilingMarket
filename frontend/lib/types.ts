export interface WSMessage {
  type: string;
  data: Record<string, unknown>;
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
