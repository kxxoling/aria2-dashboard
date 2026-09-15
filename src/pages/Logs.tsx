import { useTranslation } from "react-i18next";
import { LogsPanel } from "@/components/logs/LogsPanel";

export function Logs() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("Logs")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("aria2 log · auto refreshes every 5s")}
        </p>
      </div>
      <LogsPanel />
    </div>
  );
}
