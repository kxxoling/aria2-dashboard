import { RouterProvider } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useTheme } from "./lib/useTheme";
import { useTitleSpeed } from "./lib/useTitleSpeed";
import { router } from "./router";

function App() {
  useTheme();
  useTitleSpeed();

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
