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

// ── Fetch helper (throws on server errors to enable stale-while-error) ───

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText} — ${url}`);
  }
  return res.json();
}

// ── API Functions ──────────────────────────────────────

export async function getHealth(): Promise<HealthResponse> {
  return apiFetch(`${API_BASE}/health`);
}

export async function getActiveQueries(source?: string): Promise<QueryListItem[]> {
  const url = source
    ? `${API_BASE}/queries/active?source=${encodeURIComponent(source)}`
    : `${API_BASE}/queries/active`;
  const data = await apiFetch<{ activeQueries?: QueryListItem[] }>(url);
  return data.activeQueries || [];
}

export async function getResolvedQueries(source?: string): Promise<QueryListItem[]> {
  const url = source
    ? `${API_BASE}/queries/resolved?source=${encodeURIComponent(source)}`
    : `${API_BASE}/queries/resolved`;
  const data = await apiFetch<{ resolvedQueries?: QueryListItem[] }>(url);
  return data.resolvedQueries || [];
}

/** App source identifier — used to filter queries created by this app */
export const APP_SOURCE = "yiling-market";

export async function getQueryStatus(queryId: string): Promise<QueryStatus> {
  return apiFetch(`${API_BASE}/query/${queryId}/status`);
}

export async function getAgentStatus(address: string): Promise<AgentStatus> {
  return apiFetch(`${API_BASE}/agent/${address}/status`);
}

export async function getAgentReputation(agentId: string): Promise<AgentReputation> {
  return apiFetch(`${API_BASE}/agent/${agentId}/reputation`);
}

export async function getPayoutPreview(queryId: string, reporter: string): Promise<PayoutPreview> {
  return apiFetch(`${API_BASE}/query/${queryId}/payout/${reporter}`);
}

export async function getPricing() {
  return apiFetch(`${API_BASE}/query/pricing`);
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
