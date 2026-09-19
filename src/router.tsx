/**
 * 路由配置
 *
 * / → Tasks（Dashboard）
 * /settings → 设置页（界面 / 连接 / Aria2 / 日志 Tabs；?tab= 深链并同步）
 * /aria2-settings → 旧地址，重定向到 /settings?tab=aria2
 *
 * Uses hash history: the app is deployed on plain static hosts (object
 * storage, file servers, GitHub Pages without SPA fallback) where deep
 * links like /settings would otherwise 404 on refresh. With hash routing
 * the server only ever needs to serve index.html — /#/settings works
 * everywhere, including file:// and the extension popup.
 */

import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Logs } from "@/pages/Logs";
import { Settings } from "@/pages/Settings";

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  component: Settings,
});

// Kept as a redirect so old deep links (bookmarks, docs) keep working.
const aria2SettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/aria2-settings",
  beforeLoad: () => {
    throw redirect({ to: "/settings", search: { tab: "aria2" } });
  },
});

const logsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/logs",
  component: Logs,
});

const routeTree = rootRoute.addChildren([
  tasksRoute,
  settingsRoute,
  aria2SettingsRoute,
  logsRoute,
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});
