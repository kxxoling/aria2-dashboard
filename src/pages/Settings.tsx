import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { LogsPanel } from "@/components/logs/LogsPanel";
import { InterfaceSettingsPanel } from "@/components/settings/InterfaceSettingsPanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type ConnectionType,
  parseRpcUrl,
  useAria2Connection,
} from "@/hooks/useAria2Connection";
import { Aria2SettingsPanel } from "@/pages/Aria2Settings";
import { useAppStore } from "@/store";

const SETTINGS_TABS = ["interface", "connection", "aria2", "logs"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];
const isSettingsTab = (value: string): value is SettingsTab =>
  (SETTINGS_TABS as readonly string[]).includes(value);

/**
 * Combined settings page: connection (local app) and aria2 (remote daemon)
 * live in tabs so the mobile bottom nav stays a three-slot layout. The
 * ?tab= search param selects the tab and stays in sync with it — the
 * sidebar and the dashboard error banner deep-link into specific tabs.
 */
export function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/settings" });
  const { tab } = useSearch({ from: "/settings" });
  const activeTab: SettingsTab =
    tab != null && isSettingsTab(tab) ? tab : "interface";

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">{t("Settings")}</h2>
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          navigate({
            search: { tab: isSettingsTab(value) ? value : "interface" },
            replace: true,
          })
        }
      >
        <TabsList className="flex-wrap">
          <TabsTrigger value="interface">{t("Interface")}</TabsTrigger>
          <TabsTrigger value="connection">
            {t("Connection Settings")}
          </TabsTrigger>
          <TabsTrigger value="aria2">{t("Aria2 Settings")}</TabsTrigger>
          <TabsTrigger value="logs">{t("Logs")}</TabsTrigger>
        </TabsList>
        <TabsContent value="connection">
          <ConnectionSettingsPanel />
        </TabsContent>
        <TabsContent value="interface">
          <InterfaceSettingsPanel />
        </TabsContent>
        <TabsContent value="aria2">
          <Aria2SettingsPanel />
        </TabsContent>
        <TabsContent value="logs">
          <LogsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConnectionSettingsPanel() {
  const { t } = useTranslation();
  const { rpcUrl, rpcSecret } = useAppStore();
  const { testConnection, isTesting, isSuccess, isIdle, saveConfig, reset } =
    useAria2Connection();

  const parsed = parseRpcUrl(rpcUrl);
  const [connectionType, setConnectionType] = useState<ConnectionType>(
    parsed.type,
  );
  const [ssl, setSsl] = useState(parsed.ssl);
  const [host, setHost] = useState(parsed.host);
  const [secret, setSecret] = useState(rpcSecret);

  const handleTest = async () => {
    if (!host) {
      toast.error(t("RPC URL is required"));
      return;
    }
    try {
      await testConnection({ connectionType, ssl, host, secret });
      toast.success(t("Connection successful"));
    } catch {
      toast.error(t("Connection failed"));
    }
  };

  const handleSave = () => {
    if (!host) {
      toast.error(t("RPC URL is required"));
      return;
    }
    saveConfig(connectionType, ssl, host, secret);
    reset();
    toast.success(t("Settings saved"));
  };

  const handleProtocolTabChange = (value: string) => {
    setConnectionType(value as ConnectionType);
    reset();
  };

  return (
    <div className="max-w-xl space-y-6 pt-2">
      {rpcUrl === "same-origin" && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
          {t(
            "Same-origin RPC is configured automatically by the all-in-one image. Saving changes here will override it.",
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("Connection Protocol")}</CardTitle>
          <CardDescription>
            {t("Configure Aria2 RPC connection settings")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={connectionType} onValueChange={handleProtocolTabChange}>
            <TabsList className="w-full">
              <TabsTrigger value="ws" className="flex-1">
                WebSocket
              </TabsTrigger>
              <TabsTrigger value="http" className="flex-1">
                HTTP
              </TabsTrigger>
            </TabsList>
            <TabsContent value="ws" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="rpc-url-ws">WebSocket URL</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground shrink-0 font-mono">
                    {ssl ? "wss://" : "ws://"}
                  </span>
                  <Input
                    id="rpc-url-ws"
                    value={host}
                    onChange={(e) => {
                      setHost(e.target.value);
                      reset();
                    }}
                    placeholder="localhost:6800/jsonrpc"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Checkbox
                      id="ssl-ws"
                      checked={ssl}
                      onCheckedChange={(v) => {
                        setSsl(!!v);
                        reset();
                      }}
                    />
                    <Label htmlFor="ssl-ws" className="cursor-pointer text-sm">
                      SSL
                    </Label>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="http" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="rpc-url-http">HTTP URL</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground shrink-0 font-mono">
                    {ssl ? "https://" : "http://"}
                  </span>
                  <Input
                    id="rpc-url-http"
                    value={host}
                    onChange={(e) => {
                      setHost(e.target.value);
                      reset();
                    }}
                    placeholder="localhost:6800/jsonrpc"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Checkbox
                      id="ssl-http"
                      checked={ssl}
                      onCheckedChange={(v) => {
                        setSsl(!!v);
                        reset();
                      }}
                    />
                    <Label
                      htmlFor="ssl-http"
                      className="cursor-pointer text-sm"
                    >
                      SSL
                    </Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="rpc-secret">{t("Secret")}</Label>
            <Input
              id="rpc-secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              type="password"
              placeholder="••••••••"
            />
          </div>

          {!isIdle && (
            <div
              className={`flex items-center gap-2 text-sm ${isSuccess ? "text-green-600" : "text-red-600"}`}
            >
              <div
                className={`w-2 h-2 rounded-full ${isSuccess ? "bg-green-500" : "bg-red-500"}`}
              />
              {isSuccess ? t("Connected") : t("Disconnected")}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave}>{t("Save")}</Button>
            <Button variant="outline" onClick={handleTest} disabled={isTesting}>
              {isTesting ? t("Loading...") : t("Test Connection")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
