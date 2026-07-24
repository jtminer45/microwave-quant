import { useEffect, useMemo, useState } from "react";
import { Briefcase, Plus, Minus, Bot, FileDown } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MonteCarloChart } from "@/components/charts/monte-carlo-chart";
import { AllocationDonut } from "@/components/charts/allocation-donut";
import { AiSetupNotice } from "@/components/ai-setup-notice";
import { useMarketPrices, usePortfolio, useUpdatePortfolio, useGenerateReport, useAiStatus, useAiPortfolioAnalysis } from "@/api/hooks";
import { useDebouncedValue } from "@/lib/use-debounce";
import { formatNaira, formatPercent } from "@/lib/utils";
import type { Holding } from "@/api/types";

const ASI_YTD = 32.32;

export function PortfolioPage() {
  const { data: market } = useMarketPrices();
  const tickers = useMemo(() => market?.stocks.map((s) => s.ticker) ?? [], [market]);
  const { data: portfolio, isLoading } = usePortfolio();
  const updatePortfolio = useUpdatePortfolio();
  const generateReport = useGenerateReport();
  const { data: aiStatus } = useAiStatus();
  const aiAnalysis = useAiPortfolioAnalysis();

  const [rows, setRows] = useState<Holding[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [clientName, setClientName] = useState("PIPC Securities");

  useEffect(() => {
    if (!initialized && portfolio && tickers.length > 0) {
      if (portfolio.holdings.length > 0) {
        setRows(portfolio.holdings);
      } else {
        const first = market?.stocks[0];
        setRows([{ ticker: tickers[0], qty: 1000, buy_price: first?.price ?? 0 }]);
      }
      setInitialized(true);
    }
  }, [portfolio, tickers, market, initialized]);

  const debouncedRows = useDebouncedValue(rows, 700);
  useEffect(() => {
    if (initialized && debouncedRows.length > 0) {
      updatePortfolio.mutate(debouncedRows);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedRows, initialized]);

  function addRow() {
    const first = market?.stocks[0];
    setRows((r) => [...r, { ticker: tickers[0] ?? "", qty: 1000, buy_price: first?.price ?? 0 }]);
  }
  function removeLastRow() {
    setRows((r) => (r.length > 1 ? r.slice(0, -1) : r));
  }
  function updateRow(i: number, patch: Partial<Holding>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  const computed = portfolio?.computed ?? [];
  const summary = portfolio?.summary;
  const monteCarlo = portfolio?.monte_carlo;

  return (
    <div>
      <PageHeader
        icon={<Briefcase className="h-5 w-5" />}
        title="Portfolio Analytics"
        subtitle="Build and analyse your NGX portfolio — saved automatically to your account"
        disclaimer="Data delayed 20 minutes. Not investment advice."
      />

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>📋 Build Your Portfolio</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-3.5 w-3.5" /> Add Stock</Button>
              <Button size="sm" variant="ghost" onClick={removeLastRow} disabled={rows.length <= 1}>
                <Minus className="h-3.5 w-3.5" /> Remove Last
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-3">
              <Select value={row.ticker} onChange={(e) => updateRow(i, { ticker: e.target.value })}>
                {tickers.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Input
                type="number"
                value={row.qty}
                onChange={(e) => updateRow(i, { qty: Number(e.target.value) })}
                placeholder="Quantity"
              />
              <Input
                type="number"
                value={row.buy_price}
                onChange={(e) => updateRow(i, { buy_price: Number(e.target.value) })}
                placeholder="Buy Price (₦)"
              />
            </div>
          ))}
          {updatePortfolio.isPending && <p className="text-xs text-ink-dim">Saving…</p>}
        </CardContent>
      </Card>

      {isLoading || !summary ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
            <StatTile label="Total Cost" value={formatNaira(summary.total_cost)} />
            <StatTile label="Current Value" value={formatNaira(summary.total_value)} />
            <StatTile
              label="P&L"
              value={<span className={summary.total_pnl >= 0 ? "text-primary" : "text-danger"}>{formatNaira(summary.total_pnl)}</span>}
              delta={formatPercent(summary.total_return)}
              deltaPositive={summary.total_return >= 0}
            />
            <StatTile
              label="Total Return"
              value={<span className={summary.total_return >= 0 ? "text-primary" : "text-danger"}>{formatPercent(summary.total_return)}</span>}
            />
          </div>

          <Card className="mb-6">
            <CardHeader><CardTitle>📋 Holdings Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                      <th className="pb-2 pr-4">Ticker</th>
                      <th className="pb-2 pr-4 text-right">Qty</th>
                      <th className="pb-2 pr-4 text-right">Buy Price</th>
                      <th className="pb-2 pr-4 text-right">Current</th>
                      <th className="pb-2 pr-4 text-right">P&L</th>
                      <th className="pb-2 text-right">Return %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computed.map((h) => (
                      <tr key={h.ticker} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 font-semibold">{h.ticker}</td>
                        <td className="py-2 pr-4 text-right">{h.quantity.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-right">{formatNaira(h.buy_price)}</td>
                        <td className="py-2 pr-4 text-right">{formatNaira(h.current_price)}</td>
                        <td className={`py-2 pr-4 text-right ${h.pnl >= 0 ? "text-primary" : "text-danger"}`}>{formatNaira(h.pnl)}</td>
                        <td className={`py-2 text-right ${h.return_pct >= 0 ? "text-primary" : "text-danger"}`}>{formatPercent(h.return_pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {computed.length > 0 && (
            <Card className="mb-6">
              <CardHeader><CardTitle>🥧 Portfolio Allocation</CardTitle></CardHeader>
              <CardContent><AllocationDonut holdings={computed} /></CardContent>
            </Card>
          )}

          {monteCarlo && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>🎲 Monte Carlo Simulation</CardTitle>
                <p className="text-xs text-ink-dim">1,000 scenarios over 252 trading days</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
                  <StatTile label="Expected Value" value={formatNaira(monteCarlo.expected_value)} />
                  <StatTile label="Best Case (95th)" value={formatNaira(monteCarlo.best_case_95th)} />
                  <StatTile label="Worst Case (5th)" value={formatNaira(monteCarlo.worst_case_5th)} />
                  <StatTile label="Prob. of Profit" value={`${(monteCarlo.probability_of_profit * 100).toFixed(1)}%`} />
                </div>
                <MonteCarloChart result={monteCarlo} />
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader><CardTitle>📊 Portfolio vs ASI Benchmark</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <StatTile label="Your Portfolio" value={formatPercent(summary.total_return)} />
                <StatTile label="ASI Benchmark" value={formatPercent(ASI_YTD)} />
                <StatTile
                  label="Alpha"
                  value={<span className={summary.alpha >= 0 ? "text-primary" : "text-danger"}>{formatPercent(summary.alpha)}</span>}
                />
              </div>
              <p className={`text-sm font-medium ${summary.alpha >= 0 ? "text-primary" : "text-amber"}`}>
                {summary.alpha >= 0
                  ? `✅ Outperforming ASI by ${summary.alpha.toFixed(2)} percentage points`
                  : `⚠ Underperforming ASI by ${Math.abs(summary.alpha).toFixed(2)} percentage points`}
              </p>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle><Bot className="inline h-4 w-4 mr-1.5" />AI Portfolio Analysis</CardTitle></CardHeader>
            <CardContent>
              {aiStatus?.available ? (
                <>
                  <Button variant="outline" onClick={() => aiAnalysis.mutate()} disabled={aiAnalysis.isPending}>
                    {aiAnalysis.isPending ? "Analyzing portfolio…" : "🤖 Analyze My Portfolio"}
                  </Button>
                  {aiAnalysis.data && (
                    <p className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-ink">
                      {aiAnalysis.data.analysis}
                    </p>
                  )}
                  {aiAnalysis.isError && <p className="mt-4 text-sm text-danger">Couldn't analyze the portfolio. Try again.</p>}
                </>
              ) : (
                <AiSetupNotice />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>📄 Generate Client Report</CardTitle></CardHeader>
            <CardContent>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Client Name</label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} className="max-w-xs mb-3" />
              <Button onClick={() => generateReport.mutate(clientName)} disabled={generateReport.isPending}>
                <FileDown className="h-4 w-4" /> {generateReport.isPending ? "Generating…" : "Download PDF Report"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
