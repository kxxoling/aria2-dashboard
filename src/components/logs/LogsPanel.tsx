import { useQuery } from "@tanstack/react-query";
import { FileText, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  filterLogLines,
  LOG_LEVELS,
  type LogLevel,
  parseLog,
} from "@/lib/logParse";

const TAIL_OPTIONS = [200, 500, 2000, 0] as const;

const levelClass: Record<LogLevel, string> = {
  DEBUG: "text-muted-foreground/70",
  INFO: "text-blue-600 dark:text-blue-400",
  NOTICE: "text-foreground",
  WARN: "text-amber-600 dark:text-amber-400",
  ERROR: "text-red-600 dark:text-red-400",
};

/**
 * Fetches the aria2 log over the same origin (/aria2-log — provided by the
 * all-in-one image). Every other deployment (vite dev server, extension
 * origin, no reverse proxy) resolves to LOG_ENDPOINT_UNAVAILABLE so the
 * panel shows the explanatory card instead of a raw fetch error:
 * - network-level failure (extension scheme, CORS, nothing listening)
 * - 404
 * - a 200 text/html response — the SPA fallback of dev servers
 */
const LOG_ENDPOINT_UNAVAILABLE = "LOG_ENDPOINT_UNAVAILABLE";

async function fetchAria2Log(): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/aria2-log", { cache: "no-store" });
  } catch {
    throw new Error(LOG_ENDPOINT_UNAVAILABLE);
  }
  if (!res.ok) {
    throw new Error(
      res.status === 404 ? LOG_ENDPOINT_UNAVAILABLE : `HTTP ${res.status}`,
    );
  }
  if ((res.headers.get("content-type") ?? "").includes("text/html")) {
    throw new Error(LOG_ENDPOINT_UNAVAILABLE);
  }
  return res.text();
}

