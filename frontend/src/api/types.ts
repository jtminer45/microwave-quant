export interface Stock {
  ticker: string;
  price: number;
  change: number;
  change_pct: number;
  volume: string;
  shares_outstanding: string;
  market_cap: string;
  company: string;
  date: string;
  time: string;
  source: "live" | "snapshot";
}

export interface MarketPricesResponse {
  stocks: Stock[];
  source: string;
  summary: { total: number; gainers: number; losers: number; flat: number };
}

export interface NewsArticle {
  source: string;
  title: string;
  link: string;
  published: string;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface StockHistoryResponse {
  ticker: string;
  prices: PricePoint[];
  stats: {
    avg_daily_return: number | null;
    volatility_daily: number | null;
    best_day: number | null;
    worst_day: number | null;
    high_52w: number;
    low_52w: number;
  };
}

export interface Holding {
  ticker: string;
  qty: number;
  buy_price: number;
}

export interface ComputedHolding {
  ticker: string;
  quantity: number;
  buy_price: number;
  current_price: number;
  cost: number;
  value: number;
  pnl: number;
  return_pct: number;
}

export interface PortfolioSummary {
  total_cost: number;
  total_value: number;
  total_pnl: number;
  total_return: number;
  asi_ytd_return: number;
  alpha: number;
}

export interface MonteCarloResult {
  expected_value: number;
  best_case_95th: number;
  worst_case_5th: number;
  probability_of_profit: number;
  mean_path: number[];
  sample_paths: number[][];
  initial_value: number;
}

export interface PortfolioResponse {
  holdings: Holding[];
  computed: ComputedHolding[];
  summary: PortfolioSummary;
  monte_carlo: MonteCarloResult | null;
}

export interface Greeks {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
}

export interface DeltaCurvePoint {
  price: number;
  delta: number;
}

export interface OptionPriceResponse {
  price: number;
  break_even: number;
  signal: "BUY_CALL" | "BUY_PUT" | "NEUTRAL";
  greeks: Greeks;
  delta_curve: DeltaCurvePoint[];
  ticker: string;
  current_price: number;
  implied_volatility: number;
}

export interface ScannerRow {
  ticker: string;
  price: number;
  strike: number;
  call_price: number;
  put_price: number;
  delta: number;
  implied_volatility: number;
  break_even: number;
  signal: "BUY_CALL" | "BUY_PUT" | "NEUTRAL";
}

export interface VarCurvePoint {
  confidence: number;
  var: number;
}

export interface CVarCurvePoint {
  confidence: number;
  cvar: number;
}

export interface StressScenario {
  scenario: string;
  impact_pct: number;
  new_value: number;
  pnl: number;
  is_gain: boolean;
}

export interface VarResponse {
  var: number;
  cvar: number;
  var_pct: number;
  cvar_pct: number;
  var_curve: VarCurvePoint[];
  cvar_curve: CVarCurvePoint[];
  stress_scenarios: StressScenario[];
}

export interface HedgeResponse {
  delta: number;
  shares_to_short: number;
  hedge_cost: number;
  strike: number;
  ticker: string;
  stock_price: number;
}

export interface BacktestSummary {
  strategy_return: number;
  buy_hold_return: number;
  alpha: number;
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  final_value: number;
  profit: number;
  total_days: number;
}

export interface EquityCurvePoint {
  date: string;
  strategy: number;
  buy_hold: number;
}

export interface DrawdownPoint {
  date: string;
  drawdown: number;
}

export interface SignalPoint {
  date: string;
  price: number;
}

export interface BacktestResponse {
  strategy_name: string;
  stock_name: string;
  period_start: string;
  period_end: string;
  summary: BacktestSummary;
  equity_curve: EquityCurvePoint[];
  drawdown_curve: DrawdownPoint[];
  price_with_signals: {
    prices: SignalPoint[];
    buy_signals: SignalPoint[];
    sell_signals: SignalPoint[];
  };
  monthly_returns: { month: string; return: number }[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
