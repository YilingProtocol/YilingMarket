/**
 * Yiling Protocol API Client
 * Public API only — no internal access, no project files.
 * Any external developer can use this same API.
 */

const API_BASE = "https://api.yilingprotocol.com";

// ── Types ──────────────────────────────────────────────

export interface QueryListItem {
  queryId: string;
  question: string;
  currentPrice: string;
  creator: string;
  totalPool: string;
  reportCount: string;
}

export interface Report {
  agentId: string;
  reporter: string;
  probability: string;
  priceBefore: string;
  priceAfter: string;
  bondAmount: string;
  sourceChain: string;
  timestamp: string;
}

export interface QueryStatus {
  queryId: string;
  question: string;
  currentPrice: string;
  creator: string;
  resolved: boolean;
  totalPool: string;
  reportCount: string;
  params: {
    alpha: string;
    k: string;
    flatReward: string;
    bondAmount: string;
    liquidityParam: string;
    createdAt: string;
  };
  reports: Report[];
}

export interface HealthResponse {
  status: string;
  protocol: string;
  version: string;
  queryCount: string;
}

export interface AgentStatus {
  address: string;
  isRegistered: boolean;
  agentId: string;
}

export interface AgentReputation {
  agentId: string;
  score: string;
  tag: string;
  feedbackCount: string;
}

export interface PayoutPreview {
  queryId: string;
  reporter: string;
  gross: string;
  rake: string;
  net: string;
  rakeRate: string;
}

// ── API Functions ──────────────────────────────────────

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function getActiveQueries(source?: string): Promise<QueryListItem[]> {
  const url = source
    ? `${API_BASE}/queries/active?source=${encodeURIComponent(source)}`
    : `${API_BASE}/queries/active`;
  const res = await fetch(url);
  const data = await res.json();
  return data.activeQueries || [];
}

/** App source identifier — used to filter queries created by this app */
export const APP_SOURCE = "yiling-market";

export async function getQueryStatus(queryId: string): Promise<QueryStatus> {
  const res = await fetch(`${API_BASE}/query/${queryId}/status`);
  return res.json();
}

export async function getAgentStatus(address: string): Promise<AgentStatus> {
  const res = await fetch(`${API_BASE}/agent/${address}/status`);
  return res.json();
}

export async function getAgentReputation(agentId: string): Promise<AgentReputation> {
  const res = await fetch(`${API_BASE}/agent/${agentId}/reputation`);
  return res.json();
}

export async function getPayoutPreview(queryId: string, reporter: string): Promise<PayoutPreview> {
  const res = await fetch(`${API_BASE}/query/${queryId}/payout/${reporter}`);
  return res.json();
}

export async function getPricing() {
  const res = await fetch(`${API_BASE}/query/pricing`);
  return res.json();
}

// ── Helpers ────────────────────────────────────────────

/** Convert WAD (18 decimals) to human-readable number */
export function fromWad(wad: string): number {
  return Number(wad) / 1e18;
}

/** Convert WAD to percentage (0-100) */
export function wadToPercent(wad: string): number {
  return Math.round(fromWad(wad) * 100);
}

/** Format WAD as USDC amount (6 decimals) */
export function wadToUsdc(wad: string): string {
  const usdc = Number(wad) / 1e18;
  return usdc.toFixed(4);
}
