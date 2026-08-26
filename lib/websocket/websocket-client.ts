import type { ConnectionStatus } from "@/features/market/market.types";

type WebSocketClientOptions = {
  url: string;

  onOpen?: (socket: WebSocket) => void;

  onMessage?: (message: string) => void;

  onStatusChange?: (status: ConnectionStatus) => void;

  onReconnectScheduled?: (attempt: number, delayMs: number) => void;
};

type DisconnectOptions = {
  notify?: boolean;
};

export class WebSocketClient {
  private socket: WebSocket | null = null;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private reconnectAttempt = 0;

  private shouldReconnect = true;

  private readonly intentionallyClosedSockets = new WeakSet<WebSocket>();

  constructor(private readonly options: WebSocketClientOptions) {}

  connect() {
    const currentSocket = this.socket;

    const isAlreadyActive =
      currentSocket?.readyState === WebSocket.CONNECTING ||
      currentSocket?.readyState === WebSocket.OPEN ||
      currentSocket?.readyState === WebSocket.CLOSING;

    if (isAlreadyActive) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);

      this.reconnectTimer = null;
    }

    this.shouldReconnect = true;

    if (this.reconnectAttempt === 0) {
      this.options.onStatusChange?.("connecting");
    }

    const socket = new WebSocket(this.options.url);

    this.socket = socket;

    socket.addEventListener("open", () => {
      if (this.socket !== socket) {
        this.intentionallyClosedSockets.add(socket);

        socket.close();

        return;
      }

      this.reconnectAttempt = 0;

      this.options.onStatusChange?.("connected");

      this.options.onOpen?.(socket);
    });

    socket.addEventListener("message", (event) => {
      if (this.socket !== socket) {
        return;
      }

      if (typeof event.data !== "string") {
        return;
      }

      this.options.onMessage?.(event.data);
    });

    socket.addEventListener("error", () => {
      if (this.socket !== socket) {
        return;
      }

      this.options.onStatusChange?.("error");

      if (
        socket.readyState === WebSocket.CONNECTING ||
        socket.readyState === WebSocket.OPEN
      ) {
        socket.close();
      }
    });

    socket.addEventListener("close", () => {
      if (this.intentionallyClosedSockets.has(socket)) {
        this.intentionallyClosedSockets.delete(socket);

        if (this.socket === socket) {
          this.socket = null;
        }

        return;
      }

      if (this.socket !== socket) {
        return;
      }

      this.socket = null;

      if (!this.shouldReconnect) {
        this.options.onStatusChange?.("disconnected");

        return;
      }

      this.scheduleReconnect();
    });
  }

  disconnect({ notify = true }: DisconnectOptions = {}) {
    this.shouldReconnect = false;

    this.reconnectAttempt = 0;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);

      this.reconnectTimer = null;
    }

    const socket = this.socket;

    this.socket = null;

    if (notify) {
      this.options.onStatusChange?.("disconnected");
    }

    if (!socket) {
      return;
    }

    this.intentionallyClosedSockets.add(socket);

    if (
      socket.readyState === WebSocket.CONNECTING ||
      socket.readyState === WebSocket.OPEN
    ) {
      socket.close();
    }
  }

  /**
   * Reliability lab only.
   *
   * Closes the active transport
   * WITHOUT marking it as an
   * intentional disconnect.
   *
   * Therefore the normal close
   * handler will execute the
   * reconnect strategy.
   */
  simulateFailure() {
    this.shouldReconnect = true;

    const socket = this.socket;

    if (!socket) {
      this.scheduleReconnect();

      return;
    }

    if (
      socket.readyState === WebSocket.CONNECTING ||
      socket.readyState === WebSocket.OPEN
    ) {
      socket.close();
    }
  }

  /**
   * Controlled connection restart.
   *
   * The old socket is intentionally
   * torn down silently and a fresh
   * connection lifecycle begins.
   */
  restart() {
    this.disconnect({
      notify: false,
    });

    this.connect();
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) {
      return;
    }

    if (this.reconnectTimer) {
      return;
    }

    this.options.onStatusChange?.("reconnecting");

    const delayMs = Math.min(
      1000 * 2 ** this.reconnectAttempt,

      30_000,
    );

    this.reconnectAttempt += 1;

    this.options.onReconnectScheduled?.(this.reconnectAttempt, delayMs);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;

      this.connect();
    }, delayMs);
  }
}
