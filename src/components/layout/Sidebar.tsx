import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Download,
  FileText,
  PanelLeftClose,
  Plus,
  Server,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { NewTaskDialog } from "@/components/task/NewTaskDialog";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";

export function Sidebar({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <aside
      className={`${sidebarOpen ? "w-64" : "w-16"} border-r bg-card flex flex-col transition-all duration-300 ${className || ""}`}
    >
      <div
        className={`h-14 flex items-center px-4 border-b font-semibold tracking-tight text-lg mb-4 ${sidebarOpen ? "" : "justify-center"}`}
      >
        <Server className="w-5 h-5 text-primary shrink-0" />
        {sidebarOpen && <span className="ml-2">Aria2 Dashboard</span>}
      </div>

      <div className="flex-1 px-3 space-y-1">
        <Link to="/">
          {({ isActive }) => (
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full font-medium ${sidebarOpen ? "justify-start" : "justify-center"}`}
              size={sidebarOpen ? "default" : "icon"}
            >
              <Download className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="ml-2">{t("Tasks")}</span>}
            </Button>
          )}
        </Link>
        <Link to="/aria2-settings">
          {({ isActive }) => (
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full font-medium ${sidebarOpen ? "justify-start" : "justify-center"}`}
              size={sidebarOpen ? "default" : "icon"}
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              {sidebarOpen && (
                <span className="ml-2">{t("Aria2 Settings")}</span>
              )}
            </Button>
          )}
        </Link>
        <Link to="/logs">
          {({ isActive }) => (
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full font-medium ${sidebarOpen ? "justify-start" : "justify-center"}`}
              size={sidebarOpen ? "default" : "icon"}
            >
              <FileText className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="ml-2">{t("Logs")}</span>}
            </Button>
          )}
        </Link>
        <Link to="/settings">
          {({ isActive }) => (
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full ${sidebarOpen ? "justify-start" : "justify-center"}`}
              size={sidebarOpen ? "default" : "icon"}
            >
              <Settings className="w-4 h-4 shrink-0" />
              {sidebarOpen && (
                <span className="ml-2">{t("Connection Settings")}</span>
              )}
            </Button>
          )}
        </Link>
      </div>

      <div className="p-3 border-t space-y-2">
        <NewTaskDialog enableHotkey>
          {/* children === null falls back to NewTaskDialog's own labeled
              trigger; collapsed sidebars get an icon-only trigger instead */}
          {sidebarOpen ? null : (
            <Button
              size="icon"
              className="w-full"
              aria-label={t("New Task")}
              title={t("New Task")}
            >
              <Plus className="w-4 h-4 shrink-0" />
            </Button>
          )}
        </NewTaskDialog>
        <Button
          variant="ghost"
          size={sidebarOpen ? "default" : "icon"}
          onClick={toggleSidebar}
          className="w-full gap-2"
        >
          {sidebarOpen ? (
            <>
              <PanelLeftClose className="w-4 h-4 shrink-0" />
              <span>{t("Collapse")}</span>
            </>
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0" />
          )}
        </Button>
      </div>
    </aside>
  );
}
