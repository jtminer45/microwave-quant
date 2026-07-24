import { useMemo } from "react";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { MonteCarloResult } from "@/api/types";
import { formatCompactNaira } from "@/lib/utils";

export function MonteCarloChart({ result }: { result: MonteCarloResult }) {
  const data = useMemo(() => {
    const displayPaths = result.sample_paths.slice(0, 25);
    return result.mean_path.map((meanValue, day) => {
      const point: Record<string, number> = { day, mean: meanValue };
      displayPaths.forEach((path, i) => {
        point[`p${i}`] = path[day];
      });
      return point;
    });
  }, [result]);

  const pathKeys = useMemo(() => Array.from({ length: Math.min(25, result.sample_paths.length) }, (_, i) => `p${i}`), [result]);

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="day" stroke="var(--color-ink-muted)" fontSize={11} tickLine={false} axisLine={false} label={{ value: "Trading Days", position: "insideBottom", offset: -4, fill: "var(--color-ink-dim)", fontSize: 11 }} />
        <YAxis
          stroke="var(--color-ink-muted)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCompactNaira(v)}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload) return null;
            const mean = payload.find((p) => p.dataKey === "mean");
            if (!mean) return null;
            return (
              <div
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                }}
              >
                <div style={{ color: "var(--color-ink-muted)" }}>Day {label}</div>
                <div style={{ color: "var(--color-primary-strong)", fontWeight: 600 }}>
                  {formatCompactNaira(Number(mean.value))}
                </div>
              </div>
            );
          }}
        />
        <ReferenceLine y={result.initial_value} stroke="var(--color-amber)" strokeDasharray="4 4" label={{ value: "Initial Value", fill: "var(--color-amber)", fontSize: 11, position: "insideTopLeft" }} />
        {pathKeys.map((key) => (
          <Line key={key} type="monotone" dataKey={key} stroke="var(--color-primary)" strokeOpacity={0.08} dot={false} isAnimationActive={false} legendType="none" />
        ))}
        <Line type="monotone" dataKey="mean" stroke="var(--color-primary-strong)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
