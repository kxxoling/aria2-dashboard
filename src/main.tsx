import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { queryClient } from "./lib/queryClient";
import "./i18n";
import "./index.css";
import App from "./App";

async function enableMocking() {
  // Read the flag inline (instead of via env.ts) so the bundler can statically
  // eliminate the MSW dynamic import from production builds.
  if (import.meta.env.VITE_USE_MOCK !== "true") {
    return;
  }

  const { worker } = await import("./mocks/browser");

  return worker.start({
    onUnhandledRequest: "bypass",
  });
}

enableMocking().then(() => {
  createRoot(document.getElementById("root") as HTMLElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
});
