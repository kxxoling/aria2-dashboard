import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * Remounts its subtree on route change, triggering a short entrance
 * animation. Pages stay animation-free; the wrapper owns the motion.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div
      key={pathname}
      className="animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none"
    >
      {children}
    </div>
  );
}
