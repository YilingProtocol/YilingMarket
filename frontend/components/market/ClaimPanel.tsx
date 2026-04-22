"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { CheckCircle2, Loader2, AlertTriangle, Coins } from "lucide-react";
import {
  claimPayout,
  getPayoutPreview,
  wadToUsdc,
  type ClaimResult,
  type PayoutPreview,
} from "@/lib/api";
import { marketQueryKey } from "@/hooks/useMarketDetail";
import { Button } from "@/components/ui/button";

interface ClaimPanelProps {
  marketId: number;
  /** List of reporter addresses on this market, from history.reports */
  reporters: string[];
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-mono tabular-nums ${
          highlight ? "text-accent font-semibold" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function ClaimPanel({ marketId, reporters }: ClaimPanelProps) {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [claimed, setClaimed] = useState<ClaimResult | null>(null);

  const userIsReporter =
    !!address && reporters.some((r) => r.toLowerCase() === address.toLowerCase());

  const preview = useQuery<PayoutPreview>({
    queryKey: ["payout", marketId, address?.toLowerCase()],
    queryFn: () => getPayoutPreview(String(marketId), address as string),
    enabled: isConnected && userIsReporter,
    staleTime: 30_000,
  });

  const claim = useMutation<ClaimResult, Error>({
    mutationFn: () => claimPayout(String(marketId), address as string),
    onSuccess: (result) => {
      setClaimed(result);
      queryClient.invalidateQueries({ queryKey: marketQueryKey(marketId) });
    },
  });

  if (!isConnected) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Coins className="size-4" />
          <span className="text-sm font-medium">Claim Payout</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Connect your wallet to check whether you have a payout on this market.
        </p>
      </div>
    );
  }

  if (!userIsReporter) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Coins className="size-4 text-accent" />
        <span className="text-sm font-medium">Your Payout</span>
      </div>

      {preview.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Fetching payout preview…
        </div>
      )}

      {preview.error && !preview.data && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4 mt-0.5" />
          <span>Could not load payout preview. Try again in a moment.</span>
        </div>
      )}

      {preview.data && !claimed && (
        <div className="space-y-2">
          <Row label="Gross" value={`${wadToUsdc(preview.data.gross)} USDC`} />
          <Row
            label={`Protocol rake (${preview.data.rakeRate})`}
            value={`−${wadToUsdc(preview.data.rake)} USDC`}
          />
          <div className="h-px bg-border my-1" />
          <Row label="Net to you" value={`${wadToUsdc(preview.data.net)} USDC`} highlight />
        </div>
      )}

      {claimed && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm text-accent">
            <CheckCircle2 className="size-4 mt-0.5" />
            <span>
              Claimed <span className="font-mono">{wadToUsdc(claimed.net)}</span> USDC.
            </span>
          </div>
          {claimed.txHash && (
            <div className="text-xs font-mono text-muted-foreground break-all">
              tx: {claimed.txHash}
            </div>
          )}
        </div>
      )}

      {!claimed && (
        <Button
          disabled={!preview.data || claim.isPending || Number(preview.data?.net ?? "0") === 0}
          onClick={() => claim.mutate()}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {claim.isPending ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Claiming…
            </>
          ) : (
            "Claim payout"
          )}
        </Button>
      )}

      {claim.error && (
        <div className="flex items-start gap-2 text-xs text-destructive">
          <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
          <span>{claim.error.message}</span>
        </div>
      )}
    </div>
  );
}
