"use client";

import { useEffect, useState } from "react";
import { Dice1 } from "lucide-react";

interface DiceRollProps {
  state: "idle" | "rolling" | "continues" | "resolved";
  text: string;
}

export function DiceRoll({ state, text }: DiceRollProps) {
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    if (state === "rolling") {
      setIsSpinning(true);
      const timer = setTimeout(() => setIsSpinning(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setIsSpinning(false);
    }
  }, [state]);

  const color =
    state === "continues"
      ? "text-accent"
      : state === "resolved"
      ? "text-destructive"
      : "text-primary";

  const glowColor =
    state === "continues"
      ? "var(--color-glow-accent)"
      : state === "resolved"
      ? "var(--color-glow-destructive)"
      : "var(--color-glow-primary)";

  return (
    <div className="flex flex-col items-center justify-center py-5 space-y-3">
      <div
        className={`transition-transform duration-500 rounded-2xl p-3 ${
          isSpinning ? "animate-spin" : ""
        } ${state === "resolved" ? "animate-scaleIn" : ""}`}
        style={{
          boxShadow: state !== "idle" ? `0 0 24px ${glowColor}` : "none",
        }}
      >
        <Dice1 className={`size-10 ${color}`} />
      </div>
      <div className={`text-sm font-bold tracking-wider uppercase ${color}`}>
        {text}
      </div>
    </div>
  );
}
