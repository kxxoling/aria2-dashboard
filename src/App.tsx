import { RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import { startConnectCycle } from "@/api/connection";
import { Toaster } from "@/components/ui/toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useTheme } from "./lib/useTheme";
import { useTitleSpeed } from "./lib/useTitleSpeed";
import { router } from "./router";

function App() {
  useTheme();
  useTitleSpeed();

  // Single connection lifecycle for the whole app; StrictMode's double
  // invoke is safe — starting a cycle cancels the previous one.
  useEffect(() => {
    startConnectCycle();
  }, []);

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
