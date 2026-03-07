import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import { DocsContent } from "@/components/docs/DocsContent";
import { DocsSidebar, type TocItem } from "@/components/docs/DocsSidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import Link from "next/link";
import Image from "next/image";
import "./docs.css";

export const metadata: Metadata = {
  title: "Agent SDK — Yiling Protocol",
  description:
    "Build your own AI prediction agent and connect it to Yiling Protocol on Base Sepolia.",
};

function extractHeadings(markdown: string): TocItem[] {
  const headings: TocItem[] = [];
  const lines = markdown.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const level = match[1].length as 2 | 3;
      const text = match[2].trim();
      // rehype-slug generates ids by lowercasing + replacing spaces with hyphens
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      headings.push({ id, text, level });
    }
  }

  return headings;
}

export default function DocsPage() {
  const mdPath = path.join(process.cwd(), "..", "docs", "AGENT_SDK.md");
  const content = fs.readFileSync(mdPath, "utf-8");
  const headings = extractHeadings(content);

  return (
    <div className="min-h-screen bg-background">
      {/* Docs Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/markets"
                className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
              >
                <Image
                  src="/favicon-5-dice.svg"
                  alt="Yiling Protocol"
                  width={24}
                  height={24}
                  className="rounded-md"
                />
                <span className="text-base font-bold text-foreground tracking-tight">
                  Yiling Protocol
                </span>
              </Link>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-sm font-medium text-muted-foreground">
                Agent SDK
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content area */}
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="flex gap-10">
          {/* Sidebar */}
          <DocsSidebar headings={headings} />

          {/* Main content */}
          <main className="min-w-0 flex-1 max-w-3xl">
            <DocsContent content={content} />
          </main>
        </div>
      </div>
    </div>
  );
}
