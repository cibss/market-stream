import { MarketTerminal } from "@/components/terminal/MarketTerminal";
import { ReliabilityPanel } from "@/components/terminal/ReliabilityPanel";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#06080c]">
      <MarketTerminal />

      <div className="mx-auto max-w-7xl px-5 pb-10 sm:px-8">
        <ReliabilityPanel />
      </div>
    </div>
  );
}
