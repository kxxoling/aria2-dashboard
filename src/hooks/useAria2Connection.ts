import { useMutation } from "@tanstack/react-query";
import { aria2Client } from "@/api/aria2";
import { useAppStore } from "@/store";

export type ConnectionType = "ws" | "http";

export function parseRpcUrl(url: string) {
  if (url.startsWith("wss://"))
    return { type: "ws" as ConnectionType, ssl: true, host: url.slice(6) };
  if (url.startsWith("ws://"))
    return { type: "ws" as ConnectionType, ssl: false, host: url.slice(5) };
  if (url.startsWith("https://"))
    return { type: "http" as ConnectionType, ssl: true, host: url.slice(8) };
  if (url.startsWith("http://"))
    return { type: "http" as ConnectionType, ssl: false, host: url.slice(7) };
  return { type: "ws" as ConnectionType, ssl: false, host: url };
}

export function buildRpcUrl(
  connectionType: ConnectionType,
  ssl: boolean,
  host: string,
) {
  const scheme =
    connectionType === "ws"
      ? ssl
        ? "wss://"
        : "ws://"
      : ssl
        ? "https://"
        : "http://";
  return scheme + host;
}

export function useAria2Connection() {
  const { setRpcConfig } = useAppStore();

  const testMutation = useMutation({
    mutationFn: async ({
      connectionType,
      ssl,
      host,
      secret,
    }: {
      connectionType: ConnectionType;
      ssl: boolean;
      host: string;
      secret: string;
    }) => {
      const url = buildRpcUrl(connectionType, ssl, host);
      // Test against the candidate config without persisting it —
      // saving happens only when the user clicks Save.
      await aria2Client.getGlobalStat({ url, secret });
      return url;
    },
  });

  const saveConfig = (
    connectionType: ConnectionType,
    ssl: boolean,
    host: string,
    secret: string,
  ) => {
    const url = buildRpcUrl(connectionType, ssl, host);
    setRpcConfig(url, secret);
  };

  return {
    testConnection: testMutation.mutateAsync,
    isTesting: testMutation.isPending,
    testError: testMutation.error,
    isSuccess: testMutation.isSuccess,
    isIdle: testMutation.isIdle,
    saveConfig,
    reset: testMutation.reset,
  };
}