export function LogsPanel() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [tail, setTail] = useState<number>(500);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [levels, setLevels] = useState<Set<LogLevel>>(
    () => new Set(["DEBUG", "INFO", "NOTICE", "WARN", "ERROR"]),
  );
  const boxRef = useRef<HTMLDivElement>(null);

  // `isFetching` is deliberately not consumed: react-query tracks the props
  // a component reads, and watching fetch transitions would re-render (and
  // flash) the whole panel every poll cycle even when the log is unchanged.
  // Re-renders happen only on actual data/error changes. Polling also stops
  // while the endpoint is in an error state — hammering a dead endpoint
  // cannot recover it; the Retry button restarts it.
  const { data, error, refetch } = useQuery({
    queryKey: ["aria2Log"],
    queryFn: fetchAria2Log,
    refetchInterval: autoRefresh
      ? (query) => (query.state.error ? false : 5000)
      : false,
    retry: false,
  });

  // react-query clears `error` the moment a refetch starts, which would
  // unmount the card and flash an empty log view mid-retry. Remember the
  // last error during render and only let it go when data actually arrives.
  const lastErrorRef = useRef<Error | null>(null);
  if (error !== null) lastErrorRef.current = error as Error;
  const failed = lastErrorRef.current !== null && data === undefined;

  const handleManualRefresh = async () => {
    setManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setManualRefreshing(false);
    }
  };

  const lines = useMemo(() => {
    const parsed = parseLog(data ?? "");
    return tail > 0 ? parsed.slice(-tail) : parsed;
  }, [data, tail]);

  const filtered = useMemo(
    () => filterLogLines(lines, query, levels),
    [lines, query, levels],
  );

  // keep the view pinned to the newest lines while streaming
  // biome-ignore lint/correctness/useExhaustiveDependencies: `filtered` is the intended trigger — scroll on every new log batch
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [filtered]);

  const toggleLevel = (level: LogLevel) => {
    setLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  // First load in flight (no data, no error yet): render a skeleton instead
  // of the toolbar + empty log box, which would visibly flash before the
  // content lands. Once data exists it stays on screen across refetches.
  if (data === undefined && lastErrorRef.current === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 min-w-[180px] flex-1" />
          <Skeleton className="h-9 w-[220px]" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="h-[calc(100vh-320px)] min-h-[300px] space-y-2.5 rounded-lg border bg-card p-3">
          {[35, 52, 69, 86, 43, 60, 77, 94, 51, 68].map((width) => (
            <Skeleton
              key={width}
              className="h-3.5"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Gate on "errored AND never had data": during a manual refetch the
  // transient fetch state must not unmount the card (and flash an empty
  // log view) — it stays until a fetch actually succeeds.
  if (failed) {
    const unavailable =
      lastErrorRef.current?.message === LOG_ENDPOINT_UNAVAILABLE;
    return (
      <div className="space-y-3 rounded-lg border bg-card p-6 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {t("Logs unavailable here")}
        </div>
        <p className="text-muted-foreground">
          {unavailable
            ? t(
                "The built-in log view is provided by the all-in-one Docker image (nginx serves aria2's log file at /aria2-log). For other deployments, start aria2 with --log and expose the file through your reverse proxy.",
              )
            : `${t("logs.fetchFailed")} (${lastErrorRef.current?.message})`}
        </p>
        {/* No Retry in the unavailable case: this deployment has no log
            endpoint at all, so refetching can never succeed. */}
        {!unavailable && (
          <Button variant="outline" size="sm" onClick={handleManualRefresh}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {t("Retry")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("Search logs...")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 font-mono text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {LOG_LEVELS.map((level) => (
            <div
              key={level}
              className="flex cursor-pointer select-none items-center gap-1"
            >
              <Checkbox
                checked={levels.has(level)}
                onCheckedChange={() => toggleLevel(level)}
                aria-label={level}
                id={`log-level-${level}`}
              />
              <label
                htmlFor={`log-level-${level}`}
                className={`cursor-pointer font-mono text-[11px] font-semibold ${levelClass[level]}`}
              >
                {level}
              </label>
            </div>
          ))}
        </div>

        <select
          value={tail}
          onChange={(e) => setTail(Number(e.target.value))}
          aria-label={t("Lines")}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {TAIL_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n === 0
                ? t("All lines")
                : t("Last {{count}} lines", { count: n })}
            </option>
          ))}
        </select>

        <div className="flex cursor-pointer select-none items-center gap-1.5 text-sm text-muted-foreground">
          <Checkbox
            checked={autoRefresh}
            onCheckedChange={(v) => setAutoRefresh(!!v)}
            id="log-auto-refresh"
          />
          <label htmlFor="log-auto-refresh" className="cursor-pointer">
            {t("Auto refresh")}
          </label>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={manualRefreshing}
        >
          <RefreshCw
            className={`mr-1.5 h-3.5 w-3.5 ${manualRefreshing ? "animate-spin" : ""}`}
          />
          {t("Refresh")}
        </Button>
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>
          {t("{{count}} lines", { count: filtered.length })}
          {query.trim() || levels.size < LOG_LEVELS.length
            ? ` / ${lines.length}`
            : ""}
        </span>
        <Badge variant="outline" className="text-[10px]">
          aria2 /data/aria2.log
        </Badge>
      </div>

      <div
        ref={boxRef}
        className="h-[calc(100vh-320px)] min-h-[300px] overflow-auto rounded-lg border bg-card p-3 font-mono text-xs leading-relaxed"
      >
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {t("No matching log lines")}
          </p>
        ) : (
          filtered.map((line, i) => (
            <div
              key={`${line.time ?? i}-${line.raw.slice(-32)}`}
              className="flex gap-2 whitespace-pre-wrap break-all"
            >
              {line.time && (
                <span className="shrink-0 text-muted-foreground/60">
                  {line.time}
                </span>
              )}
              {line.level && (
                <span
                  className={`shrink-0 font-semibold ${levelClass[line.level]}`}
                >
                  [{line.level}]
                </span>
              )}
              <span>
                {line.source && (
                  <span className="text-muted-foreground/70">
                    [{line.source}]{" "}
                  </span>
                )}
                {line.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
