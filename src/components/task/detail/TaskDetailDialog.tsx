import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { aria2Client } from "@/api/aria2";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilesTab } from "./FilesTab";
import { OverviewTab } from "./OverviewTab";
import { PeersTab } from "./PeersTab";
import { TaskOptionsTab } from "./TaskOptionsTab";

function taskName(
  task: { files?: { path: string; uris?: { uri: string }[] }[] },
  fallback: string,
): string {
  return task.files?.[0]?.path?.split("/").pop() || fallback;
}

export function TaskDetailDialog({
  gid,
  open,
  onOpenChange,
  onNavigateGid,
}: {
  gid: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateGid: (gid: string) => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("overview");

  const { data: task, isLoading } = useQuery({
    queryKey: ["taskStatus", gid],
    queryFn: () => aria2Client.tellStatus(gid as string),
    enabled: open && gid !== null,
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (!open) setTab("overview");
  }, [open]);

  const isBt = task?.bittorrent != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">
            {isLoading || !task
              ? t("Task Details")
              : taskName(task, t("Unknown Task"))}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !task ? (
          <div className="space-y-3 pt-2">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
              <TabsTrigger value="files">{t("Files")}</TabsTrigger>
              {isBt && task.status === "active" && (
                <TabsTrigger value="peers">{t("Peers")}</TabsTrigger>
              )}
              <TabsTrigger value="options">{t("Task Options")}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-3">
              <OverviewTab task={task} onNavigateGid={onNavigateGid} />
            </TabsContent>
            <TabsContent value="files" className="mt-3">
              <FilesTab gid={task.gid} task={task} />
            </TabsContent>
            {isBt && task.status === "active" && (
              <TabsContent value="peers" className="mt-3">
                <PeersTab gid={task.gid} />
              </TabsContent>
            )}
            <TabsContent value="options" className="mt-3">
              <TaskOptionsTab gid={task.gid} status={task.status} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
