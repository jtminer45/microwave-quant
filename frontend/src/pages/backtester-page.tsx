import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import {
  ComposedChart, Line, Area, Bar, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBacktestStocks, useRunBacktest } from "@/api/hooks";
import { formatNaira, formatPercent, formatDate } from "@/lib/utils";

export function BacktesterPage() {
  const { data: meta } = useBacktestStocks();
  const runBacktest = useRunBacktest();

  const [ticker, setTicker] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<string | null>(null);
  const [initialCapital, setInitialCapital] = useState(1_000_000);

  useEffect(() => {
    if (meta && !ticker) setTicker(Object.keys(meta.stocks)[4] ?? Object.keys(meta.stocks)[0]);
    if (meta && !strategy) setStrategy(Object.keys(meta.strategies)[0]);
  }, [meta, ticker, strategy]);

  function run() {
    if (ticker && strategy) runBacktest.mutate({ ticker, strategy, initial_capital: initialCapital });
  }

  // Auto-run once params are ready the first time
  useEffect(() => {
    if (ticker && strategy && !runBacktest.data && !runBacktest.isPending) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, strategy]);

  const result = runBacktest.data;

  return (
    <div>
      <PageHeader
        icon={<FlaskConical className="h-5 w-5" />}
        title="Strategy Backtester"
        subtitle="Test if our signals actually made money historically"
        disclaimer="Past performance does not guarantee future results."
      />

      <Card className="mb-6">
        <CardHeader><CardTitle>⚙ Backtest Settings</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Select Stock</label>
            <Select value={ticker ?? ""} onChange={(e) => setTicker(e.target.value)}>
              {meta && Object.entries(meta.stocks).map(([t, name]) => <option key={t} value={t}>{t} — {name}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Initial Capital (₦)</label>
            <Input type="number" step={100_000} value={initialCapital} onChange={(e) => setInitialCapital(Number(e.target.value))} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Strategy</label>
            <Select value={strategy ?? ""} onChange={(e) => setStrategy(e.target.value)}>
              {meta && Object.entries(meta.strategies).map(([k, name]) => <option key={k} value={k}>{name}</option>)}
            </Select>
          </div>
          <div className="sm:col-span-3">
            <Button onClick={run} disabled={runBacktest.isPending}>
              {runBacktest.isPending ? "Running backtest…" : "🔬 Run Backtest"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {runBacktest.isPending && <Skeleton className="h-96" />}

      {runBacktest.isError && (
        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="pt-5 text-sm text-danger">
            Not enough historical data to run this strategy on this stock.
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>📊 {result.stock_name} — {result.strategy_name} Results</CardTitle>
              <p className="text-xs text-ink-dim">{formatDate(result.period_start)} → {formatDate(result.period_end)}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
                <StatTile
                  label="Strategy Return"
                  value={<span className={result.summary.strategy_return >= 0 ? "text-primary" : "text-danger"}>{formatPercent(result.summary.strategy_return)}</span>}
                  delta={`${formatPercent(result.summary.alpha)} vs B&H`}
                  deltaPositive={result.summary.alpha >= 0}
                />
                <StatTile label="Buy & Hold Return" value={formatPercent(result.summary.buy_hold_return)} />
                <StatTile label="Sharpe Ratio" value={result.summary.sharpe_ratio.toFixed(2)} />
                <StatTile label="Max Drawdown" value={<span className="text-danger">{formatPercent(result.summary.max_drawdown)}</span>} />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile label="Win Rate" value={`${result.summary.win_rate.toFixed(1)}%`} />
                <StatTile label="Final Value" value={formatNaira(result.summary.final_value)} />
                <StatTile label="Profit" value={<span className={result.summary.profit >= 0 ? "text-primary" : "text-danger"}>{formatNaira(result.summary.profit)}</span>} />
                <StatTile label="Trading Days" value={result.summary.total_days.toLocaleString()} />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle>📈 Portfolio Value Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={result.equity_curve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDate} stroke="var(--color-ink-muted)" fontSize={10} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis stroke="var(--color-ink-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${Intl.NumberFormat("en", { notation: "compact" }).format(v)}`} />
                  <Tooltip labelFormatter={(label) => formatDate(String(label))} formatter={(v) => formatNaira(Number(v))} contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontFamily: "var(--font-mono)" }} />
                  <Legend wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="strategy" name={result.strategy_name} stroke="var(--color-primary)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="buy_hold" name="Buy & Hold" stroke="var(--color-ink-muted)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle>📉 Drawdown Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={result.drawdown_curve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDate} stroke="var(--color-ink-muted)" fontSize={10} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis stroke="var(--color-ink-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip labelFormatter={(label) => formatDate(String(label))} formatter={(v) => `${Number(v).toFixed(2)}%`} contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontFamily: "var(--font-mono)" }} />
                  <Area type="monotone" dataKey="drawdown" stroke="var(--color-danger)" fill="var(--color-danger)" fillOpacity={0.15} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {strategy !== "buy_and_hold" && (
            <Card className="mb-6">
              <CardHeader><CardTitle>📊 Price Chart with Buy/Sell Signals</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={result.price_with_signals.prices}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDate} stroke="var(--color-ink-muted)" fontSize={10} tickLine={false} axisLine={false} minTickGap={40} />
                    <YAxis stroke="var(--color-ink-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatNaira(v, { maximumFractionDigits: 0, minimumFractionDigits: 0 })} />
                    <Tooltip labelFormatter={(label) => formatDate(String(label))} formatter={(v) => formatNaira(Number(v))} contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontFamily: "var(--font-mono)" }} />
                    <Line type="monotone" dataKey="price" stroke="var(--color-ink-muted)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Scatter data={result.price_with_signals.buy_signals} dataKey="price" fill="var(--color-primary)" shape="triangle" />
                    <Scatter data={result.price_with_signals.sell_signals} dataKey="price" fill="var(--color-danger)" shape="triangle" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader><CardTitle>📅 Monthly Returns</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={result.monthly_returns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--color-ink-muted)" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis stroke="var(--color-ink-muted)" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontFamily: "var(--font-mono)" }} />
                  <Bar dataKey="return" radius={[3, 3, 0, 0]}>
                    {result.monthly_returns.map((r, i) => <Cell key={i} fill={r.return >= 0 ? "var(--color-primary)" : "var(--color-danger)"} />)}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>📋 Strategy Summary</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody className="font-mono">
                  {[
                    ["Strategy", result.strategy_name],
                    ["Stock", result.stock_name],
                    ["Period", `${formatDate(result.period_start)} → ${formatDate(result.period_end)}`],
                    ["Initial Capital", formatNaira(initialCapital)],
                    ["Final Value", formatNaira(result.summary.final_value)],
                    ["Total Profit", formatNaira(result.summary.profit)],
                    ["Strategy Return", formatPercent(result.summary.strategy_return)],
                    ["Buy & Hold Return", formatPercent(result.summary.buy_hold_return)],
                    ["Alpha", formatPercent(result.summary.alpha)],
                    ["Sharpe Ratio", result.summary.sharpe_ratio.toFixed(2)],
                    ["Max Drawdown", formatPercent(result.summary.max_drawdown)],
                    ["Win Rate", `${result.summary.win_rate.toFixed(1)}%`],
                    ["Trading Days", result.summary.total_days.toLocaleString()],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-4 font-sans text-ink-muted">{label}</td>
                      <td className="py-2 text-right text-ink">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-xs text-ink-dim">
                ⚠ Backtested results do not account for transaction costs, slippage, liquidity constraints, or market impact. Educational purposes only.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
