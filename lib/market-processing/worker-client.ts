import type { MarketTicker, ProcessedMarketBatch } from "@/features/market/market.types";

type WorkerResponse = {
  type: "processed";

  id: number;

  result: ProcessedMarketBatch;
};

type PendingRequest = {
  resolve: (result: ProcessedMarketBatch) => void;

  reject: (error: Error) => void;
};

export class MarketWorkerClient {
  private worker: Worker;

  private nextRequestId = 0;

  private pending = new Map<number, PendingRequest>();

  constructor() {
    this.worker = new Worker(new URL("../../workers/market.worker.ts", import.meta.url), {
      type: "module",
    });

    this.worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
      const { id, result } = event.data;

      const request = this.pending.get(id);

      if (!request) {
        return;
      }

      request.resolve(result);

      this.pending.delete(id);
    });

    this.worker.addEventListener("error", () => {
      const error = new Error("Market worker failed");

      for (const request of this.pending.values()) {
        request.reject(error);
      }

      this.pending.clear();
    });
  }

  process(batch: MarketTicker[]): Promise<ProcessedMarketBatch> {
    const id = this.nextRequestId++;

    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve,
        reject,
      });

      this.worker.postMessage({
        type: "process",
        id,
        batch,
      });
    });
  }

  reset() {
    this.worker.postMessage({
      type: "reset",
    });
  }

  terminate() {
    this.worker.terminate();

    this.pending.clear();
  }
}
