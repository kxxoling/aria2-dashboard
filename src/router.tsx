/**
 * 路由配置
 *
 * / → Tasks（Dashboard）
 * /settings → 连接设置
 * /aria2-settings → Aria2 设置
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
} from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Aria2Settings } from "@/pages/Aria2Settings";
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
  component: Settings,
});

const aria2SettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/aria2-settings",
  component: Aria2Settings,
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
