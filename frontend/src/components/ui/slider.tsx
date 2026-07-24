import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  valueLabel: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, valueLabel, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</label>
          <span className="font-mono text-sm font-semibold text-primary">{valueLabel}</span>
        </div>
        <input
          ref={ref}
          type="range"
          className={cn(
            "w-full h-1.5 rounded-full bg-surface-hover appearance-none cursor-pointer accent-primary",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-glow-primary [&::-webkit-slider-thumb]:cursor-pointer",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
