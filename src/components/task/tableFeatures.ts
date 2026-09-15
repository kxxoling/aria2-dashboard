import { getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";

/**
 * Row model factories for the task table (TanStack Table v8 pipeline).
 *
 * Kept as a lazy getter: Plasmo's Parcel bundler mis-evaluates some
 * re-exported bindings at module-init time, so factories are created on
 * first render after the module graph has fully executed.
 */
let cached: ReturnType<typeof build> | null = null;

function build() {
  return {
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  };
}

export function getDashboardFeatures() {
  if (!cached) cached = build();
  return cached;
}
