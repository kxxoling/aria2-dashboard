import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { aria2Client } from "@/api/aria2";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { isTerminalStatus, statusVisual } from "@/lib/taskStatus";
import { clampPercent, formatBytes } from "@/lib/utils.format";
import type { Aria2TaskStatus } from "@/types/aria2";

export function FilesTab({
  gid,
  task,
}: {
  gid: string;
  task: Aria2TaskStatus;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const files = task.files ?? [];
  const multiFile = files.length > 1;
  const editable = multiFile && !isTerminalStatus(task.status);

  const serverSelected = useMemo(
    () =>
      new Set(files.filter((f) => f.selected === "true").map((f) => f.index)),
    [files],
  );

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(serverSelected),
  );

  // Re-seed the local selection when the server state refreshes
  useEffect(() => {
    setSelected(new Set(serverSelected));
  }, [serverSelected]);

  const selectMutation = useMutation({
    mutationFn: (indices: string[]) =>
      aria2Client.changeOption(gid, {
        "select-file": indices.join(","),
      }),
    onSuccess: async () => {
      toast.success(t("File selection updated"));
      await queryClient.invalidateQueries({ queryKey: ["taskStatus", gid] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dirty = useMemo(() => {
    if (serverSelected.size !== selected.size) return true;
    for (const index of selected) {
      if (!serverSelected.has(index)) return true;
    }
    return false;
  }, [serverSelected, selected]);

  return (
    <div className="space-y-3 pt-2">
      {multiFile && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {t("Select files to download")}
          </p>
          {editable && (
            <Button
              size="sm"
              disabled={!dirty || selectMutation.isPending}
              onClick={() => selectMutation.mutate([...selected])}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {t("Apply File Selection")}
            </Button>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        {files.map((file) => {
          const isSelected = selected.has(file.index);
          const percent = clampPercent(
            Number(file.length) === 0
              ? 0
              : (Number(file.completedLength) / Number(file.length)) * 100,
          );
          return (
            <div
              key={file.index}
              className={`rounded-md border p-2.5 ${isSelected || !multiFile ? "" : "opacity-50"}`}
            >
              <div className="flex items-center gap-2.5">
                {multiFile ? (
                  <Checkbox
                    checked={isSelected}
                    disabled={!editable}
                    onCheckedChange={(v) =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(file.index);
                        else next.delete(file.index);
                        return next;
                      })
                    }
                  />
                ) : null}
                <span className="min-w-0 flex-1 truncate text-sm">
                  {file.path.split("/").pop() || file.uris?.[0]?.uri || "?"}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBytes(Number(file.length))}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 pl-8">
                <Progress
                  value={percent}
                  className="h-1.5 flex-1"
                  indicatorClassName={statusVisual(task.status).barClass}
                />
                <span className="w-10 text-right text-[11px] text-muted-foreground">
                  {percent.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
