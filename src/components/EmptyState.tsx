import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

export function EmptyState({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 animate-in fade-in duration-300 motion-reduce:animate-none">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Download className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{message ?? t("No tasks here yet")}</p>
      <p className="text-xs text-muted-foreground">{t("Create a new task")}</p>
    </div>
  );
}
