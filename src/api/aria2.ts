import { resolveRpcUrl } from "@/api/rpcUrl";
import { useAppStore } from "@/store";
import type {
  Aria2GlobalStat,
  Aria2Peer,
  Aria2Request,
  Aria2Response,
  Aria2Task,
  Aria2TaskStatus,
} from "@/types/aria2";

type RpcConfig = { url: string; secret: string };

export { resolveRpcUrl, SAME_ORIGIN_RPC } from "@/api/rpcUrl";

function getUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts (e.g. plain HTTP on a LAN deployment)
  // where crypto.randomUUID is unavailable.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export class Aria2Client {
  private ws: WebSocket | null = null;
  private wsUrl: string | null = null;
  private messageCallbacks = new Map<string, (res: Aria2Response) => void>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;
  private isConnecting = false;
  private connectPromise: Promise<void> | null = null;

  private static instance: Aria2Client;

  public static getInstance() {
    if (!Aria2Client.instance) {
      Aria2Client.instance = new Aria2Client();
    }
    return Aria2Client.instance;
  }

  private isWebSocketUrl(url: string): boolean {
    const resolved = resolveRpcUrl(url);
    return resolved.startsWith("ws://") || resolved.startsWith("wss://");
  }

  private getHttpUrl(url: string): string {
    const resolved = resolveRpcUrl(url);
    if (resolved.startsWith("ws://"))
      return resolved.replace("ws://", "http://");
    if (resolved.startsWith("wss://"))
      return resolved.replace("wss://", "https://");
    return resolved;
  }

  private getConfig(override?: Partial<RpcConfig>): RpcConfig {
    const { rpcUrl, rpcSecret } = useAppStore.getState();
    return {
      url: override?.url ?? rpcUrl,
      secret: override?.secret ?? rpcSecret,
    };
  }

  /**
   * Open (or reuse) a WebSocket connection to the configured RPC url.
   * Resolves once the socket is open; rejects if it cannot be established.
   */
  public async connect(): Promise<void> {
    const url = resolveRpcUrl(this.getConfig().url);

    if (!this.isWebSocketUrl(url)) {
      this.disconnect();
      return;
    }

    // Drop any connection that points at a stale url.
    if (this.ws && this.wsUrl !== url) {
      this.disconnect();
    }

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) return;
    if (this.isConnecting && this.connectPromise) return this.connectPromise;

    this.isConnecting = true;
    const connectPromise = new Promise<void>((resolve, reject) => {
      try {
        const ws = new WebSocket(url);
        this.ws = ws;
        this.wsUrl = url;

        ws.onopen = () => {
          this.isConnected = true;
          this.isConnecting = false;
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data: Aria2Response = JSON.parse(event.data);
            if (data.id && this.messageCallbacks.has(data.id)) {
              this.messageCallbacks.get(data.id)?.(data);
              this.messageCallbacks.delete(data.id);
            }
          } catch (e) {
            console.error("Failed to parse Aria2 WS message", e);
          }
        };

        ws.onclose = () => {
          if (this.ws === ws) {
            this.isConnected = false;
            this.isConnecting = false;
            this.ws = null;
            this.rejectPendingCallbacks(new Error("Aria2 WebSocket closed"));
            this.scheduleReconnect();
          }
        };

        ws.onerror = () => {
          this.isConnecting = false;
          reject(new Error("Aria2 WebSocket error"));
        };
      } catch (err) {
        this.isConnecting = false;
        reject(err as Error);
      }
    });
    // Mark the rejection as handled for callers that fire-and-forget connect().
    connectPromise.catch(() => {});
    this.connectPromise = connectPromise;
    return connectPromise;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const { settings } = useAppStore.getState();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        // Reconnection failed; onclose/onerror already scheduled the next try.
      });
    }, settings.wsReconnectInterval);
  }

  private rejectPendingCallbacks(error: Error) {
    for (const callback of this.messageCallbacks.values()) {
      callback({
        jsonrpc: "2.0",
        id: "",
        error: { code: -1, message: error.message },
      });
    }
    this.messageCallbacks.clear();
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
    this.wsUrl = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.rejectPendingCallbacks(new Error("Aria2 WebSocket disconnected"));
  }

  public async call<T = unknown>(
    method: string,
    params: unknown[] = [],
    override?: Partial<RpcConfig>,
  ): Promise<T> {
    const { url, secret } = this.getConfig(override);
    const rpcUrl = resolveRpcUrl(url);
    const finalParams = secret ? [`token:${secret}`, ...params] : params;

    const id = getUuid();
    const req: Aria2Request = {
      jsonrpc: "2.0",
      id,
      method,
      params: finalParams,
    };

    if (this.isWebSocketUrl(rpcUrl)) {
      if (
        !this.ws ||
        this.ws.readyState !== WebSocket.OPEN ||
        this.wsUrl !== rpcUrl
      ) {
        // Best effort: fall back to HTTP below if the socket cannot open.
        await this.connect().catch(() => this.disconnect());
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        return new Promise<T>((resolve, reject) => {
          const timeout = setTimeout(() => {
            this.messageCallbacks.delete(id);
            reject(new Error("Aria2 WebSocket Timeout"));
          }, 15000);

          this.messageCallbacks.set(id, (res: Aria2Response) => {
            clearTimeout(timeout);
            if (res.error) reject(new Error(res.error.message));
            else resolve(res.result as T);
          });

          this.ws?.send(JSON.stringify(req));
        });
      }
    }

    const httpUrl = this.getHttpUrl(rpcUrl);
    try {
      const res = await fetch(httpUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data: Aria2Response<T> = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.result as T;
    } catch (err) {
      const error = err as Error;
      throw new Error(
        error.name === "TimeoutError" ? "Connection timeout" : error.message,
      );
    }
  }

  public async getGlobalStat(override?: Partial<RpcConfig>) {
    return this.call<Aria2GlobalStat>("aria2.getGlobalStat", [], override);
  }

  public async tellActive(keys?: string[]) {
    return this.call<Aria2Task[]>("aria2.tellActive", keys ? [keys] : []);
  }

  public async tellWaiting(offset: number, num: number, keys?: string[]) {
    return this.call<Aria2Task[]>("aria2.tellWaiting", [
      offset,
      num,
      ...(keys ? [keys] : []),
    ]);
  }

  public async tellStopped(offset: number, num: number, keys?: string[]) {
    return this.call<Aria2Task[]>("aria2.tellStopped", [
      offset,
      num,
      ...(keys ? [keys] : []),
    ]);
  }

  public async addUri(uris: string[], options?: unknown) {
    const params: unknown[] = [uris];
    if (options) params.push(options);
    return this.call<string>("aria2.addUri", params);
  }

  public async addTorrent(torrent: string, uris?: string[], options?: unknown) {
    const params: unknown[] = [torrent];
    if (uris && uris.length > 0) {
      params.push(uris);
    } else if (options) {
      params.push([]);
    }
    if (options) params.push(options);
    return this.call<string>("aria2.addTorrent", params);
  }

  public async remove(gid: string) {
    return this.call<string>("aria2.remove", [gid]);
  }

  public async pause(gid: string) {
    return this.call<string>("aria2.pause", [gid]);
  }

  public async unpause(gid: string) {
    return this.call<string>("aria2.unpause", [gid]);
  }

  public async pauseAll() {
    return this.call<string>("aria2.pauseAll");
  }

  public async unpauseAll() {
    return this.call<string>("aria2.unpauseAll");
  }

  public async purgeDownloadResult() {
    return this.call<string>("aria2.purgeDownloadResult");
  }

  public async getVersion() {
    return this.call<{ version: string }>("aria2.getVersion");
  }

  public async getGlobalOption() {
    return this.call<Record<string, string>>("aria2.getGlobalOption");
  }

  public async changeGlobalOption(options: Record<string, string>) {
    return this.call<string>("aria2.changeGlobalOption", [options]);
  }

  public async getOption(gid: string) {
    return this.call<Record<string, string>>("aria2.getOption", [gid]);
  }

  public async changeOption(gid: string, options: Record<string, string>) {
    return this.call<string>("aria2.changeOption", [gid, options]);
  }

  public async getPeers(gid: string) {
    return this.call<Aria2Peer[]>("aria2.getPeers", [gid]);
  }

  public async tellStatus(gid: string, keys?: string[]) {
    return this.call<Aria2TaskStatus>(
      "aria2.tellStatus",
      keys ? [gid, keys] : [gid],
    );
  }
}

export const aria2Client = Aria2Client.getInstance();
