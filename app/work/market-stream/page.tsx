import type { Metadata } from "next";

import { MarketTerminal } from "@/components/terminal/MarketTerminal";
import { PerformanceBenchmarkPanel } from "@/components/terminal/PerformanceBenchmarkPanel";
import { ReliabilityPanel } from "@/components/terminal/ReliabilityPanel";

export const metadata: Metadata = {
  title: "MarketStream | Seiba Shonia",

  description:
    "A real-time market engineering terminal exploring streaming architecture, browser concurrency, resilience, and rendering performance.",

  alternates: {
    canonical: "https://seibashonia.dev/work/market-stream",
  },
};

export default function MarketStreamPage() {
  return (
    <div className="min-h-screen bg-[#06080c]">
      <MarketTerminal />

      <div className="mx-auto max-w-7xl space-y-6 px-5 pb-10 sm:px-8">
        <ReliabilityPanel />

        <PerformanceBenchmarkPanel />
      </div>
    </div>
  );
}
