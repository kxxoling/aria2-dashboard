import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { SpeedSample } from "@/lib/useSpeedHistory";
import { formatBytes } from "@/lib/utils.format";

const W = 560;
const H = 160;
const PAD = 8;

/**
 * Recent download/upload speed chart (dual-line SVG), rendered inside a small
 * popover anchored to the header rate pill. Purely front-end sampling — aria2
 * has no historical stats API; we chart the rolling buffer we collect.
 */
export function SpeedChart({
  samples,
  onClose,
  anchorRef,
}: {
  samples: SpeedSample[];
  onClose?: () => void;
  /** The element that toggles this popover; clicks on it must not be treated
   *  as "outside" — its own click handler already toggles, so honoring both
   *  mousedown-close and click-toggle would just re-open the chart. */
  anchorRef?: React.RefObject<HTMLElement | null>;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onClose) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose, anchorRef]);

  const max = Math.max(1, ...samples.map((s) => Math.max(s.down, s.up)));

  const points = (key: "down" | "up") => {
    if (samples.length < 2) return "";
    const step = (W - PAD * 2) / (samples.length - 1);
    return samples
      .map((s, i) => {
        const v = s[key];
        const x = PAD + i * step;
        const y = H - PAD - (v / max) * (H - PAD * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const last = samples.at(-1) ?? { down: 0, up: 0 };
  const peak = samples.reduce(
    (m, s) => ({ down: Math.max(m.down, s.down), up: Math.max(m.up, s.up) }),
    { down: 0, up: 0 },
  );
  const minutes = (samples.length / 60).toFixed(0);

  return (
    <div
      ref={ref}
      className="w-[calc(100vw-2rem)] max-w-[600px] rounded-lg border bg-popover p-3 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none"
    >
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-green-600 dark:text-green-500">
            <ArrowDown className="h-3 w-3" />
            {formatBytes(last.down)}/s
          </span>
          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-500">
            <ArrowUp className="h-3 w-3" />
            {formatBytes(last.up)}/s
          </span>
        </div>
        <span className="text-muted-foreground">
          {t("Recent {{minutes}} min · peak ↓{{down}} ↑{{up}}", {
            minutes,
            down: `${formatBytes(peak.down)}/s`,
            up: `${formatBytes(peak.up)}/s`,
          })}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-40 w-full bg-muted/30 rounded"
        preserveAspectRatio="none"
        role="img"
        aria-label={t("Global speed history")}
      >
        {/* horizontal guides at 25/50/75% */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD}
            x2={W - PAD}
            y1={H - PAD - f * (H - PAD * 2)}
            y2={H - PAD - f * (H - PAD * 2)}
            className="stroke-border"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}
        <polyline
          points={points("up")}
          fill="none"
          className="stroke-blue-500/80"
          strokeWidth="1.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={points("down")}
          fill="none"
          className="stroke-green-500"
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>-{minutes}min</span>
        <span>{formatBytes(max)}/s</span>
      </div>
    </div>
  );
}
