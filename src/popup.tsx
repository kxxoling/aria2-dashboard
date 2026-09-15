import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import "./i18n";
import "./index.css";
import App from "./App";

export default function Popup() {
  return (
    <div style={{ width: 800, height: 600 }}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </div>
  );
}
