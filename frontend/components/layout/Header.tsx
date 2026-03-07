"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { WalletConnect } from "./WalletConnect";
import { Fuel, Zap, BookOpen, ExternalLink } from "lucide-react";

interface HeaderProps {
  gasPrice: string;
  isConnected: boolean;
  isConnecting: boolean;
  onCreateMarket?: () => void;
}

export function Header({ gasPrice, isConnected, isConnecting, onCreateMarket }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 safe-top">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/markets"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80 cursor-pointer"
          >
            <Image
              src="/favicon-5-dice.svg"
              alt="Yiling Protocol"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="text-lg font-bold text-foreground tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              Yiling Protocol
            </span>
          </Link>

          {/* Center: Navigation + Status (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href="https://yiling-protocol-landing.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mr-1"
            >
              Protocol
              <ExternalLink className="size-3" />
            </a>
            <Link
              href="/docs"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mr-1"
            >
              <BookOpen className="size-3.5" />
              Docs
            </Link>
            <Badge
              variant="secondary"
              className="font-mono text-xs px-3 py-1.5 tabular-nums gap-1.5"
            >
              <Fuel className="size-3 text-muted-foreground" />
              {gasPrice !== "--" ? gasPrice : "—"}
            </Badge>
            <Badge variant="secondary" className="text-xs px-3 py-1.5 gap-1.5">
              <Zap className="size-3 text-muted-foreground" />
              Base
            </Badge>
            <div
              className={`size-2 rounded-full transition-colors ${
                isConnected
                  ? "bg-accent animate-livePulse"
                  : isConnecting
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-muted-foreground/50"
              }`}
              title={
                isConnected
                  ? "Connected"
                  : isConnecting
                  ? "Connecting..."
                  : "Disconnected"
              }
            />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 md:gap-2.5">
            <ThemeToggle />
            {onCreateMarket && (
              <Button
                className="bg-primary text-primary-foreground transition-shadow hover:shadow-[0_0_16px_var(--color-glow-primary)] cursor-pointer"
                onClick={onCreateMarket}
              >
                <span className="hidden sm:inline">Create Market</span>
                <span className="sm:hidden">Create</span>
              </Button>
            )}
            <WalletConnect />
          </div>
        </div>

        {/* Mobile: Network Status */}
        <div className="flex md:hidden items-center gap-2 mt-2.5 pb-0.5">
          <a
            href="https://yiling-protocol-landing.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Badge variant="secondary" className="text-xs px-2.5 py-1 gap-1.5 cursor-pointer hover:bg-secondary/80 transition-colors">
              Protocol
              <ExternalLink className="size-3" />
            </Badge>
          </a>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1"
          >
            <Badge variant="secondary" className="text-xs px-2.5 py-1 gap-1.5 cursor-pointer hover:bg-secondary/80 transition-colors">
              <BookOpen className="size-3 text-muted-foreground" />
              Docs
            </Badge>
          </Link>
          <Badge
            variant="secondary"
            className="font-mono text-xs px-2.5 py-1 tabular-nums gap-1.5"
          >
            <Fuel className="size-3 text-muted-foreground" />
            {gasPrice !== "--" ? gasPrice : "—"}
          </Badge>
          <Badge variant="secondary" className="text-xs px-2.5 py-1 gap-1.5">
            <Zap className="size-3 text-muted-foreground" />
            Base
          </Badge>
          <div
            className={`size-2 rounded-full ${
              isConnected
                ? "bg-accent animate-livePulse"
                : isConnecting
                ? "bg-yellow-500 animate-pulse"
                : "bg-muted-foreground/50"
            }`}
          />
        </div>
      </div>
    </header>
  );
}
