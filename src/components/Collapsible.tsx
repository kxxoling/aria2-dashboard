import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Height-animated show/hide without JS measurement: the grid-rows 0fr→1fr
 * interpolation trick plus a fade. Purely presentational — consumers only
 * toggle `open`.
 */
export function Collapsible({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid transition-all duration-200 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className,
      )}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}
