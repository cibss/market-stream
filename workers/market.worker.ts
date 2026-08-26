import type { MarketTicker, ProcessedMarketBatch } from "../features/market/market.types";
import { MarketAnalyticsEngine } from "../lib/market-processing/analytics-engine";

type WorkerRequest =
  | {
      type: "process";

      id: number;

      batch: MarketTicker[];
    }
  | {
      type: "reset";
    };

type WorkerResponse = {
  type: "processed";

  id: number;

  result: ProcessedMarketBatch;
};

const engine = new MarketAnalyticsEngine();

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  if (message.type === "reset") {
    engine.reset();

    return;
  }

  const result = engine.process(message.batch);

  const response: WorkerResponse = {
    type: "processed",

    id: message.id,

    result,
  };

  self.postMessage(response);
});
