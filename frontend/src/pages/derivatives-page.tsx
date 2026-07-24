import { useEffect, useMemo, useState } from "react";
import { Sigma } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DeltaCurveChart } from "@/components/charts/delta-curve-chart";
import { useMarketPrices, useStockVolatility, useOptionPriceQuery, useOptionsScanner } from "@/api/hooks";
import { useDebouncedValue } from "@/lib/use-debounce";
import { formatNaira, formatPercent } from "@/lib/utils";

const SIGNAL_LABEL: Record<string, string> = {
  BUY_CALL: "🟢 BUY CALL",
  BUY_PUT: "🔴 BUY PUT",
  NEUTRAL: "🟡 NEUTRAL",
};
const SIGNAL_VARIANT: Record<string, "primary" | "danger" | "amber"> = {
  BUY_CALL: "primary",
  BUY_PUT: "danger",
  NEUTRAL: "amber",
};

export function DerivativesPage() {
  const { data: market } = useMarketPrices();
  const tickers = useMemo(() => market?.stocks.map((s) => s.ticker) ?? [], [market]);
  const [ticker, setTicker] = useState<string | null>(null);
  const activeTicker = ticker ?? tickers[0] ?? null;
  const stock = market?.stocks.find((s) => s.ticker === activeTicker);
  const S = stock?.price ?? 0;

  const { data: volData } = useStockVolatility(activeTicker);
  const realVol = volData?.volatility ?? 0.45;

  const [strike, setStrike] = useState<number | null>(null);
  const [months, setMonths] = useState(3);
  const [rate, setRate] = useState(27);
  const [volatility, setVolatility] = useState<number | null>(null);
  const [optionType, setOptionType] = useState<"call" | "put">("call");

  useEffect(() => {
    if (S > 0 && strike === null) setStrike(Math.round(S * 1.1 * 100) / 100);
  }, [S, strike]);
  useEffect(() => {
    if (volData && volatility === null) setVolatility(Math.round(volData.volatility * 100));
  }, [volData, volatility]);

  const params = useDebouncedValue(
    activeTicker && S > 0 && strike
      ? { ticker: activeTicker, strike, months, rate: rate / 100, volatility: (volatility ?? Math.round(realVol * 100)) / 100, option_type: optionType }
      : null,
    250
  );
  const { data: pricing, isLoading } = useOptionPriceQuery(params);
  const { data: scanner, isLoading: scannerLoading } = useOptionsScanner(months, rate / 100);

  return (
    <div>
      <PageHeader
        icon={<Sigma className="h-5 w-5" />}
        title="Derivatives Pricing"
        subtitle="Black-Scholes options pricing for NGX stocks"
        disclaimer="Data delayed 20 minutes. Not investment advice."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader><CardTitle>⚙ Parameters</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Select Stock</label>
              <Select value={activeTicker ?? ""} onChange={(e) => { setTicker(e.target.value); setStrike(null); setVolatility(null); }}>
                {tickers.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <StatTile label="Current Price" value={formatNaira(S)} />
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Strike Price (₦)</label>
              <Input type="number" step={10} value={strike ?? ""} onChange={(e) => setStrike(Number(e.target.value))} />
            </div>
            <Slider label="Time to Expiry" valueLabel={`${months} mo`} min={1} max={12} value={months} onChange={(e) => setMonths(Number(e.target.value))} />
            <Slider label="Risk-Free Rate" valueLabel={`${rate}%`} min={10} max={35} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
            <Slider
              label="Volatility"
              valueLabel={`${volatility ?? Math.round(realVol * 100)}%`}
              min={10}
              max={100}
              value={volatility ?? Math.round(realVol * 100)}
              onChange={(e) => setVolatility(Number(e.target.value))}
            />
            <p className="text-xs text-ink-dim">📊 Historical volatility for {activeTicker}: {(realVol * 100).toFixed(1)}%</p>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Option Type</label>
              <div className="flex gap-2">
                {(["call", "put"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setOptionType(t)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                      optionType === t ? "border-primary bg-primary/10 text-primary" : "border-border-strong text-ink-muted hover:bg-surface-hover"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>📊 Pricing Results</CardTitle></CardHeader>
            <CardContent>
              {isLoading || !pricing ? (
                <Skeleton className="h-24" />
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <StatTile label="Option Price" value={formatNaira(pricing.price)} />
                    <StatTile label="Break-even" value={formatNaira(pricing.break_even)} />
                    <StatTile label="Signal" value={<Badge variant={SIGNAL_VARIANT[pricing.signal]}>{SIGNAL_LABEL[pricing.signal]}</Badge>} />
                  </div>

                  <h4 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">🔢 The Greeks</h4>
                  <div className="grid grid-cols-5 gap-2">
                    <StatTile label="Delta" value={pricing.greeks.delta.toFixed(4)} />
                    <StatTile label="Gamma" value={pricing.greeks.gamma.toFixed(6)} />
                    <StatTile label="Vega" value={pricing.greeks.vega.toFixed(4)} />
                    <StatTile label="Theta" value={pricing.greeks.theta.toFixed(4)} />
                    <StatTile label="Rho" value={pricing.greeks.rho.toFixed(4)} />
                  </div>

                  <h4 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">📈 Delta Curve</h4>
                  <DeltaCurveChart data={pricing.delta_curve} currentPrice={S} strike={strike ?? 0} />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>📊 NGX Options Scanner — All Stocks</CardTitle>
          <p className="text-xs text-ink-dim">Black-Scholes pricing across all NGX stocks simultaneously</p>
        </CardHeader>
        <CardContent>
          {scannerLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                    <th className="pb-2 pr-4">Ticker</th>
                    <th className="pb-2 pr-4 text-right">Price</th>
                    <th className="pb-2 pr-4 text-right">Strike</th>
                    <th className="pb-2 pr-4 text-right">Call</th>
                    <th className="pb-2 pr-4 text-right">Put</th>
                    <th className="pb-2 pr-4 text-right">Delta</th>
                    <th className="pb-2 pr-4 text-right">IV</th>
                    <th className="pb-2 pr-4 text-right">Break-even</th>
                    <th className="pb-2 text-right">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {scanner?.results.map((r) => (
                    <tr key={r.ticker} className="border-b border-border/50 last:border-0 hover:bg-surface-hover">
                      <td className="py-2 pr-4 font-semibold">{r.ticker}</td>
                      <td className="py-2 pr-4 text-right">{formatNaira(r.price)}</td>
                      <td className="py-2 pr-4 text-right">{formatNaira(r.strike)}</td>
                      <td className="py-2 pr-4 text-right">{formatNaira(r.call_price)}</td>
                      <td className="py-2 pr-4 text-right">{formatNaira(r.put_price)}</td>
                      <td className="py-2 pr-4 text-right">{r.delta.toFixed(4)}</td>
                      <td className="py-2 pr-4 text-right">{formatPercent(r.implied_volatility, 1)}</td>
                      <td className="py-2 pr-4 text-right">{formatNaira(r.break_even)}</td>
                      <td className="py-2 text-right"><Badge variant={SIGNAL_VARIANT[r.signal]}>{SIGNAL_LABEL[r.signal]}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
