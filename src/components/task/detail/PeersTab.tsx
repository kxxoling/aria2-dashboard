import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { aria2Client } from "@/api/aria2";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBytes } from "@/lib/utils.format";

export function PeersTab({ gid }: { gid: string }) {
  const { t } = useTranslation();
  const { data: peers, isLoading } = useQuery({
    queryKey: ["peers", gid],
    queryFn: () => aria2Client.getPeers(gid),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {["a", "b", "c"].map((key) => (
          <Skeleton key={key} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!peers || peers.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("No peers connected")}
      </p>
    );
  }

  return (
    <Table className="pt-2">
      <TableHeader>
        <TableRow>
          <TableHead>IP</TableHead>
          <TableHead>{t("Client")}</TableHead>
          <TableHead>↓</TableHead>
          <TableHead>↑</TableHead>
          <TableHead>{t("Status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {peers.map((peer) => (
          <TableRow key={peer.peerId + peer.ip + peer.port}>
            <TableCell className="font-mono text-xs">
              {peer.ip}:{peer.port}
            </TableCell>
            <TableCell className="max-w-[180px] truncate text-xs">
              {peer.client || "—"}
            </TableCell>
            <TableCell className="text-xs tabular-nums">
              {Number(peer.downloadSpeed) > 0
                ? `${formatBytes(Number(peer.downloadSpeed))}/s`
                : "—"}
            </TableCell>
            <TableCell className="text-xs tabular-nums">
              {Number(peer.uploadSpeed) > 0
                ? `${formatBytes(Number(peer.uploadSpeed))}/s`
                : "—"}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-[10px]">
                {peer.seeder === "true" ? t("Seeding") : t("Downloading")}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
