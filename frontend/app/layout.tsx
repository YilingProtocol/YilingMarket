import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";

export const metadata: Metadata = {
  title: "Yiling Market — Oracle-Free Prediction Market",
  description: "Oracle-Free Self-Resolving Prediction Market powered by AI Agents",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
