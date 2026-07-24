import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceChart } from "@/components/charts/price-chart";
import { useMarketPrices, useStockHistory } from "@/api/hooks";
import { formatNaira, formatPercent } from "@/lib/utils";

export function StockPage() {
  const { data: market } = useMarketPrices();
  const tickers = useMemo(() => market?.stocks.map((s) => s.ticker) ?? [], [market]);
  const [ticker, setTicker] = useState<string | null>(null);
  const activeTicker = ticker ?? tickers[0] ?? null;

  const stock = market?.stocks.find((s) => s.ticker === activeTicker);
  const { data: history, isLoading, isError } = useStockHistory(activeTicker);

  const returnHistogram = useMemo(() => {
    if (!history) return [];
    const returns: number[] = [];
    for (let i = 1; i < history.prices.length; i++) {
      const prev = history.prices[i - 1].price;
      const curr = history.prices[i].price;
      returns.push(((curr - prev) / prev) * 100);
    }
    if (returns.length === 0) return [];
    const min = Math.min(...returns);
    const max = Math.max(...returns);
    const bucketCount = 25;
    const bucketSize = (max - min) / bucketCount || 1;
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      range: (min + i * bucketSize).toFixed(1),
      count: 0,
    }));
    returns.forEach((r) => {
      const idx = Math.min(bucketCount - 1, Math.floor((r - min) / bucketSize));
      buckets[idx].count += 1;
    });
    return buckets;
  }, [history]);

  return (
    <div>
      <PageHeader
        icon={<TrendingUp className="h-5 w-5" />}
        title="Stock Analysis"
        subtitle="Deep dive into any NGX listed stock"
        disclaimer="Data delayed 20 minutes. Not investment advice."
      />

      <Card className="mb-6">
        <CardContent className="pt-5">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Select Stock
          </label>
          <Select value={activeTicker ?? ""} onChange={(e) => setTicker(e.target.value)} className="max-w-xs">
            {tickers.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {stock && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          <StatTile label="Current Price" value={formatNaira(stock.price)} />
          <StatTile
            label="Change %"
            value={<span className={stock.change_pct >= 0 ? "text-primary" : "text-danger"}>{formatPercent(stock.change_pct)}</span>}
          />
          <StatTile label="Market Cap" value={stock.market_cap} />
          <StatTile label="Volume" value={stock.volume} />
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : isError || !history ? (
        <Card>
          <CardContent className="pt-5 text-sm text-ink-muted">
            📊 Historical data for {activeTicker} isn't available yet. Live pricing above is still fully functional.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>📈 {activeTicker} Price History</CardTitle></CardHeader>
            <CardContent>
              <PriceChart data={history.prices} />
            </CardContent>
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>📊 Return Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={returnHistogram}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="range" stroke="var(--color-ink-muted)" fontSize={10} tickLine={false} axisLine={false} interval={4} />
                    <YAxis stroke="var(--color-ink-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontFamily: "var(--font-mono)" }} />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>📉 Key Statistics</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <StatTile label="Avg Daily Return" value={history.stats.avg_daily_return != null ? formatPercent(history.stats.avg_daily_return, 3) : "—"} />
                <StatTile label="Volatility (Daily)" value={history.stats.volatility_daily != null ? `${history.stats.volatility_daily.toFixed(3)}%` : "—"} />
                <StatTile label="Best Day" value={history.stats.best_day != null ? formatPercent(history.stats.best_day) : "—"} />
                <StatTile label="Worst Day" value={history.stats.worst_day != null ? formatPercent(history.stats.worst_day) : "—"} />
                <StatTile label="52W High" value={formatNaira(history.stats.high_52w)} />
                <StatTile label="52W Low" value={formatNaira(history.stats.low_52w)} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
