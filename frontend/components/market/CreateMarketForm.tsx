"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useChain } from "@/lib/chainContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Lock } from "lucide-react";

/**
 * CreateMarketForm — old contract logic removed.
 * Will be replaced with Protocol API /query/create via x402.
 */

interface CreateMarketFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  alwaysOpen?: boolean;
}

export function CreateMarketForm({ onClose, onSuccess, alwaysOpen }: CreateMarketFormProps) {
  const { isConnected } = useAccount();
  const { chainConfig } = useChain();
  const [isOpen, setIsOpen] = useState(alwaysOpen ?? false);
  const [question, setQuestion] = useState("");
  const [probability, setProbability] = useState([50]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Will be replaced with Protocol API x402 payment
    console.log("TODO: Create query via Protocol API", { question, probability: probability[0] });
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
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Question</label>
        <Textarea
          placeholder="Will AI surpass human reasoning by 2030?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="min-h-24 resize-none"
        />
      </div>

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

      <Button
        type="submit"
        className="w-full cursor-pointer"
        size="lg"
        disabled={!question.trim()}
      >
        Create Market
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
