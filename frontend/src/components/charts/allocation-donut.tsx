import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ComputedHolding } from "@/api/types";
import { formatNaira } from "@/lib/utils";

const PALETTE = ["#34d399", "#6ee7b7", "#0f7b4f", "#fbbf24", "#93a69b", "#5c6b62", "#f87171"];

export function AllocationDonut({ holdings }: { holdings: ComputedHolding[] }) {
  const data = holdings.map((h) => ({ name: h.ticker, value: h.value }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="var(--color-surface)" strokeWidth={2} />)}
        </Pie>
        <Tooltip
          formatter={(value) => formatNaira(Number(value))}
          contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontFamily: "var(--font-mono)" }}
        />
        <Legend wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-ink-muted)" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
