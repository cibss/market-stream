import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

process.env.NEXT_PUBLIC_MARKET_WS_URL ??= "wss://example.invalid";

afterEach(() => {
  cleanup();
});
