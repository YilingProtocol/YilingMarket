"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";
import { ChainProvider } from "@/lib/chainContext";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <WagmiProvider config={config} reconnectOnMount>
        <QueryClientProvider client={queryClient}>
          <ChainProvider>
            {children}
          </ChainProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
