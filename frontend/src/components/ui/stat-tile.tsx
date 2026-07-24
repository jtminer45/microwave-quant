import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatTileProps {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaPositive?: boolean;
  className?: string;
}

export function StatTile({ label, value, delta, deltaPositive, className }: StatTileProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-4", className)}>
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-1.5 font-mono text-2xl font-bold text-ink font-tabular">{value}</div>
      {delta && (
        <div
          className={cn(
            "mt-1 font-mono text-xs font-semibold",
            deltaPositive ? "text-primary" : "text-danger"
          )}
        >
          {delta}
        </div>
      )}
    </div>
  );
}
