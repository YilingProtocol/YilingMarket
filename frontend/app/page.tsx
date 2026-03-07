"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

const LightPillar = dynamic(() => import("@/components/LightPillar"), {
  ssr: false,
});

const TextType = dynamic(() => import("@/components/TextType"), {
  ssr: false,
});

export default function LandingPage() {
  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#08090d]">
      {/* LightPillar Background */}
      <div className="absolute inset-0">
        <LightPillar
          topColor="#5227FF"
          bottomColor="#FF9FFC"
          intensity={0.8}
          rotationSpeed={0.5}
          interactive={false}
          glowAmount={0.004}
          pillarWidth={10}
          pillarHeight={1}
          noiseIntensity={2}
          pillarRotation={30}
          quality="medium"
        />
      </div>

      {/* Dark vignette overlay for text readability */}
      <div
        className="absolute inset-0 z-[5] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
        }}
      />

      {/* Top nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5">
        <span className="text-white/90 text-lg font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
          Yiling Protocol
        </span>
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
            <span className="size-1.5 rounded-full bg-emerald-400 animate-livePulse" />
            Live on Base Sepolia
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
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:border-white/30 hover:shadow-[0_0_30px_rgba(82,39,255,0.3)] cursor-pointer"
          >
            Enter Markets
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="https://yiling-protocol-landing.vercel.app/docs/getting-started/quickstart"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 text-white/50 text-sm font-medium transition-colors hover:text-white/80"
          >
            Read the Docs
            <ExternalLink className="size-3.5" />
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 flex items-center gap-8 md:gap-12 animate-fadeUp stagger-4">
          {[
            { value: "0", label: "Oracles Needed" },
            { value: "7", label: "AI Agents" },
            { value: "Base", label: "Network" },
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
