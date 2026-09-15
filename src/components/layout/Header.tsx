import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ListVideo } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { aria2Client } from "@/api/aria2";
import { SpeedChart } from "@/components/SpeedChart";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MAX_SPEED_SAMPLES, useSpeedHistory } from "@/lib/useSpeedHistory";
import { formatBytes } from "@/lib/utils.format";
import { useAppStore } from "@/store";

function Sparkline({
  samples,
  className,
}: {
  samples: number[];
  className: string;
}) {
  if (samples.length < 2) {
    return <div className={`h-6 w-16 ${className}`} aria-hidden />;
  }
  const max = Math.max(...samples, 1);
  const width = 64;
  const height = 24;
  const step = width / (MAX_SPEED_SAMPLES - 1);
  const offset = width - (samples.length - 1) * step;
  const points = samples
    .map(
      (v, i) =>
        `${(offset + i * step).toFixed(1)},${(height - (v / max) * (height - 2) - 1).toFixed(1)}`,
    )
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`h-6 w-16 ${className}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        stroke="currentColor"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function Header() {
  const { t } = useTranslation();
  const globalStatInterval = useAppStore((s) => s.settings.globalStatInterval);
  const { data: stats, isError } = useQuery({
    queryKey: ["globalStat"],
    queryFn: () => aria2Client.getGlobalStat(),
    refetchInterval: globalStatInterval,
  });

  const { samples, push } = useSpeedHistory();
  const [chartOpen, setChartOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (stats)
      push(Number(stats.downloadSpeed || 0), Number(stats.uploadSpeed || 0));
  }, [stats, push]);

  const activeCount = Number(stats?.numActive || 0);

  return (
    <header className="h-14 border-b bg-card flex items-center px-3 md:px-6 justify-between gap-2 md:gap-4 sticky top-0 z-10 transition-colors">
      <span className="font-semibold text-base md:text-lg tracking-tight truncate md:hidden">
        Aria2 Dashboard
      </span>

      <div className="flex items-center gap-2 md:gap-3 text-sm font-medium ml-auto">
        {/* Single stats pill: both rates side by side + active task count.
            The whole pill toggles the recent-speed chart (which plots both). */}
        <div className="relative">
          <button
            ref={pillRef}
            type="button"
            onClick={() => setChartOpen((v) => !v)}
            title={isError ? t("Disconnected") : t("Global speed history")}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-foreground/5 ${
              isError
                ? "bg-red-500/10 text-red-500"
                : "bg-green-500/10 text-green-600 dark:text-green-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                isError ? "bg-red-500" : "bg-green-500 animate-pulse"
              }`}
            />
            <span className="flex items-center gap-0.5 text-xs font-medium tabular-nums whitespace-nowrap">
              <ArrowDown className="h-3 w-3 shrink-0" aria-hidden="true" />
              {formatBytes(Number(stats?.downloadSpeed || 0))}/s
            </span>
            <span className="flex items-center gap-0.5 text-xs font-medium tabular-nums whitespace-nowrap text-blue-600 dark:text-blue-500">
              <ArrowUp className="h-3 w-3 shrink-0" aria-hidden="true" />
              {formatBytes(Number(stats?.uploadSpeed || 0))}/s
            </span>
            <Sparkline
              samples={samples.map((s) => s.down)}
              className={`hidden sm:block ${
                isError ? "text-red-400/60" : "text-green-500/70"
              }`}
            />
            <span className="mx-0.5 text-xs opacity-30 select-none">|</span>
            <ListVideo className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="text-xs tabular-nums">{activeCount}</span>
          </button>

          {chartOpen && (
            <div className="absolute right-0 top-9 z-50">
              <SpeedChart
                samples={samples}
                onClose={() => setChartOpen(false)}
                anchorRef={pillRef}
              />
            </div>
          )}
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}
