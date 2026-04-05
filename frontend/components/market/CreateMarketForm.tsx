"use client";

import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { parseEther } from "viem";
import { useChain } from "@/lib/chainContext";
import { createX402Fetch } from "@/lib/x402";
import { APP_SOURCE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Lock, Loader2, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

const API_BASE = "https://api.yilingprotocol.com";

interface CreateMarketFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  alwaysOpen?: boolean;
}

export function CreateMarketForm({ onClose, onSuccess, alwaysOpen }: CreateMarketFormProps) {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { chainConfig } = useChain();
  const [isOpen, setIsOpen] = useState(alwaysOpen ?? false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [question, setQuestion] = useState("");
  const [probability, setProbability] = useState([50]);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  // SKC Parameters (with sensible defaults)
  const [alpha, setAlpha] = useState("20");       // Stop probability %
  const [k, setK] = useState("2");                // Last-K reward count
  const [flatReward, setFlatReward] = useState("0.01");  // Reward per last-k agent (USDC)
  const [bondAmount, setBondAmount] = useState("1");      // Bond per report (USDC)
  const [liquidity, setLiquidity] = useState("1");        // LMSR liquidity param (USDC)

  // Calculate minimum funding: b·ln(2) + k·R (in USDC)
  // Use precise ln(2) = 0.693147180559945309 and add 1% buffer for rounding
  const minFunding = Number(liquidity) * 0.693147180559945309 + Number(k) * Number(flatReward);
  const fundingWithBuffer = minFunding * 1.01; // 1% buffer to avoid contract revert
  // x402 price = bondPool (funding) + 15% creation fee
  const totalCost = fundingWithBuffer * 1.15;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !walletClient || !address) return;

    setIsPending(true);
    setError("");

    try {
      const x402Fetch = createX402Fetch(walletClient, address, chainConfig);

      const initialPrice = parseEther((probability[0] / 100).toString()).toString();
      const alphaWad = parseEther((Number(alpha) / 100).toString()).toString();
      const flatRewardWad = parseEther(flatReward).toString();
      const bondAmountWad = parseEther(bondAmount).toString();
      const liquidityWad = parseEther(liquidity).toString();
      const fundingWad = parseEther(fundingWithBuffer.toFixed(18)).toString();

      const res = await x402Fetch(`${API_BASE}/query/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          bondPool: fundingWad,
          alpha: alphaWad,
          k,
          flatReward: flatRewardWad,
          bondAmount: bondAmountWad,
          liquidityParam: liquidityWad,
          initialPrice,
          creator: address,
          queryChain: chainConfig.caip2,
          source: APP_SOURCE,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.log("API error status:", res.status, "body:", body, "headers:", Object.fromEntries(res.headers.entries()));
        throw new Error(body || `API error: ${res.status}`);
      }

      const result = await res.json();
      console.log("Query created:", result);

      setIsSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setQuestion("");
        setIsSuccess(false);
        onSuccess?.();
        onClose?.();
      }, 1500);
    } catch (err: any) {
      console.error("Full error:", err);
      setError(err.message || "Failed to create query");
    } finally {
      setIsPending(false);
    }
  };

  if (!isConnected) {
    if (alwaysOpen) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-8 bg-secondary/50 rounded-lg border border-border/60">
          <Lock className="size-5 text-muted-foreground mb-1" />
          <span className="text-sm text-muted-foreground font-medium">
            Connect wallet to create market
          </span>
        </div>
      );
    }
    return null;
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full mb-3"
      >
        + Ask a Question
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Question */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Question</label>
        <Textarea
          placeholder="Will AI surpass human reasoning by 2030?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="min-h-24 resize-none"
        />
      </div>

      {/* Initial Probability */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Initial Probability</label>
        <div className="text-center mb-4">
          <span className="text-5xl font-bold font-mono text-foreground tabular-nums">
            {probability[0]}
            <span className="text-3xl text-muted-foreground">%</span>
          </span>
        </div>
        <Slider value={probability} onValueChange={setProbability} min={1} max={99} step={1} className="w-full" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Unlikely</span>
          <span>Likely</span>
        </div>
      </div>

      {/* Cost Estimate */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm text-muted-foreground">Estimated Cost</span>
          <span className="text-2xl font-bold font-mono text-primary tabular-nums">
            ~{totalCost.toFixed(2)} USDC
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Bond pool ({minFunding.toFixed(2)} USDC) + 15% creation fee. Paid via x402.
        </p>
      </div>

      {/* Advanced Parameters */}
      <div className="border border-border rounded-lg">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-lg cursor-pointer"
        >
          <span className="text-sm font-medium text-foreground">Advanced Parameters</span>
          {showAdvanced ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showAdvanced && (
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Alpha (Stop Probability)</label>
                <div className="relative">
                  <Input type="number" value={alpha} onChange={(e) => setAlpha(e.target.value)} className="pr-8" min="1" max="99" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-[10px] text-muted-foreground/60">Chance of resolution after each report</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Last-K Reward Count</label>
                <Input type="number" value={k} onChange={(e) => setK(e.target.value)} min="1" />
                <p className="text-[10px] text-muted-foreground/60">Number of last agents getting flat reward</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Bond Amount</label>
                <div className="relative">
                  <Input type="number" step="0.01" value={bondAmount} onChange={(e) => setBondAmount(e.target.value)} className="pr-14" min="0.01" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">USDC</span>
                </div>
                <p className="text-[10px] text-muted-foreground/60">Required deposit per agent prediction</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Liquidity (b)</label>
                <div className="relative">
                  <Input type="number" step="0.01" value={liquidity} onChange={(e) => setLiquidity(e.target.value)} className="pr-14" min="0.01" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">USDC</span>
                </div>
                <p className="text-[10px] text-muted-foreground/60">LMSR scaling parameter</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Flat Reward (R)</label>
              <div className="relative">
                <Input type="number" step="0.001" value={flatReward} onChange={(e) => setFlatReward(e.target.value)} className="pr-14" min="0.001" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">USDC</span>
              </div>
              <p className="text-[10px] text-muted-foreground/60">Guaranteed reward per last-K agent</p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        className="w-full cursor-pointer"
        size="lg"
        disabled={isPending || isSuccess || !question.trim() || !walletClient}
      >
        {isSuccess ? (
          <>
            <CheckCircle className="size-4" />
            Market Created!
          </>
        ) : isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Creating via x402...
          </>
        ) : (
          "Create Market"
        )}
      </Button>

      {!alwaysOpen && (
        <button
          type="button"
          onClick={() => { setIsOpen(false); onClose?.(); }}
          className="w-full text-sm py-1.5 border-none bg-transparent text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      )}
    </form>
  );
}
