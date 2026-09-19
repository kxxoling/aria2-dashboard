/**
 * LogsPanel fetch behavior. The /aria2-log endpoint only exists in the
 * all-in-one image; every other deployment (vite dev server, extension
 * origin, bare aria2 without a reverse proxy) must land on the explanatory
 * "logs unavailable" card — never a raw "Failed to fetch" — and polling
 * must stop once the endpoint is known-dead.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { LogsPanel } from "@/components/logs/LogsPanel";

const UNAVAILABLE_TEXT =
  "The built-in log view is provided by the all-in-one Docker image";

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LogsPanel />
    </QueryClientProvider>,
  );
}

const realFetch = globalThis.fetch;
afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

test("network-level fetch failure shows the unavailable card, not a raw error", async () => {
  globalThis.fetch = vi
    .fn()
    .mockRejectedValue(new TypeError("Failed to fetch"));
  renderPanel();
  await waitFor(() =>
    expect(screen.getByText(UNAVAILABLE_TEXT, { exact: false })).toBeTruthy(),
  );
  expect(screen.queryByText(/Failed to fetch/)).toBeNull();
  // no endpoint exists in this deployment — a Retry could never succeed
  expect(screen.queryByRole("button", { name: /Retry/ })).toBeNull();
});

test("a 200 text/html response (dev-server SPA fallback) is treated as unavailable", async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response("<html>index fallback</html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    }),
  );
  renderPanel();
  await waitFor(() =>
    expect(screen.getByText(UNAVAILABLE_TEXT, { exact: false })).toBeTruthy(),
  );
  expect(screen.queryByRole("button", { name: /Retry/ })).toBeNull();
});

test("404 shows the unavailable card", async () => {
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue(new Response("", { status: 404 }));
  renderPanel();
  await waitFor(() =>
    expect(screen.getByText(UNAVAILABLE_TEXT, { exact: false })).toBeTruthy(),
  );
  expect(screen.queryByRole("button", { name: /Retry/ })).toBeNull();
});

test("non-404 HTTP errors show a translated failure reason and keep Retry", async () => {
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue(new Response("nope", { status: 503 }));
  renderPanel();
  // the i18n key renders verbatim in tests (no resources initialized);
  // assert the reason is surfaced next to the translated-key label
  await waitFor(() => expect(screen.getByText(/\(HTTP 503\)/)).toBeTruthy());
  expect(screen.queryByText(UNAVAILABLE_TEXT, { exact: false })).toBeNull();
  // transient server errors may recover — Retry stays
  expect(screen.getByRole("button", { name: /Retry/ })).toBeTruthy();
});

test("first load shows a skeleton, never the empty log view", async () => {
  let resolveFirst!: (value: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    resolveFirst = resolve;
  });
  globalThis.fetch = vi.fn().mockImplementationOnce(() => pending);

  renderPanel();
  // while the very first request is in flight: skeleton, no toolbar,
  // no empty log box — those would flash before the content lands
  expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  expect(screen.queryByPlaceholderText("Search logs...")).toBeNull();
  expect(screen.queryByText("No matching log lines")).toBeNull();

  resolveFirst(
    new Response("09/20 00:00:00 [NOTICE] Download complete: ubuntu.iso\n", {
      status: 200,
      headers: { "content-type": "text/plain" },
    }),
  );
  await waitFor(() =>
    expect(screen.getByText(/Download complete: ubuntu.iso/)).toBeTruthy(),
  );
  expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  expect(screen.getByPlaceholderText("Search logs...")).toBeTruthy();
});

test("retrying a transient error keeps the card mounted until a fetch succeeds", async () => {
  // first attempt: 503; the retry stays pending until we resolve it
  let resolveRetry!: (value: Response) => void;
  const pendingRetry = new Promise<Response>((resolve) => {
    resolveRetry = resolve;
  });
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response("nope", { status: 503 }))
    .mockImplementationOnce(() => pendingRetry);
  globalThis.fetch = fetchMock;

  renderPanel();
  await waitFor(() => expect(screen.getByText(/\(HTTP 503\)/)).toBeTruthy());

  await userEvent.click(screen.getByRole("button", { name: /Retry/ }));
  // while the retry request is in flight the error card must NOT unmount
  // into an empty log view (the "flash" regression)
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(screen.getByText(/\(HTTP 503\)/)).toBeTruthy();

  resolveRetry(
    new Response("09/20 00:00:00 [NOTICE] Download complete: ubuntu.iso\n", {
      status: 200,
      headers: { "content-type": "text/plain" },
    }),
  );
  await waitFor(() =>
    expect(screen.getByText(/Download complete: ubuntu.iso/)).toBeTruthy(),
  );
});

test("a real log payload renders parsed lines", async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response("09/20 00:00:00 [NOTICE] Download complete: ubuntu.iso\n", {
      status: 200,
      headers: { "content-type": "text/plain" },
    }),
  );
  renderPanel();
  await waitFor(() =>
    expect(screen.getByText(/Download complete: ubuntu.iso/)).toBeTruthy(),
  );
});

test("polling stops once the endpoint errors instead of hammering it", {
  timeout: 10_000,
}, async () => {
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue(new Response("", { status: 404 }));
  renderPanel();
  await waitFor(() =>
    expect(screen.getByText(UNAVAILABLE_TEXT, { exact: false })).toBeTruthy(),
  );
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);

  // The auto-refresh interval must be disabled while the query is in an
  // error state: one poll slot (5s) passes with no further request.
  await new Promise((resolve) => setTimeout(resolve, 5300));
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});
