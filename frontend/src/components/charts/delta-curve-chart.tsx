import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { DeltaCurvePoint } from "@/api/types";
import { formatNaira } from "@/lib/utils";

interface DeltaCurveChartProps {
  data: DeltaCurvePoint[];
  currentPrice: number;
  strike: number;
}

export function DeltaCurveChart({ data, currentPrice, strike }: DeltaCurveChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="price"
          stroke="var(--color-ink-muted)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatNaira(v, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
        />
        <YAxis stroke="var(--color-ink-muted)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 1]} />
        <Tooltip
          formatter={(value) => Number(value).toFixed(4)}
          labelFormatter={(v) => formatNaira(Number(v))}
          contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontFamily: "var(--font-mono)" }}
        />
        <ReferenceLine x={currentPrice} stroke="var(--color-primary)" strokeDasharray="4 4" label={{ value: "Current", fill: "var(--color-primary)", fontSize: 10, position: "top" }} />
        <ReferenceLine x={strike} stroke="var(--color-danger)" strokeDasharray="4 4" label={{ value: "Strike", fill: "var(--color-danger)", fontSize: 10, position: "top" }} />
        <Line type="monotone" dataKey="delta" stroke="var(--color-primary-strong)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
