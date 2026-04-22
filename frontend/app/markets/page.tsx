"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { useMarketList } from "@/hooks/useMarketList";
import { Header } from "@/components/layout/Header";
import { MarketGrid } from "@/components/markets/MarketGrid";
import { FeaturedMarket } from "@/components/markets/FeaturedMarket";
import { TopAgents } from "@/components/markets/TopAgents";
import { CreateMarketForm } from "@/components/market/CreateMarketForm";
import { X } from "lucide-react";

type Filter = "all" | "live" | "resolved" | "mine";

export default function Home() {
  const { markets, isLoading, refetch } = useMarketList();
  const { address } = useAccount();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const myMarkets = useMemo(() => {
    if (!address) return [];
    return markets.filter((m) => m.creator.toLowerCase() === address.toLowerCase());
  }, [markets, address]);

  const filtered = useMemo(() => {
    if (filter === "all") return markets;
    if (filter === "mine") return myMarkets;
    return markets.filter((m) => m.status === filter);
  }, [markets, myMarkets, filter]);

  const liveCount = markets.filter((m) => m.status === "live").length;
  const resolvedCount = markets.filter((m) => m.status === "resolved").length;

  // Featured: live market with highest pool
  const featured = useMemo(() => {
    const live = markets.filter((m) => m.status === "live");
    if (live.length === 0) return null;
    return live.reduce((a, b) =>
      parseFloat(a.totalPool) > parseFloat(b.totalPool) ? a : b
    );
  }, [markets]);

  const gridMarkets = filtered.filter((m) => m.id !== featured?.id);

  return (
    <div className="min-h-dvh bg-background">
      <Header onCreateMarket={() => setShowCreateModal(true)} />

      <main className="container mx-auto px-6 py-8 md:py-12 max-w-7xl">
        {/* Featured + Trending Row */}
        {!isLoading && featured && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 animate-fadeUp">
            <div className="lg:col-span-2">
              <FeaturedMarket market={featured} />
            </div>
            <div>
              <TopAgents />
            </div>
          </div>
        )}

        {/* All Markets Section */}
        <div className="animate-fadeUp stagger-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              All markets
            </h2>
            {/* Status filter */}
            <div className="inline-flex bg-secondary rounded-lg p-1 gap-1 border border-border/50">
              {([
                { key: "all" as Filter, label: "All", count: markets.length },
                { key: "live" as Filter, label: "Live", count: liveCount },
                { key: "resolved" as Filter, label: "Resolved", count: resolvedCount },
                ...(address ? [{ key: "mine" as Filter, label: "Mine", count: myMarkets.length }] : []),
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${
                    filter === tab.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 tabular-nums ${filter === tab.key ? "opacity-70" : "opacity-40"}`}>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          <MarketGrid markets={gridMarkets} isLoading={isLoading} />
        </div>
      </main>

      {/* Create Market Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div className="w-full max-w-md mx-4 animate-scaleIn">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-foreground">
                  Create Market
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="size-4" />
                </button>
              </div>
              <CreateMarketForm
                alwaysOpen
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                  refetch();
                  setShowCreateModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
