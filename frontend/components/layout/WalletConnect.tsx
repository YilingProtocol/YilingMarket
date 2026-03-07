"use client";

import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { baseSepolia } from "@/lib/wagmi";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address, chainId: baseSepolia.id });

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
    const bal = balance ? (Number(balance.value) / 1e18).toFixed(1) : "0.0";
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="font-mono text-xs md:text-sm whitespace-nowrap tabular-nums cursor-default"
        >
          <span className="hidden sm:inline">{short}</span>
          <span className="sm:hidden">{address.slice(0, 4)}...{address.slice(-2)}</span>
          <span className="mx-1.5 text-border">|</span>
          <span>{bal} ETH</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => disconnect()}
          className="text-muted-foreground hover:text-destructive text-xs cursor-pointer"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      className="gap-2 cursor-pointer"
      onClick={() => {
        const connector = connectors[0];
        if (connector) connect({ connector });
      }}
    >
      <Wallet className="size-4" />
      <span>Connect Wallet</span>
    </Button>
  );
}
