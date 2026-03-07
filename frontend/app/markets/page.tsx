"use client";

import { useState, useMemo } from "react";
import { useMarketList } from "@/hooks/useMarketList";
import { Header } from "@/components/layout/Header";
import { MarketGrid } from "@/components/markets/MarketGrid";
import { CreateMarketForm } from "@/components/market/CreateMarketForm";
import { Badge } from "@/components/ui/badge";
import { X, TrendingUp, CheckCircle2, LayoutGrid } from "lucide-react";

type Filter = "all" | "live" | "resolved";

export default function Home() {
  const { markets, isLoading, refetch } = useMarketList();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<Filter>("live");

  const filtered = useMemo(() => {
    if (filter === "all") return markets;
    return markets.filter((m) => m.status === filter);
  }, [markets, filter]);

  const liveCount = markets.filter((m) => m.status === "live").length;
  const resolvedCount = markets.filter((m) => m.status === "resolved").length;

  const filterConfig = [
    { key: "all" as Filter, label: "All", count: markets.length, icon: LayoutGrid },
    { key: "live" as Filter, label: "Live", count: liveCount, icon: TrendingUp },
    { key: "resolved" as Filter, label: "Resolved", count: resolvedCount, icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <Header
        gasPrice="--"
        isConnected={false}
        isConnecting={false}
        onCreateMarket={() => setShowCreateModal(true)}
      />

      <main className="container mx-auto px-4 py-8 md:py-12">
        {/* Hero Section */}
        <div className="mb-10 md:mb-14 animate-fadeUp">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Prediction Markets</span>
            <div className="h-px flex-1 bg-gradient-to-l from-primary/40 to-transparent" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3 text-foreground text-center tracking-tight">
            Explore Markets
          </h1>
          <p className="text-muted-foreground text-base md:text-lg text-center max-w-xl mx-auto animate-fadeUp stagger-1">
            Oracle-free prediction markets powered by AI agents on Base
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 justify-center flex-wrap animate-fadeUp stagger-2">
          {filterConfig.map((tab) => {
            const Icon = tab.icon;
            return (
              <Badge
                key={tab.key}
                variant={filter === tab.key ? "default" : "outline"}
                className={`cursor-pointer px-4 py-2 text-sm transition-all duration-200 gap-1.5 ${
                  filter === tab.key
                    ? "shadow-[0_0_12px_var(--color-glow-primary)]"
                    : "hover:bg-secondary"
                }`}
                onClick={() => setFilter(tab.key)}
              >
                <Icon className="size-3.5" />
                {tab.label}
                <span className="ml-0.5 tabular-nums opacity-70">({tab.count})</span>
              </Badge>
            );
          })}
        </div>

        <MarketGrid markets={filtered} isLoading={isLoading} />
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
            <div className="bg-card border border-border rounded-xl p-6 shadow-2xl">
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
