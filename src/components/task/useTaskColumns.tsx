import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  isMetadataTask,
  metadataTaskLabel,
  taskDisplayName,
} from "@/lib/taskDisplay";
import { statusVisual, taskStatusLabel } from "@/lib/taskStatus";
import { clampPercent, formatBytes, formatEta } from "@/lib/utils.format";
import type { Aria2Task } from "@/types/aria2";

/**
 * Column definitions for the task table. Memoized on the language so the
 * polling-driven re-renders do not rebuild the array every second.
 *
 * Row actions (pause/resume/remove) live in the row context menu and the
 * batch toolbar — not in a permanent column.
 */
export function useTaskColumns() {
  const { t, i18n } = useTranslation();

  return useMemo<ColumnDef<Aria2Task>[]>(
    () => [
      {
        id: "select",
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label={t("Select all")}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
            aria-label={t("Select row")}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "files",
        enableHiding: false,
        header: t("Name"),
        enableSorting: false,
        cell: ({ row }) => {
          const task = row.original;
          const metadata = isMetadataTask(task);
          const isBt = task.bittorrent != null;
          const name = taskDisplayName(task, t("Unknown Task"));

          return (
            <div
              className="font-medium truncate max-w-[200px] md:max-w-md"
              title={name}
            >
              {metadata && (
                <span
                  className="mr-1.5 inline-flex items-center rounded bg-violet-500/10 px-1 py-px align-middle text-[10px] font-semibold text-violet-600 dark:text-violet-400"
                  title={t("Fetching torrent metadata via magnet")}
                >
                  MAGNET
                </span>
              )}
              {isBt && !metadata && (
                <span className="mr-1.5 inline-flex items-center rounded bg-primary/10 px-1 py-px align-middle text-[10px] font-semibold text-primary">
                  BT
                </span>
              )}
              {metadata ? (
                <code className="font-mono text-xs text-muted-foreground">
                  {metadataTaskLabel(task)}
                </code>
              ) : (
                name
              )}
              {task.files && task.files.length > 1 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  (+{task.files.length - 1})
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "totalLength",
        header: t("Size"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatBytes(Number(row.getValue("totalLength")))}
          </span>
        ),
      },
      {
        accessorKey: "completedLength",
        header: t("Progress"),
        cell: ({ row }) => {
          const total = Number(row.original.totalLength);
          const completed = Number(row.original.completedLength);
          const percent = clampPercent(
            total === 0 ? 0 : (completed / total) * 100,
          );
          return (
            <div className="flex items-center gap-2 min-w-[120px] whitespace-nowrap">
              <Progress
                value={percent}
                className="h-2 flex-1"
                indicatorClassName={statusVisual(row.original.status).barClass}
              />
              <span className="text-xs text-muted-foreground w-11 text-right tabular-nums">
                {percent.toFixed(1)}%
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "downloadSpeed",
        header: t("Speed"),
        cell: ({ row }) => {
          const down = Number(row.original.downloadSpeed);
          const up = Number(row.original.uploadSpeed);
          return (
            <div className="flex flex-col gap-0.5 text-xs tabular-nums leading-none whitespace-nowrap">
              <span className="flex items-center gap-1 text-green-600 dark:text-green-500">
                <ArrowDown className="h-3 w-3 shrink-0" />
                {down > 0 ? `${formatBytes(down)}/s` : "—"}
              </span>
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-500">
                <ArrowUp className="h-3 w-3 shrink-0" />
                {up > 0 ? `${formatBytes(up)}/s` : "—"}
              </span>
            </div>
          );
        },
      },
      {
        id: "eta",
        header: t("ETA"),
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.status !== "active") {
            return <span className="whitespace-nowrap">—</span>;
          }
          const total = Number(row.original.totalLength);
          const completed = Number(row.original.completedLength);
          const speed = Number(row.original.downloadSpeed);
          return speed > 0 ? (
            <span className="whitespace-nowrap tabular-nums">
              {formatEta((total - completed) / speed)}
            </span>
          ) : (
            <span className="whitespace-nowrap">—</span>
          );
        },
      },
      {
        accessorKey: "status",
        header: t("Status"),
        enableSorting: false,
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <Badge
              variant="outline"
              className={`whitespace-nowrap ${statusVisual(status).badgeClass}`}
            >
              {taskStatusLabel(status, i18n.language).label}
            </Badge>
          );
        },
      },
    ],
    [t, i18n.language],
  );
}
