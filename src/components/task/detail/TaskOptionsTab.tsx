import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { aria2Client } from "@/api/aria2";
import { OptionField } from "@/components/settings/OptionField";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { aria2Options } from "@/config/aria2Options";

export function TaskOptionsTab({
  gid,
  status,
}: {
  gid: string;
  status: string;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const editable = status === "waiting" || status === "paused";
  const [edits, setEdits] = useState<Record<string, string>>({});

  const { data: options, isLoading } = useQuery({
    queryKey: ["taskOption", gid],
    queryFn: () => aria2Client.getOption(gid),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const defs = useMemo(
    () => aria2Options.filter((o) => o.showIn?.includes("task-option")),
    [],
  );

  const dirtyKeys = useMemo(
    () =>
      Object.entries(edits)
        .filter(([key, value]) => (options?.[key] ?? "") !== value)
        .map(([key]) => key),
    [edits, options],
  );

  const saveMutation = useMutation({
    mutationFn: (changes: Record<string, string>) =>
      aria2Client.changeOption(gid, changes),
    onSuccess: async () => {
      setEdits({});
      await queryClient.invalidateQueries({ queryKey: ["taskOption", gid] });
      toast.success(t("Task options saved"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {["a", "b", "c", "d", "e"].map((key) => (
          <Skeleton key={key} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-2">
      {!editable && (
        <p className="px-3 text-xs text-muted-foreground">
          {t("Options can be edited while the task is waiting or paused")}
        </p>
      )}
      {defs.map((def) => (
        <OptionField
          key={def.key}
          def={def}
          value={edits[def.key] ?? options?.[def.key] ?? ""}
          dirty={dirtyKeys.includes(def.key)}
          disabled={!editable}
          onChange={(value) =>
            setEdits((prev) => ({ ...prev, [def.key]: value }))
          }
        />
      ))}
      {editable && dirtyKeys.length > 0 && (
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setEdits({})}>
            {t("Discard")}
          </Button>
          <Button
            size="sm"
            disabled={saveMutation.isPending}
            onClick={() => {
              const changes: Record<string, string> = {};
              for (const key of dirtyKeys) changes[key] = edits[key];
              saveMutation.mutate(changes);
            }}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {t("Save Changes")}
          </Button>
        </div>
      )}
    </div>
  );
}
