import { Link } from "@tanstack/react-router";
import type { RowSelectionState, SortingState } from "@tanstack/react-table";
import { flexRender, useReactTable } from "@tanstack/react-table";
import {
  Info,
  ListOrdered,
  Pause,
  Play,
  Search,
  Trash2,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { aria2Client } from "@/api/aria2";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { TaskDetailDialog } from "@/components/task/detail/TaskDetailDialog";
import { getDashboardFeatures } from "@/components/task/tableFeatures";
import {
  TASK_NAME_COLUMN_ID,
  useTaskColumns,
} from "@/components/task/useTaskColumns";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type TaskTab, useTasks } from "@/hooks/useTasks";
import { taskDisplayName } from "@/lib/taskDisplay";
import { useAppStore } from "@/store";

const emptyKey: Record<TaskTab, string> = {
  all: "No tasks",
  active: "No active tasks",
  waiting: "No waiting tasks",
  stopped: "No stopped tasks",
};

export function Dashboard() {
  const { t } = useTranslation();
  const { tasksMap, loadingMap, errorActive } = useTasks();
  const [tab, setTab] = useState<TaskTab>("active");
  const [selectedGid, setSelectedGid] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const taskSorting = useAppStore((s) => s.taskSorting);
  const setTaskSorting = useAppStore((s) => s.setTaskSorting);
  const confirmTaskRemoval = useAppStore((s) => s.settings.confirmTaskRemoval);
  const [pendingRemoval, setPendingRemoval] = useState<{
    gids: string[];
    label: string;
  } | null>(null);
  const [sorting, setSorting] = useState<SortingState>(
    () => (taskSorting[tab] ?? []) as SortingState,
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const taskColumnVisibility = useAppStore((s) => s.taskColumnVisibility);
  const setTaskColumnVisibility = useAppStore((s) => s.setTaskColumnVisibility);

  // Restore the persisted sort when the tab changes
  useEffect(() => {
    setSorting((taskSorting[tab] ?? []) as SortingState);
  }, [tab, taskSorting]);

  const columns = useTaskColumns();

  const data = useMemo(() => {
    const tasks = tasksMap[tab] ?? [];
    if (!searchQuery.trim()) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter((task) => {
      const fileName =
        task.files?.[0]?.path?.split("/").pop()?.toLowerCase() || "";
      return (
        fileName.includes(query) ||
        task.gid.toLowerCase().includes(query) ||
        task.dir?.toLowerCase().includes(query)
      );
    });
  }, [tasksMap, tab, searchQuery]);

  const table = useReactTable({
    ...getDashboardFeatures(),
    data,
    columns,
    // Polling refreshes the data array; the table must not treat every
    // refresh as a reset — auto-resets re-dispatch state from a microtask
    // and, combined with a per-render `data` reference, render-loop forever.
    autoResetAll: false,
    // Polling re-creates the task array every second; identify rows by gid so
    // selections do not drift onto the wrong task when the list shifts.
    getRowId: (row) => row.gid,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(next);
      setTaskSorting(tab, next as Array<{ id: string; desc: boolean }>);
    },
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: (updater) =>
      setTaskColumnVisibility(
        typeof updater === "function"
          ? updater(table.getState().columnVisibility)
          : updater,
      ),
    state: {
      sorting,
      rowSelection,
      columnVisibility: taskColumnVisibility,
    },
    enableRowSelection: true,
  });

  const selectedGids = table
    .getSelectedRowModel()
    .rows.map((row) => row.original.gid);

  const runBatch = async (
    action: (gid: string) => Promise<unknown>,
    messageKey: string,
  ) => {
    try {
      await Promise.all(selectedGids.map(action));
      toast.success(t(messageKey, { count: selectedGids.length }));
      setRowSelection({});
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const tabs: { key: TaskTab; label: string }[] = [
    { key: "all", label: t("All Tasks") },
    { key: "active", label: t("Active Tasks") },
    { key: "waiting", label: t("Waiting Tasks") },
    { key: "stopped", label: t("Stopped Tasks") },
  ];

  const columnLabels: Record<string, string> = {
    totalLength: t("Size"),
    completedLength: t("Progress"),
    downloadSpeed: t("Speed"),
    eta: t("ETA"),
    status: t("Status"),
  };

  return (
    <div className="space-y-4">
      {errorActive && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>{t("Cannot connect to Aria2. Check your settings.")}</span>
          <Link
            to="/settings"
            search={{ tab: "connection" }}
            className="ml-auto underline underline-offset-2"
          >
            {t("Settings")}
          </Link>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{t("Tasks")}</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ListOrdered className="w-4 h-4" />
              {t("Global Actions")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                aria2Client
                  .pauseAll()
                  .then(() => toast.success(t("Pause All")))
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              <Pause className="w-4 h-4 mr-2" />
              {t("Pause All")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                aria2Client
                  .unpauseAll()
                  .then(() => toast.success(t("Resume All")))
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              <Play className="w-4 h-4 mr-2" />
              {t("Resume All")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                aria2Client
                  .purgeDownloadResult()
                  .then(() => toast.success(t("Clear Finished")))
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("Clear Finished")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("Search tasks...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {selectedGids.length > 0 && (
          <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                runBatch(
                  (gid) => aria2Client.pause(gid),
                  "Paused {{count}} tasks",
                )
              }
            >
              {t("Pause")} ({selectedGids.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                runBatch(
                  (gid) => aria2Client.unpause(gid),
                  "Resumed {{count}} tasks",
                )
              }
            >
              {t("Resume")} ({selectedGids.length})
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                confirmTaskRemoval
                  ? setPendingRemoval({
                      gids: selectedGids,
                      label: String(selectedGids.length),
                    })
                  : runBatch(
                      (gid) => aria2Client.remove(gid),
                      "Removed {{count}} tasks",
                    )
              }
            >
              {t("Remove")} ({selectedGids.length})
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            type="button"
            onClick={() => setTab(tabItem.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === tabItem.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tabItem.label}
            {tasksMap[tabItem.key] && (
              <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {tasksMap[tabItem.key]?.length ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task Table — keyed by tab so switching lists plays a short fade;
          per-second polling does not change the key, so rows stay stable */}
      <div
        key={tab}
        className="rounded-md border bg-card animate-in fade-in duration-150 motion-reduce:animate-none"
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <ContextMenu key={headerGroup.id}>
                <ContextMenuTrigger asChild>
                  <TableRow>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={
                          header.column.getCanSort()
                            ? "cursor-pointer select-none"
                            : ""
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex items-center gap-1">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {{
                              asc: " ↑",
                              desc: " ↓",
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuLabel>{t("Columns")}</ContextMenuLabel>
                  {table
                    .getAllLeafColumns()
                    .filter((col) => col.getCanHide())
                    .map((col) => (
                      <ContextMenuCheckboxItem
                        key={col.id}
                        checked={col.getIsVisible()}
                        onCheckedChange={(v) => col.toggleVisibility(!!v)}
                      >
                        {columnLabels[col.id] ?? col.id}
                      </ContextMenuCheckboxItem>
                    ))}
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </TableHeader>
          <TableBody>
            {loadingMap[tab] ? (
              ["a", "b", "c", "d", "e"].map((key) => (
                <TableRow key={key}>
                  {[
                    "h-4 w-4",
                    "h-4 w-[200px]",
                    "h-4 w-[60px]",
                    "h-4 w-[100px]",
                    "h-6 w-[52px]",
                    "h-4 w-[50px]",
                    "h-6 w-[60px] rounded-full",
                  ].map((cls) => (
                    <TableCell key={cls}>
                      <Skeleton className={cls} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <ContextMenu key={row.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow>
                      {row.getVisibleCells().map((cell) => {
                        // Details open from the task-name cell only, so
                        // clicking progress/size/speed values does nothing.
                        const isNameCell =
                          cell.column.id === TASK_NAME_COLUMN_ID;
                        return (
                          <TableCell
                            key={cell.id}
                            className={
                              isNameCell ? "cursor-pointer" : undefined
                            }
                            onClick={
                              isNameCell
                                ? () => setSelectedGid(row.original.gid)
                                : undefined
                            }
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() => setSelectedGid(row.original.gid)}
                    >
                      <Info className="h-4 w-4" />
                      {t("Task Details")}
                    </ContextMenuItem>
                    {row.original.status === "active" && (
                      <ContextMenuItem
                        onClick={() =>
                          aria2Client
                            .pause(row.original.gid)
                            .catch((e: Error) => toast.error(e.message))
                        }
                      >
                        <Pause className="h-4 w-4" />
                        {t("Pause")}
                      </ContextMenuItem>
                    )}
                    {(row.original.status === "paused" ||
                      row.original.status === "waiting") && (
                      <ContextMenuItem
                        onClick={() =>
                          aria2Client
                            .unpause(row.original.gid)
                            .catch((e: Error) => toast.error(e.message))
                        }
                      >
                        <Play className="h-4 w-4" />
                        {t("Resume")}
                      </ContextMenuItem>
                    )}
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() =>
                        confirmTaskRemoval
                          ? setPendingRemoval({
                              gids: [row.original.gid],
                              label: taskDisplayName(
                                row.original,
                                t("Unknown Task"),
                              ),
                            })
                          : aria2Client
                              .remove(row.original.gid)
                              .catch((e: Error) => toast.error(e.message))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("Remove")}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState message={t(emptyKey[tab])} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title={t("Remove task?")}
        description={t(
          "{{label}} and its progress will be removed from the list",
          { label: pendingRemoval?.label ?? "" },
        )}
        confirmLabel={t("Remove")}
        onConfirm={() =>
          runBatch((gid) => aria2Client.remove(gid), "Removed {{count}} tasks")
        }
      />

      <TaskDetailDialog
        gid={selectedGid}
        open={selectedGid !== null}
        onOpenChange={(open) => !open && setSelectedGid(null)}
        onNavigateGid={setSelectedGid}
      />
    </div>
  );
}
