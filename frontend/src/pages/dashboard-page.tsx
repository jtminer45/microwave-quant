import { useState } from "react";
import { LayoutDashboard, RefreshCw, Bot, ExternalLink } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketPrices, useMarketNews, useAiStatus, useAiCommentary } from "@/api/hooks";
import { formatNaira, formatPercent } from "@/lib/utils";
import { AiSetupNotice } from "@/components/ai-setup-notice";

export function DashboardPage() {
  const { data, isLoading, error } = useMarketPrices();
  const { data: newsData } = useMarketNews();
  const { data: aiStatus } = useAiStatus();
  const commentary = useAiCommentary();
  const queryClient = useQueryClient();
  const [showGuide, setShowGuide] = useState(true);

  const stocks = data?.stocks ?? [];
  const gainers = [...stocks].sort((a, b) => b.change_pct - a.change_pct).slice(0, 5);
  const losers = [...stocks].sort((a, b) => a.change_pct - b.change_pct).slice(0, 5);

  const breadthData = data
    ? [
        { name: "Gainers", value: data.summary.gainers, fill: "var(--color-primary)" },
        { name: "Losers", value: data.summary.losers, fill: "var(--color-danger)" },
        { name: "Flat", value: data.summary.flat, fill: "var(--color-ink-dim)" },
      ]
    : [];

  return (
    <div>
      <PageHeader
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Market Overview"
        subtitle="Live Nigerian Exchange market data"
        disclaimer="Data delayed 20 minutes. Not investment advice."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["market"] })}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      {showGuide && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="flex items-start justify-between gap-4 pt-5">
            <div className="text-sm text-ink-muted">
              <p className="mb-2 font-semibold text-ink">👋 New here? Here's the map:</p>
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <li><span className="text-ink">Market Overview</span> — today's prices &amp; news</li>
                <li><span className="text-ink">Stock Analysis</span> — one stock's history &amp; stats</li>
                <li><span className="text-ink">Portfolio</span> — build one, saved to your account</li>
                <li><span className="text-ink">Derivatives</span> — options pricing calculator</li>
                <li><span className="text-ink">Risk Dashboard</span> — VaR/CVaR &amp; stress tests</li>
                <li><span className="text-ink">Backtester</span> — test a strategy on real history</li>
                <li><span className="text-ink">AI Assistant</span> — ask questions in plain English</li>
              </ul>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowGuide(false)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-danger/30 bg-danger/5">
          <CardContent className="pt-5 text-sm text-danger">
            Could not fetch NGX data. Please check your connection and refresh.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : data ? (
        <>
          {data.source === "snapshot" && (
            <p className="mb-4 text-xs font-mono text-amber">
              ⚠ Live feed unavailable — showing last cached prices.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Total Stocks" value={data.summary.total} />
            <StatTile label="Gainers 📈" value={<span className="text-primary">{data.summary.gainers}</span>} />
            <StatTile label="Losers 📉" value={<span className="text-danger">{data.summary.losers}</span>} />
            <StatTile label="Flat ➡" value={data.summary.flat} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>🏆 Top 5 Gainers</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {gainers.map((s) => <StockRow key={s.ticker} stock={s} />)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>📉 Top 5 Losers</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {losers.map((s) => <StockRow key={s.ticker} stock={s} />)}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader><CardTitle>📋 Full NGX Market Data</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                      <th className="pb-2 pr-4">Ticker</th>
                      <th className="pb-2 pr-4">Company</th>
                      <th className="pb-2 pr-4 text-right">Price</th>
                      <th className="pb-2 pr-4 text-right">Change %</th>
                      <th className="pb-2 text-right">Market Cap</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {stocks.map((s) => (
                      <tr key={s.ticker} className="border-b border-border/50 last:border-0 hover:bg-surface-hover">
                        <td className="py-2 pr-4 font-semibold">{s.ticker}</td>
                        <td className="py-2 pr-4 font-sans text-ink-muted">{s.company}</td>
                        <td className="py-2 pr-4 text-right">{formatNaira(s.price)}</td>
                        <td className={`py-2 pr-4 text-right ${s.change_pct > 0 ? "text-primary" : s.change_pct < 0 ? "text-danger" : "text-ink-muted"}`}>
                          {formatPercent(s.change_pct)}
                        </td>
                        <td className="py-2 text-right text-ink-muted">{s.market_cap}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-ink-dim">
                Last updated: {stocks[0]?.time} WAT · Source: Mansa Markets
              </p>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader><CardTitle>📊 Market Breadth</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={breadthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-ink-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-ink-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontFamily: "var(--font-mono)" }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {breadthData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {newsData && newsData.articles.length > 0 && (
            <Card className="mt-6">
              <CardHeader><CardTitle>📰 Nigerian Market News</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {newsData.articles.slice(0, 8).map((a, i) => (
                    <a
                      key={i}
                      href={a.link}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-surface-hover"
                    >
                      <p className="text-sm font-medium text-ink group-hover:text-primary flex items-start justify-between gap-2">
                        {a.title}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5 text-ink-dim" />
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">{a.source} — {a.published}</p>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mt-6">
            <CardHeader><CardTitle><Bot className="inline h-4 w-4 mr-1.5" />AI Market Commentary</CardTitle></CardHeader>
            <CardContent>
              {aiStatus?.available ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => commentary.mutate()}
                    disabled={commentary.isPending}
                  >
                    {commentary.isPending ? "Analyzing market data…" : "🤖 Generate Commentary"}
                  </Button>
                  {commentary.data && (
                    <p className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-ink">
                      {commentary.data.commentary}
                    </p>
                  )}
                  {commentary.isError && (
                    <p className="mt-4 text-sm text-danger">Something went wrong generating commentary. Try again.</p>
                  )}
                </>
              ) : (
                <AiSetupNotice />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function StockRow({ stock }: { stock: { ticker: string; price: number; change_pct: number } }) {
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-surface-hover">
      <span className="font-mono text-sm font-semibold text-ink">{stock.ticker}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-ink-muted">{formatNaira(stock.price)}</span>
        <Badge variant={stock.change_pct > 0 ? "primary" : stock.change_pct < 0 ? "danger" : "neutral"}>
          {formatPercent(stock.change_pct)}
        </Badge>
      </div>
    </div>
  );
}
