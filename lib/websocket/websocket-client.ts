import type { ConnectionStatus } from "@/features/market/market.types";

type WebSocketClientOptions = {
  url: string;

  onOpen?: (socket: WebSocket) => void;

  onMessage?: (message: string) => void;

  onStatusChange?: (status: ConnectionStatus) => void;

  onReconnectScheduled?: (attempt: number, delayMs: number) => void;
};

export class WebSocketClient {
  private socket: WebSocket | null = null;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private reconnectAttempt = 0;

  private shouldReconnect = true;

  constructor(private readonly options: WebSocketClientOptions) {}

  connect() {
    const isAlreadyActive =
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING;

    if (isAlreadyActive) {
      return;
    }

    this.shouldReconnect = true;

    this.options.onStatusChange?.(
      this.reconnectAttempt > 0 ? "reconnecting" : "connecting",
    );

    const socket = new WebSocket(this.options.url);

    this.socket = socket;

    socket.addEventListener("open", () => {
      this.reconnectAttempt = 0;

      this.options.onStatusChange?.("connected");

      this.options.onOpen?.(socket);
    });

    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        return;
      }

      this.options.onMessage?.(event.data);
    });

    socket.addEventListener("error", () => {
      this.options.onStatusChange?.("error");

      // Closing will trigger the normal
      // reconnection flow through onclose.
      socket.close();
    });

    socket.addEventListener("close", () => {
      if (this.socket === socket) {
        this.socket = null;
      }

      if (!this.shouldReconnect) {
        this.options.onStatusChange?.("disconnected");

        return;
      }

      this.scheduleReconnect();
    });
  }

  disconnect() {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);

      this.reconnectTimer = null;
    }

    this.socket?.close();

    this.socket = null;

    this.options.onStatusChange?.("disconnected");
  }

  private scheduleReconnect() {
    this.options.onStatusChange?.("reconnecting");

    const delayMs = Math.min(1000 * 2 ** this.reconnectAttempt, 30_000);

    this.reconnectAttempt += 1;

    this.options.onReconnectScheduled?.(this.reconnectAttempt, delayMs);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delayMs);
  }
}
