import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import type { VarResponse } from "@/api/types";
import { formatCompactNaira } from "@/lib/utils";

export function VarCurveChart({ data, selectedConfidence }: { data: VarResponse; selectedConfidence: number }) {
  const chartData = data.var_curve.map((v, i) => ({
    confidence: v.confidence,
    var: v.var,
    cvar: data.cvar_curve[i]?.cvar ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="confidence" stroke="var(--color-ink-muted)" fontSize={11} tickLine={false} axisLine={false} unit="%" />
        <YAxis stroke="var(--color-ink-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompactNaira(v)} />
        <Tooltip
          formatter={(value) => formatCompactNaira(Number(value))}
          contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontFamily: "var(--font-mono)" }}
        />
        <Legend wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 12 }} />
        <ReferenceLine x={selectedConfidence} stroke="var(--color-ink-muted)" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="var" name="VaR" stroke="var(--color-amber)" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="cvar" name="CVaR" stroke="var(--color-danger)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
