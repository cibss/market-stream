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

  /**
   * WebSocket close events are asynchronous.
   *
   * This lets us remember that a specific socket
   * was intentionally closed so its eventual
   * "close" event does not accidentally trigger
   * reconnection or another status update.
   */
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

    /**
     * A manual connect may happen while a delayed
     * reconnect is still scheduled.
     *
     * Cancel it so we never create two sockets.
     */
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);

      this.reconnectTimer = null;
    }

    this.shouldReconnect = true;

    /**
     * During the initial connection we emit:
     *
     * connecting → connected
     *
     * During automatic recovery, scheduleReconnect()
     * already changed the state to "reconnecting",
     * so there is no reason to emit it again here.
     */
    if (this.reconnectAttempt === 0) {
      this.options.onStatusChange?.("connecting");
    }

    const socket = new WebSocket(this.options.url);

    this.socket = socket;

    socket.addEventListener("open", () => {
      /**
       * An older socket may finish opening after
       * another socket has already replaced it.
       *
       * Never allow stale sockets to become active.
       */
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
      /**
       * Ignore data from sockets that are no longer
       * the active connection.
       */
      if (this.socket !== socket) {
        return;
      }

      if (typeof event.data !== "string") {
        return;
      }

      this.options.onMessage?.(event.data);
    });

    socket.addEventListener("error", () => {
      /**
       * An error from an old socket should never
       * affect the current connection state.
       */
      if (this.socket !== socket) {
        return;
      }

      this.options.onStatusChange?.("error");

      /**
       * The close event owns the reconnection flow.
       *
       * We only request that this connection closes.
       */
      if (
        socket.readyState === WebSocket.CONNECTING ||
        socket.readyState === WebSocket.OPEN
      ) {
        socket.close();
      }
    });

    socket.addEventListener("close", () => {
      /**
       * This socket was intentionally closed by us.
       *
       * Examples:
       * - user clicked Disconnect
       * - switching Live → Simulation
       * - React development cleanup
       *
       * No automatic reconnect should happen.
       */
      if (this.intentionallyClosedSockets.has(socket)) {
        this.intentionallyClosedSockets.delete(socket);

        if (this.socket === socket) {
          this.socket = null;
        }

        return;
      }

      /**
       * A stale socket may emit "close" after a
       * newer connection already exists.
       *
       * Ignore that event entirely.
       */
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

    /**
     * A manual disconnect starts a completely new
     * lifecycle. A future manual Connect should
     * therefore begin at "connecting", not
     * "reconnecting".
     */
    this.reconnectAttempt = 0;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);

      this.reconnectTimer = null;
    }

    const socket = this.socket;

    /**
     * Detach it as the active socket immediately.
     *
     * The actual browser "close" event may happen
     * a little later.
     */
    this.socket = null;

    /**
     * Application-level disconnect should feel
     * immediate to the UI.
     *
     * Lifecycle cleanup can opt out with:
     *
     * disconnect({ notify: false })
     */
    if (notify) {
      this.options.onStatusChange?.("disconnected");
    }

    if (!socket) {
      return;
    }

    /**
     * Suppress the eventual close event from
     * triggering another status update or reconnect.
     */
    this.intentionallyClosedSockets.add(socket);

    if (
      socket.readyState === WebSocket.CONNECTING ||
      socket.readyState === WebSocket.OPEN
    ) {
      socket.close();
    }
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) {
      return;
    }

    /**
     * Never schedule multiple reconnect timers.
     */
    if (this.reconnectTimer) {
      return;
    }

    this.options.onStatusChange?.("reconnecting");

    const delayMs = Math.min(1000 * 2 ** this.reconnectAttempt, 30_000);

    this.reconnectAttempt += 1;

    this.options.onReconnectScheduled?.(this.reconnectAttempt, delayMs);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;

      this.connect();
    }, delayMs);
  }
}
