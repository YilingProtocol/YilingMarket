"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contracts";
import { baseSepolia } from "@/lib/wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, ChevronUp, Lock, Loader2 } from "lucide-react";

interface CreateMarketFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  alwaysOpen?: boolean;
}

export function CreateMarketForm({ onClose, onSuccess, alwaysOpen }: CreateMarketFormProps) {
  const { isConnected } = useAccount();
  const [isOpen, setIsOpen] = useState(alwaysOpen ?? false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [question, setQuestion] = useState("");
  const [probability, setProbability] = useState([50]);
  const [alpha, setAlpha] = useState("10");
  const [k, setK] = useState("2");
  const [r, setR] = useState("0.001");
  const [bond, setBond] = useState("0.001");
  const [b, setB] = useState("0.003");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const cost = Number(k) * Number(r) + Number(b);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const alphaWad = parseEther((Number(alpha) / 100).toString());
    const flatReward = parseEther(r);
    const bondAmount = parseEther(bond);
    const liquidityParam = parseEther(b);
    const initialPrice = parseEther((probability[0] / 100).toString());
    const funding = flatReward * BigInt(k) + liquidityParam;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "createMarket",
      args: [question, alphaWad, BigInt(k), flatReward, bondAmount, liquidityParam, initialPrice],
      value: funding,
      chain: baseSepolia,
    });
  };

  useEffect(() => {
    if (isSuccess && isOpen) {
      setIsOpen(false);
      setQuestion("");
      onSuccess?.();
      onClose?.();
    }
  }, [isSuccess]);

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
        <label className="text-sm font-medium text-foreground">
          Question
        </label>
        <Textarea
          placeholder="Will AI surpass human reasoning by 2030?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="min-h-24 resize-none"
        />
      </div>

      {/* Initial Probability Slider */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Initial Probability
        </label>
        <div className="text-center mb-4">
          <span className="text-5xl font-bold font-mono text-foreground tabular-nums">
            {probability[0]}
            <span className="text-3xl text-muted-foreground">%</span>
          </span>
        </div>
        <div className="space-y-3">
          <Slider
            value={probability}
            onValueChange={setProbability}
            min={1}
            max={99}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Unlikely</span>
            <span>Likely</span>
          </div>
        </div>
      </div>

      {/* Estimated Cost */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm text-muted-foreground">
            Estimated Cost
          </span>
          <span className="text-2xl font-bold font-mono text-primary tabular-nums">
            ~{cost.toFixed(4)} ETH
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Includes liquidity provision and initial market setup fees
        </p>
      </div>

      {/* Advanced Parameters */}
      <div className="border border-border rounded-lg">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-lg cursor-pointer"
        >
          <span className="text-sm font-medium text-foreground">
            Advanced Parameters
          </span>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {showAdvanced && (
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Alpha (Stop Probability)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={alpha}
                    onChange={(e) => setAlpha(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Last-K Reward Count
                </label>
                <Input
                  type="number"
                  value={k}
                  onChange={(e) => setK(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Flat Reward (R)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={r}
                    onChange={(e) => setR(e.target.value)}
                    className="pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ETH
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Bond Amount
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={bond}
                    onChange={(e) => setBond(e.target.value)}
                    className="pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ETH
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Liquidity (b)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ETH
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full cursor-pointer transition-shadow hover:shadow-[0_0_16px_var(--color-glow-primary)]"
        size="lg"
        disabled={isPending || isConfirming || !question.trim()}
      >
        {isPending || isConfirming ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {isPending ? "Sending Transaction..." : "Confirming..."}
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
