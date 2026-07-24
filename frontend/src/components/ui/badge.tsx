import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-mono font-semibold tracking-wide",
  {
    variants: {
      variant: {
        neutral: "border-border-strong bg-surface-hover text-ink-muted",
        primary: "border-primary/30 bg-primary/10 text-primary",
        danger: "border-danger/30 bg-danger/10 text-danger",
        amber: "border-amber/30 bg-amber/10 text-amber",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
