import { useEffect, useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { VarCurveChart } from "@/components/charts/var-curve-chart";
import { useMarketPrices, useVarCvar, useDeltaHedge } from "@/api/hooks";
import { useDebouncedValue } from "@/lib/use-debounce";
import { formatNaira } from "@/lib/utils";

export function RiskPage() {
  const { data: market } = useMarketPrices();
  const tickers = useMemo(() => market?.stocks.map((s) => s.ticker) ?? [], [market]);

  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    if (selected.length === 0 && tickers.length > 0) setSelected(tickers.slice(0, 3));
  }, [tickers, selected]);

  const [portfolioValue, setPortfolioValue] = useState(10_000_000);
  const [confidence, setConfidence] = useState(95);
  const [sigmaAnnual, setSigmaAnnual] = useState(45);
  const [holdingPeriod, setHoldingPeriod] = useState(1);

  const debouncedValue = useDebouncedValue(portfolioValue, 400);
  const varParams = { portfolio_value: debouncedValue, confidence, sigma_annual: sigmaAnnual / 100, holding_period: holdingPeriod };
  const { data: risk, isLoading } = useVarCvar(varParams);

  // Hedge calculator
  const [hedgeTicker, setHedgeTicker] = useState<string | null>(null);
  const activeHedgeTicker = hedgeTicker ?? selected[0] ?? null;
  const [nOptions, setNOptions] = useState(10000);
  const [hedgeRate, setHedgeRate] = useState(27);
  const [hedgeVol, setHedgeVol] = useState(45);
  const [hedgeMonths, setHedgeMonths] = useState(3);
  const deltaHedge = useDeltaHedge();
  const debouncedHedgeParams = useDebouncedValue(
    activeHedgeTicker ? { ticker: activeHedgeTicker, n_options: nOptions, rate: hedgeRate / 100, volatility: hedgeVol / 100, months: hedgeMonths } : null,
    300
  );
  useEffect(() => {
    if (debouncedHedgeParams) deltaHedge.mutate(debouncedHedgeParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedHedgeParams]);

  function toggleTicker(t: string) {
    setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  }

  return (
    <div>
      <PageHeader
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Risk Dashboard"
        subtitle="Portfolio risk metrics and analysis"
        disclaimer="Data delayed 20 minutes. Not investment advice."
      />

      <Card className="mb-6">
        <CardHeader><CardTitle>⚙ Portfolio &amp; Risk Settings</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Select Stocks</label>
            <div className="flex flex-wrap gap-1.5">
              {tickers.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTicker(t)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-mono font-semibold transition-colors ${
                    selected.includes(t) ? "border-primary/40 bg-primary/10 text-primary" : "border-border-strong text-ink-muted hover:bg-surface-hover"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Portfolio Value (₦)</label>
            <Input type="number" step={1_000_000} value={portfolioValue} onChange={(e) => setPortfolioValue(Number(e.target.value))} />
          </div>
          <div className="space-y-4">
            <Slider label="Confidence Level" valueLabel={`${confidence}%`} min={90} max={99} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} />
            <Slider label="Annual Volatility" valueLabel={`${sigmaAnnual}%`} min={10} max={100} value={sigmaAnnual} onChange={(e) => setSigmaAnnual(Number(e.target.value))} />
            <Slider label="Holding Period" valueLabel={`${holdingPeriod}d`} min={1} max={30} value={holdingPeriod} onChange={(e) => setHoldingPeriod(Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      {selected.length > 0 && risk && !isLoading && (
        <>
          <Card className="mb-6">
            <CardHeader><CardTitle>📉 Value at Risk (VaR) &amp; CVaR — {confidence}% Confidence</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-4">
                <StatTile label="Portfolio Value" value={formatNaira(portfolioValue)} />
                <StatTile label={`VaR (${holdingPeriod}d)`} value={<span className="text-danger">{formatNaira(risk.var)}</span>} delta={`-${risk.var_pct.toFixed(2)}%`} deltaPositive={false} />
                <StatTile label={`CVaR (${holdingPeriod}d)`} value={<span className="text-danger">{formatNaira(risk.cvar)}</span>} delta={`-${risk.cvar_pct.toFixed(2)}%`} deltaPositive={false} />
                <StatTile label="Volatility" value={`${sigmaAnnual}%`} />
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-ink-muted space-y-1">
                <p><b className="text-ink">VaR {confidence}%:</b> {100 - confidence}% chance of losing more than {formatNaira(risk.var)} over {holdingPeriod} day(s)</p>
                <p><b className="text-ink">CVaR {confidence}%:</b> if losses exceed VaR, the average loss will be {formatNaira(risk.cvar)}</p>
                <p>CVaR is always worse than VaR — it measures tail risk beyond VaR</p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle>📊 VaR Across Confidence Levels</CardTitle></CardHeader>
            <CardContent><VarCurveChart data={risk} selectedConfidence={confidence} /></CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>🔥 Stress Testing</CardTitle>
              <p className="text-xs text-ink-dim">What happens to your portfolio under extreme scenarios?</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                      <th className="pb-2 pr-4">Scenario</th>
                      <th className="pb-2 pr-4 text-right">Impact</th>
                      <th className="pb-2 pr-4 text-right">New Value</th>
                      <th className="pb-2 pr-4 text-right">P&amp;L</th>
                      <th className="pb-2 text-right">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {risk.stress_scenarios.map((s) => (
                      <tr key={s.scenario} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 font-sans text-ink">{s.scenario}</td>
                        <td className={`py-2 pr-4 text-right ${s.is_gain ? "text-primary" : "text-danger"}`}>{s.impact_pct > 0 ? "+" : ""}{s.impact_pct.toFixed(0)}%</td>
                        <td className="py-2 pr-4 text-right">{formatNaira(s.new_value)}</td>
                        <td className={`py-2 pr-4 text-right ${s.is_gain ? "text-primary" : "text-danger"}`}>{formatNaira(s.pnl)}</td>
                        <td className="py-2 text-right"><Badge variant={s.is_gain ? "primary" : "danger"}>{s.is_gain ? "🟢 Gain" : "🔴 Loss"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>🛡 Delta Hedge Calculator</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Stock to Hedge</label>
                  <Select value={activeHedgeTicker ?? ""} onChange={(e) => setHedgeTicker(e.target.value)}>
                    {selected.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Number of Call Options</label>
                  <Input type="number" step={1000} value={nOptions} onChange={(e) => setNOptions(Number(e.target.value))} />
                </div>
                <Slider label="Risk-Free Rate" valueLabel={`${hedgeRate}%`} min={10} max={35} value={hedgeRate} onChange={(e) => setHedgeRate(Number(e.target.value))} />
                <Slider label="Volatility" valueLabel={`${hedgeVol}%`} min={10} max={100} value={hedgeVol} onChange={(e) => setHedgeVol(Number(e.target.value))} />
                <Slider label="Time to Expiry" valueLabel={`${hedgeMonths} mo`} min={1} max={12} value={hedgeMonths} onChange={(e) => setHedgeMonths(Number(e.target.value))} />
              </div>
              <div>
                {deltaHedge.data && (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <StatTile label="Option Delta" value={deltaHedge.data.delta.toFixed(4)} />
                      <StatTile label="Shares to Short" value={deltaHedge.data.shares_to_short.toLocaleString()} />
                      <StatTile label="Hedge Cost" value={formatNaira(deltaHedge.data.hedge_cost)} />
                    </div>
                    <p className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-ink-muted">
                      To be Delta neutral on {nOptions.toLocaleString()} {activeHedgeTicker} call options — short{" "}
                      {deltaHedge.data.shares_to_short.toLocaleString()} shares at {formatNaira(deltaHedge.data.stock_price)} each.
                      Total hedge cost: <span className="text-ink font-semibold">{formatNaira(deltaHedge.data.hedge_cost)}</span>.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
