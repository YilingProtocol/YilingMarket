"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { WalletConnect } from "./WalletConnect";
import { ChainSwitcher } from "./ChainSwitcher";
import { ExternalLink, Plus } from "lucide-react";

interface HeaderProps {
  gasPrice: string;
  isConnected: boolean;
  isConnecting: boolean;
  onCreateMarket?: () => void;
}

export function Header({ gasPrice, isConnected, isConnecting, onCreateMarket }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 safe-top">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link
              href="/markets"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-80 cursor-pointer"
            >
              <Image
                src="/logo.svg"
                alt="Yiling Market"
                width={70}
                height={70}
              />
              <span className="text-base font-semibold text-foreground tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                Yiling Market
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <a
                href="https://yilingprotocol.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                Protocol
                <ExternalLink className="size-2.5 opacity-40" />
              </a>
              <Link
                href="/docs"
                className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Docs
              </Link>
              <Link
                href="/guide"
                className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Create Guide
              </Link>
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <ChainSwitcher />
            <ThemeToggle />
            {onCreateMarket && (
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer gap-1.5 rounded-lg"
                onClick={onCreateMarket}
              >
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">Create Market</span>
                <span className="sm:hidden">Create</span>
              </Button>
            )}
            <WalletConnect />
          </div>
        </div>
      </div>

      {/* Subtle bottom border */}
      <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
    </header>
  );
}
