/**
 * useTasks referential-stability tests.
 *
 * The task table (TanStack Table) reacts to every new `data` reference with
 * an auto-reset dispatched from a microtask; feeding it a fresh tasksMap on
 * each render drove a render loop at full CPU (see Dashboard render-loop
 * regression test). These tests pin the contract that useTasks keeps its
 * returned references stable while the underlying query data is unchanged.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useTasks } from "@/hooks/useTasks";
import type { Aria2Task } from "@/types/aria2";

const mocks = vi.hoisted(() => ({
  tellActive: vi.fn(),
  tellWaiting: vi.fn(),
  tellStopped: vi.fn(),
}));

vi.mock("@/api/aria2", () => ({
  aria2Client: {
    tellActive: mocks.tellActive,
    tellWaiting: mocks.tellWaiting,
    tellStopped: mocks.tellStopped,
  },
}));

function makeTask(gid: string): Aria2Task {
  return {
    gid,
    status: "active",
    totalLength: "1024",
    completedLength: "0",
    uploadLength: "0",
    downloadSpeed: "0",
    uploadSpeed: "0",
    dir: "/tmp",
  };
}

/** Same task, terminal state — what tellStopped reports after completion. */
function completedTask(gid: string): Aria2Task {
  return { ...makeTask(gid), status: "complete", completedLength: "1024" };
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
}

describe("useTasks referential stability", () => {
  beforeEach(() => {
    mocks.tellActive.mockReset().mockResolvedValue([makeTask("a")]);
    mocks.tellWaiting.mockReset().mockResolvedValue([]);
    mocks.tellStopped.mockReset().mockResolvedValue([]);
  });

  test("tasksMap and loadingMap keep identity across re-renders", async () => {
    const { client, Wrapper } = createWrapper();
    const { result, rerender } = renderHook(() => useTasks(), {
      wrapper: Wrapper,
    });

    await waitFor(() =>
      expect(result.current.tasksMap.active?.[0]?.gid).toBe("a"),
    );
    const map1 = result.current.tasksMap;
    const loading1 = result.current.loadingMap;

    rerender();
    rerender();

    expect(result.current.tasksMap).toBe(map1);
    expect(result.current.loadingMap).toBe(loading1);
    client.clear();
  });

  test("tasksMap identity changes when the underlying data changes", async () => {
    const { client, Wrapper } = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(result.current.tasksMap.active?.[0]?.gid).toBe("a"),
    );
    const map1 = result.current.tasksMap;

    mocks.tellActive.mockResolvedValue([makeTask("b")]);
    await act(() => client.invalidateQueries({ queryKey: ["activeTasks"] }));

    await waitFor(() =>
      expect(result.current.tasksMap.active?.[0]?.gid).toBe("b"),
    );
    expect(result.current.tasksMap).not.toBe(map1);
    client.clear();
  });

  test("merged list dedupes by gid, newest fetch wins", async () => {
    // Stale active snapshot still lists X while the fresher stopped fetch
    // already reports it complete (the hung-request scenario).
    const { client, Wrapper } = createWrapper();
    mocks.tellActive.mockResolvedValue([makeTask("x"), makeTask("y")]);
    const { result } = renderHook(() => useTasks(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.tasksMap.active?.length).toBe(2));

    // Simulate: X completes and the stopped list refreshes while the active
    // query is stuck on its old snapshot.
    mocks.tellStopped.mockResolvedValue([completedTask("x")]);
    await act(() => client.invalidateQueries({ queryKey: ["stoppedTasks"] }));

    await waitFor(() =>
      expect(result.current.tasksMap.stopped?.[0]?.gid).toBe("x"),
    );
    const all = result.current.tasksMap.all ?? [];
    expect(all.map((t) => t.gid).sort()).toEqual(["x", "y"]);
    expect(all.find((t) => t.gid === "x")?.status).toBe("complete");
    client.clear();
  });
});
