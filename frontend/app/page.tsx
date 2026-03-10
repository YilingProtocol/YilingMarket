"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ExternalLink } from "lucide-react";
import { createPublicClient, http } from "viem";

import { CHAINS, CONTRACT_ABI } from "@/lib/contracts";

const LightPillar = dynamic(() => import("@/components/LightPillar"), {
  ssr: false,
});

const TextType = dynamic(() => import("@/components/TextType"), {
  ssr: false,
});

export default function LandingPage() {
  const [agentCount, setAgentCount] = useState(0);
  const [marketCount, setMarketCount] = useState(0);

  useEffect(() => {
    const chains = Object.values(CHAINS);
    Promise.all(
      chains.map((chain) => {
        const client = createPublicClient({
          chain: { id: chain.chainId, name: chain.name, nativeCurrency: chain.nativeCurrency, rpcUrls: { default: { http: [chain.rpcUrl] } } },
          transport: http(chain.rpcUrl),
        });
        return client
          .readContract({
            address: chain.contractAddress,
            abi: CONTRACT_ABI,
            functionName: "getMarketCount",
          })
          .then((count) => Number(count))
          .catch(() => 0);
      })
    ).then((counts) => {
      const totalMarkets = counts.reduce((a, b) => a + b, 0);
      setMarketCount(totalMarkets);
      // 7 AI agents per chain
      setAgentCount(chains.length * 7);
    });
  }, []);

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#0c0a09]">
      {/* LightPillar Background */}
      <div className="absolute inset-0">
        <LightPillar
          topColor="#e07c3f"
          bottomColor="#d4692a"
          intensity={0.6}
          rotationSpeed={0.4}
          interactive={false}
          glowAmount={0.005}
          pillarWidth={12}
          pillarHeight={1}
          noiseIntensity={1.8}
          pillarRotation={25}
          quality="medium"
        />
      </div>

      {/* Dark vignette overlay for text readability */}
      <div
        className="absolute inset-0 z-[5] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(12,10,9,0.7) 0%, rgba(12,10,9,0.35) 60%, transparent 100%)",
        }}
      />

      {/* Top nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Yiling Market" width={32} height={32} />
          <span className="text-white/90 text-lg font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Yiling Market
          </span>
        </div>
        <a
          href="https://yiling-protocol-landing.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/50 text-sm hover:text-white/80 transition-colors flex items-center gap-1.5"
        >
          About the Protocol
          <ExternalLink className="size-3" />
        </a>
      </nav>

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-[calc(100%-80px)] px-6 text-center">
        {/* Badge */}
        <div className="mb-6 animate-fadeUp">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-mono tracking-wider uppercase">
            <span className="size-1.5 rounded-full bg-[#e07c3f] animate-livePulse" />
            Live on Base & Monad
          </span>
        </div>

        {/* Typewriter heading */}
        <div className="text-white/80 text-lg md:text-xl lg:text-2xl font-light leading-relaxed max-w-2xl animate-fadeUp stagger-1">
          {/* @ts-expect-error -- JSX component, optional props have defaults */}
          <TextType
            text="Are you ready for Self-Resolving Prediction Markets for Unverifiable Outcomes?"
            typingSpeed={115}
            pauseDuration={1400}
            showCursor
            cursorCharacter="_"
            deletingSpeed={50}
            loop={false}
            cursorBlinkDuration={2}
          />
        </div>

        {/* Subtitle */}
        <p className="mt-4 text-white/40 text-sm md:text-base max-w-lg animate-fadeUp stagger-2">
          Oracle-free markets powered by AI agents. No external data feeds. Pure game theory.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 animate-fadeUp stagger-3">
          <Link
            href="/markets"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-[#e07c3f] text-white text-sm font-medium transition-all duration-300 hover:bg-[#c96a30] hover:shadow-[0_0_30px_rgba(224,124,63,0.35)] cursor-pointer"
          >
            Enter Markets
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-6 py-3.5 text-white/50 text-sm font-medium transition-colors hover:text-white/80"
          >
            Read the Docs
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 flex items-center gap-8 md:gap-12 animate-fadeUp stagger-4">
          {[
            { value: "0", label: "Oracles Needed" },
            { value: String(agentCount), label: "AI Agents" },
            { value: String(marketCount), label: "Markets" },
            { value: "2", label: "Networks" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-white/90 text-2xl md:text-3xl font-bold tabular-nums" style={{ fontFamily: "var(--font-heading)" }}>
                {stat.value}
              </div>
              <div className="text-white/40 text-xs md:text-sm mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
