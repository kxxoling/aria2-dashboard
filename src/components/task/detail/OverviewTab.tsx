import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { statusVisual, taskStatusLabel } from "@/lib/taskStatus";
import { clampPercent, formatBytes, formatEta } from "@/lib/utils.format";
import type { Aria2TaskStatus } from "@/types/aria2";
import { InfoRow } from "./InfoRow";

function formatDateTime(seconds?: number): string {
  if (!seconds || seconds <= 0) return "—";
  return new Date(seconds * 1000).toLocaleString();
}

function GidLink({
  gid,
  onNavigateGid,
}: {
  gid: string;
  onNavigateGid: (gid: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigateGid(gid)}
      className="rounded bg-muted px-2 py-0.5 font-mono text-xs hover:bg-secondary"
    >
      {gid} →
    </button>
  );
}

export function OverviewTab({
  task,
  onNavigateGid,
}: {
  task: Aria2TaskStatus;
  onNavigateGid: (gid: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const visual = statusVisual(task.status);
  const total = Number(task.totalLength);
  const completed = Number(task.completedLength);
  const percent = clampPercent(total === 0 ? 0 : (completed / total) * 100);
  const speed = Number(task.downloadSpeed);
  const eta =
    speed > 0 && task.status === "active" ? (total - completed) / speed : 0;
  const bt = task.bittorrent;
  const isBt = task.bittorrent != null;
  const verified = Number(task.verifiedLength ?? 0);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-3">
        <Progress
          value={percent}
          className="h-2.5 flex-1"
          indicatorClassName={visual.barClass}
        />
        <span className="w-14 text-right text-sm font-medium tabular-nums">
          {percent.toFixed(1)}%
        </span>
      </div>

      <div className="grid gap-x-8 md:grid-cols-2">
        <div>
          <InfoRow label={t("Status")}>
            <Badge variant="outline" className={visual.badgeClass}>
              {taskStatusLabel(task.status, i18n.language).label}
            </Badge>
            {task.seeder === "true" && (
              <Badge variant="outline" className="ml-1.5 text-[10px]">
                {t("Seeding")}
              </Badge>
            )}
          </InfoRow>
          <InfoRow label={t("Size")}>
            {formatBytes(completed)} / {formatBytes(total)}
          </InfoRow>
          <InfoRow label={t("Speed")}>
            {Number(task.downloadSpeed) > 0
              ? `${formatBytes(Number(task.downloadSpeed))}/s ↓`
              : "—"}
            {Number(task.uploadSpeed) > 0 &&
              ` ${formatBytes(Number(task.uploadSpeed))}/s ↑`}
          </InfoRow>
          {Number(task.uploadLength) > 0 && (
            <InfoRow label={t("Uploaded")}>
              {formatBytes(Number(task.uploadLength))}
            </InfoRow>
          )}
          {task.status === "active" && (
            <InfoRow label={t("ETA")}>{formatEta(eta)}</InfoRow>
          )}
        </div>
        <div>
          <InfoRow label="GID">
            <code className="font-mono text-xs">{task.gid}</code>
          </InfoRow>
          <InfoRow label={t("Connections")}>{task.connections ?? "—"}</InfoRow>
          <InfoRow label={t("Seeders")}>{task.numSeeders ?? "—"}</InfoRow>
          {task.pieceLength && task.numPieces && (
            <InfoRow label={t("Pieces")}>
              {task.numPieces} × {formatBytes(Number(task.pieceLength))}
            </InfoRow>
          )}
          {verified > 0 && (
            <InfoRow label={t("Verified")}>
              {formatBytes(verified)} / {formatBytes(total)}
            </InfoRow>
          )}
        </div>
      </div>

      <InfoRow label={t("Download Directory")}>
        <code className="font-mono text-xs">{task.dir}</code>
      </InfoRow>

      {isBt && (
        <div className="grid gap-x-8 md:grid-cols-2">
          {task.infoHash && (
            <InfoRow label="Info Hash">
              <code className="font-mono text-xs" title={task.infoHash}>
                {task.infoHash}
              </code>
            </InfoRow>
          )}
          {bt?.mode && (
            <InfoRow label={t("Torrent Mode")}>
              <Badge variant="outline" className="text-[10px] capitalize">
                {bt.mode}
              </Badge>
            </InfoRow>
          )}
          {bt?.creationDate ? (
            <InfoRow label={t("Created")}>
              {formatDateTime(bt.creationDate)}
            </InfoRow>
          ) : null}
          {bt?.comment ? (
            <InfoRow label={t("Comment")}>
              <span className="break-all text-xs">{bt.comment}</span>
            </InfoRow>
          ) : null}
        </div>
      )}

      {task.errorCode && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t("Error Code")}: {task.errorCode}
          {task.errorMessage && ` — ${task.errorMessage}`}
        </div>
      )}

      {task.followedBy && task.followedBy.length > 0 && (
        <InfoRow label={t("Followed By")}>
          <div className="flex flex-wrap gap-2">
            {task.followedBy.map((gid) => (
              <GidLink key={gid} gid={gid} onNavigateGid={onNavigateGid} />
            ))}
          </div>
        </InfoRow>
      )}
      {task.following && (
        <InfoRow label={t("Following")}>
          <GidLink gid={task.following} onNavigateGid={onNavigateGid} />
        </InfoRow>
      )}
      {task.belongsTo && (
        <InfoRow label={t("Belongs To")}>
          <GidLink gid={task.belongsTo} onNavigateGid={onNavigateGid} />
        </InfoRow>
      )}
    </div>
  );
}
