import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ConnectionStatus } from "@/features/market/market.types";

import { WebSocketClient } from "@/lib/websocket/websocket-client";

class MockWebSocket extends EventTarget {
  static readonly CONNECTING = 0;

  static readonly OPEN = 1;

  static readonly CLOSING = 2;

  static readonly CLOSED = 3;

  static instances: MockWebSocket[] = [];

  readonly url: string;

  readyState = MockWebSocket.CONNECTING;

  send = vi.fn();

  constructor(url: string | URL) {
    super();

    this.url = url.toString();

    MockWebSocket.instances.push(this);
  }

  open() {
    this.readyState = MockWebSocket.OPEN;

    this.dispatchEvent(new Event("open"));
  }

  receive(message: string) {
    this.dispatchEvent(
      new MessageEvent("message", {
        data: message,
      }),
    );
  }

  close() {
    if (this.readyState === MockWebSocket.CLOSED) {
      return;
    }

    this.readyState = MockWebSocket.CLOSED;

    this.dispatchEvent(
      new CloseEvent("close", {
        code: 1000,
      }),
    );
  }

  failUnexpectedly() {
    this.readyState = MockWebSocket.CLOSED;

    this.dispatchEvent(
      new CloseEvent("close", {
        code: 1006,
      }),
    );
  }
}

describe("WebSocketClient", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];

    vi.useFakeTimers();

    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();

    vi.unstubAllGlobals();
  });

  it("moves from connecting to connected", () => {
    const statuses: ConnectionStatus[] = [];

    const client = new WebSocketClient({
      url: "wss://example.test",

      onStatusChange: (status) => {
        statuses.push(status);
      },
    });

    client.connect();

    expect(statuses).toEqual(["connecting"]);

    const socket = MockWebSocket.instances[0];

    socket.open();

    expect(statuses).toEqual(["connecting", "connected"]);
  });

  it("can teardown silently", () => {
    const statuses: ConnectionStatus[] = [];

    const client = new WebSocketClient({
      url: "wss://example.test",

      onStatusChange: (status) => {
        statuses.push(status);
      },
    });

    client.connect();

    const socket = MockWebSocket.instances[0];

    socket.open();

    client.disconnect({
      notify: false,
    });

    expect(statuses).toEqual(["connecting", "connected"]);
  });

  it("schedules reconnect after an unexpected close", async () => {
    const statuses: ConnectionStatus[] = [];

    const client = new WebSocketClient({
      url: "wss://example.test",

      onStatusChange: (status) => {
        statuses.push(status);
      },
    });

    client.connect();

    const firstSocket = MockWebSocket.instances[0];

    firstSocket.open();

    firstSocket.failUnexpectedly();

    expect(statuses.at(-1)).toBe("reconnecting");

    expect(MockWebSocket.instances).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1000);

    expect(MockWebSocket.instances).toHaveLength(2);

    MockWebSocket.instances[1].open();

    expect(statuses.at(-1)).toBe("connected");
  });
});
