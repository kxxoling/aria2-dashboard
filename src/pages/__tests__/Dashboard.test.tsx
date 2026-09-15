/**
 * Dashboard render-loop regression test.
 *
 * Before the fix, the combination of (a) useTasks returning a fresh
 * tasksMap object on every render and (b) TanStack Table's auto-reset
 * (scheduled from a microtask and re-dispatching table state) put the page
 * into a microtask-paced re-render loop whenever the backend was
 * unreachable — near-100% CPU. This test mounts the real Dashboard with a
 * failing RPC client (the "backend down" scenario) and asserts that React
 * commits settle to the polling cadence instead of looping. With the bug,
 * the loop produces hundreds of commits per measurement window; the budget
 * below leaves an order-of-magnitude margin in both directions.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { Profiler } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import "@/i18n";
import { Dashboard } from "@/pages/Dashboard";

const mocks = vi.hoisted(() => ({
  tellActive: vi.fn(),
  tellWaiting: vi.fn(),
  tellStopped: vi.fn(),
  tellStatus: vi.fn(),
  getOption: vi.fn(),
  getPeers: vi.fn(),
  pauseAll: vi.fn(),
  unpauseAll: vi.fn(),
  purgeDownloadResult: vi.fn(),
  pause: vi.fn(),
  unpause: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/api/aria2", () => ({
  aria2Client: mocks,
}));

// The error banner links to /settings via the router; stub it so the page
// mounts without a router provider.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#/settings">{children}</a>
  ),
}));

const unreachable = () => Promise.reject(new Error("Failed to fetch"));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("Dashboard render-loop regression", () => {
  beforeEach(() => {
    for (const fn of [
      mocks.tellActive,
      mocks.tellWaiting,
      mocks.tellStopped,
      mocks.tellStatus,
      mocks.getOption,
      mocks.getPeers,
    ]) {
      fn.mockReset().mockImplementation(unreachable);
    }
  });

  // The pre-fix render loop starves the jsdom event loop so badly that
  // this test cannot even finish its sleeps — a tight 5s timeout makes
  // that regression fail fast instead of hanging for the default 15s.
  test("commits settle when the backend is unreachable", {
    timeout: 5_000,
  }, async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    let commits = 0;
    render(
      <QueryClientProvider client={client}>
        <Profiler id="dashboard" onRender={() => (commits += 1)}>
          <Dashboard />
        </Profiler>
      </QueryClientProvider>,
    );

    // Let the initial queries fail and the error state settle.
    await act(async () => {
      await sleep(400);
    });
    const settled = commits;

    // A quiet window: only polling-cadence commits are allowed. The
    // pre-fix loop re-rendered hundreds of times in this window.
    await act(async () => {
      await sleep(800);
    });

    expect(commits - settled).toBeLessThan(6);
    client.clear();
  });
});
