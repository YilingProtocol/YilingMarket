"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMarket } from "@/hooks/useMarket";
import { useMarketDetail } from "@/hooks/useMarketDetail";
import { useMarketHistory } from "@/hooks/useMarketHistory";
import { formatProbability, getMarketStatus } from "@/lib/formatters";
import { Header } from "@/components/layout/Header";
import { MarketPanel } from "@/components/market/MarketPanel";
import { ClaimPanel } from "@/components/market/ClaimPanel";
import { AgentPanel } from "@/components/agents/AgentPanel";
import { IntelPanel } from "@/components/layout/IntelPanel";
import { formatEther } from "viem";
import { ArrowLeft } from "lucide-react";
import { useChain } from "@/lib/chainContext";

/* ─── Loading Skeleton ─── */
function DetailSkeleton({ marketId }: { marketId: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {/* Left skeleton */}
      <div className="md:col-span-2 lg:col-span-1 animate-fadeUp">
        <div className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-5 animate-pulse">
          <div className="flex gap-2">
            <div className="h-6 w-14 bg-secondary rounded-md" />
            <div className="h-6 w-16 bg-secondary rounded-md" />
          </div>
          <div className="space-y-2">
            <div className="h-5 w-full bg-secondary rounded-md" />
            <div className="h-5 w-2/3 bg-secondary rounded-md" />
          </div>
          <div className="h-20 w-32 bg-secondary rounded-md" />
          <div className="h-2 w-full bg-secondary rounded-full" />
          <div className="h-40 md:h-48 w-full bg-secondary rounded-lg" />
        </div>
      </div>
      {/* Middle skeleton */}
      <div className="animate-fadeUp stagger-2">
        <div className="bg-card border border-border rounded-xl animate-pulse h-[500px] md:h-[600px] lg:h-[calc(100vh-180px)] lg:min-h-[600px]">
          <div className="flex justify-between p-5 md:p-6 border-b border-border">
            <div className="h-6 w-28 bg-secondary rounded-md" />
            <div className="h-5 w-16 bg-secondary rounded-md" />
          </div>
          <div className="flex items-center justify-center py-12 md:py-16">
            <div className="size-28 md:size-32 rounded-full bg-secondary" />
          </div>
          <div className="px-5 md:px-6 space-y-3">
            <div className="h-14 bg-secondary rounded-lg" />
            <div className="h-14 bg-secondary rounded-lg" />
            <div className="h-14 bg-secondary rounded-lg" />
          </div>
        </div>
      </div>
      {/* Right skeleton */}
      <div className="animate-fadeUp stagger-4">
        <div className="bg-card border border-border rounded-xl animate-pulse h-[500px] md:h-[600px] lg:h-[calc(100vh-180px)] lg:min-h-[600px]">
          <div className="flex justify-between p-5 md:p-6 border-b border-border">
            <div className="h-6 w-28 bg-secondary rounded-md" />
            <div className="h-6 w-24 bg-secondary rounded-md" />
          </div>
          <div className="p-5 md:p-6 space-y-4">
            <div className="h-12 bg-secondary rounded-lg" />
            <div className="h-12 bg-secondary rounded-lg" />
            <div className="h-12 bg-secondary rounded-lg" />
            <div className="grid grid-cols-3 gap-2 md:gap-3 pt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 md:h-16 bg-secondary rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = Number(params.id);

  const { chainConfig } = useChain();
  const { lastMessage } = useWebSocket();
  const market = useMarket(lastMessage, marketId);
  const { marketInfo, params: chainParams, isActive, isLoading } = useMarketDetail(marketId);
  const {
    history,
    isLoading: historyLoading,
    priceHistory: historyPriceHistory,
    txList: historyTxList,
    feed: historyFeed,
    agentPredictions: historyAgentPredictions,
    rankings: historyRankings,
  } = useMarketHistory(marketId);

  const wsHasData = market.question !== "Connecting to agent system...";

  const question = marketInfo
    ? marketInfo[0]
    : wsHasData
    ? market.question
    : "Loading market...";

  // On-chain data is always the source of truth for price and status
  const chainProb = marketInfo ? formatProbability(marketInfo[1]) : null;
  const chainStatus = marketInfo ? getMarketStatus(marketInfo[3], isActive ?? false) : null;

  const currentProb = chainProb ?? market.currentProb;
  const status = chainStatus ?? market.status;

  const displayParams = chainParams
    ? {
        alpha: `${chainParams[0].toString()}`,
        b: `${parseFloat(formatEther(chainParams[4])).toFixed(4)}`,
        k: chainParams[1].toString(),
        r: `${parseFloat(formatEther(chainParams[2])).toFixed(4)}`,
        bond: `${parseFloat(formatEther(chainParams[3])).toFixed(4)} USDC`,
        fee: "5%",
      }
    : { alpha: "-", b: "-", k: "-", r: "-", bond: "-", fee: "5%" };

  // Use whichever source has more data (WS live vs API history)
  const priceHistory = market.priceHistory.length > historyPriceHistory.length
    ? market.priceHistory
    : historyPriceHistory;

  const txList = market.txList.length > historyTxList.length
    ? market.txList
    : historyTxList;

  const feed = market.feed.length > historyFeed.length
    ? market.feed
    : historyFeed;

  const agentPredictions = Object.keys(market.agentPredictions).length > Object.keys(historyAgentPredictions).length
    ? market.agentPredictions
    : historyAgentPredictions;

  const round = market.round > 0 ? market.round : (Number(history?.reportCount || 0) ?? 0);
  const agentCount = market.agentCount > 0
    ? market.agentCount
    : Object.keys(agentPredictions).length;

  const protocolState = market.protocolState !== "Awaiting arcane invocation..."
    ? market.protocolState
    : history?.resolved
    ? `Market #${marketId} resolved — ${history.reportCount} reports`
    : history
    ? `Market #${marketId} — ${history.reportCount} reports`
    : market.protocolState;

  const diceState: "idle" | "rolling" | "continues" | "resolved" = market.diceState !== "idle"
    ? market.diceState as "idle" | "rolling" | "continues" | "resolved"
    : history?.resolved
    ? "resolved"
    : "idle";

  const diceText = market.diceText !== "Awaiting..."
    ? market.diceText
    : history?.resolved
    ? "RESOLVED"
    : "Awaiting...";

  return (
    <div className="min-h-dvh bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Back Button */}
        <Link
          href="/markets"
          className="group inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-sm">Back to Markets</span>
        </Link>

        {isLoading && historyLoading && !wsHasData ? (
          <DetailSkeleton marketId={marketId} />
        ) : (
          /* Responsive Layout: 1-col mobile, 2-col tablet, 3-col desktop */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Left Panel - Market Info (full width on tablet) */}
            <div className="md:col-span-2 lg:col-span-1 animate-fadeUp space-y-4 md:space-y-6">
              <MarketPanel
                marketId={marketId}
                question={question}
                status={status}
                source={market.source}
                category={market.category}
                currentProb={currentProb}
                priceHistory={priceHistory}
              />
              {status === "resolved" && history && (
                <ClaimPanel
                  marketId={marketId}
                  reporters={(history.reports ?? []).map((r) => r.reporter)}
                />
              )}
            </div>

            {/* Middle Panel - Agent Logic */}
            <div className="h-[500px] md:h-[600px] lg:h-[calc(100vh-180px)] lg:min-h-[600px] animate-fadeUp stagger-2">
              <AgentPanel
                round={round}
                maxRounds={market.maxRounds}
                activeAgent={market.activeAgent}
                agentCount={agentCount}
                protocolState={protocolState}
                feed={feed}
              />
            </div>

            {/* Right Panel - Intelligence */}
            <div className="h-[500px] md:h-[600px] lg:h-[calc(100vh-180px)] lg:min-h-[600px] animate-fadeUp stagger-4">
              <IntelPanel
                rankings={historyLoading ? [] : historyRankings.length > 0 ? historyRankings : market.rankings}
                round={round}
                maxRounds={market.maxRounds}
                agentPredictions={agentPredictions}
                diceState={diceState}
                diceText={diceText}
                txList={txList}
                params={displayParams}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
