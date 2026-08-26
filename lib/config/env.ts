const marketWebSocketUrl = process.env.NEXT_PUBLIC_MARKET_WS_URL;

if (!marketWebSocketUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_MARKET_WS_URL. Define it in .env.local for local development or in the deployment environment.",
  );
}

let parsedMarketWebSocketUrl: URL;

try {
  parsedMarketWebSocketUrl = new URL(marketWebSocketUrl);
} catch {
  throw new Error("NEXT_PUBLIC_MARKET_WS_URL must be a valid WebSocket URL.");
}

if (parsedMarketWebSocketUrl.protocol !== "ws:" && parsedMarketWebSocketUrl.protocol !== "wss:") {
  throw new Error("NEXT_PUBLIC_MARKET_WS_URL must use the ws:// or wss:// protocol.");
}

export const env = {
  marketWebSocketUrl,
} as const;
