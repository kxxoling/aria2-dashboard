import { Link } from "@tanstack/react-router";
import { Download, Plus, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NewTaskDialog } from "@/components/task/NewTaskDialog";

export function BottomNav({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 h-16 border-t bg-card/90 backdrop-blur-md flex items-center justify-around z-20 pb-safe ${className || ""}`}
    >
      <Link
        to="/"
        className="flex flex-col items-center justify-center gap-1 w-full h-full text-primary transition-colors"
        activeOptions={{ exact: true }}
      >
        {({ isActive }) => (
          <>
            <Download
              className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`}
            />
            <span
              className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}
            >
              {t("Tasks")}
            </span>
          </>
        )}
      </Link>

      <div className="relative -top-5">
        <NewTaskDialog>
          <button
            type="button"
            className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-transform active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        </NewTaskDialog>
      </div>

      <Link
        to="/settings"
        className="flex flex-col items-center justify-center gap-1 w-full h-full text-muted-foreground hover:text-foreground transition-colors"
      >
        {({ isActive }) => (
          <>
            <Settings
              className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`}
            />
            <span
              className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}
            >
              {t("Settings")}
            </span>
          </>
        )}
      </Link>
    </nav>
  );
}
