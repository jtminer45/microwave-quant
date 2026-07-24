import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiFetchBlob } from "./client";
import type {
  BacktestResponse,
  Holding,
  HedgeResponse,
  MarketPricesResponse,
  NewsArticle,
  OptionPriceResponse,
  PortfolioResponse,
  ScannerRow,
  StockHistoryResponse,
  VarResponse,
} from "./types";

// ── Market ──
export function useMarketPrices() {
  return useQuery({
    queryKey: ["market", "prices"],
    queryFn: () => apiFetch<MarketPricesResponse>("/api/market/prices", { auth: false }),
    refetchInterval: 60_000,
  });
}

export function useMarketNews() {
  return useQuery({
    queryKey: ["market", "news"],
    queryFn: () => apiFetch<{ articles: NewsArticle[] }>("/api/market/news", { auth: false }),
    staleTime: 5 * 60_000,
  });
}

// ── Stocks ──
export function useStockHistory(ticker: string | null) {
  return useQuery({
    queryKey: ["stocks", ticker, "history"],
    queryFn: () => apiFetch<StockHistoryResponse>(`/api/stocks/${ticker}/history`, { auth: false }),
    enabled: !!ticker,
  });
}

export function useStockVolatility(ticker: string | null) {
  return useQuery({
    queryKey: ["stocks", ticker, "volatility"],
    queryFn: () => apiFetch<{ ticker: string; volatility: number }>(`/api/stocks/${ticker}/volatility`, { auth: false }),
    enabled: !!ticker,
  });
}

// ── Portfolio ──
export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: () => apiFetch<PortfolioResponse>("/api/portfolio"),
  });
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (holdings: Holding[]) =>
      apiFetch<PortfolioResponse>("/api/portfolio", { method: "PUT", body: { holdings } }),
    onSuccess: (data) => {
      queryClient.setQueryData(["portfolio"], data);
    },
  });
}

export function useGenerateReport() {
  return useMutation({
    mutationFn: async (clientName: string) => {
      const blob = await apiFetchBlob("/api/portfolio/report", {
        method: "POST",
        body: { client_name: clientName },
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `longon_capital_${clientName.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });
}

// ── Derivatives ──
interface OptionPriceParams {
  ticker: string;
  strike: number;
  months: number;
  rate: number;
  volatility?: number;
  option_type: string;
}

export function useOptionPriceQuery(params: OptionPriceParams | null) {
  return useQuery({
    queryKey: ["derivatives", "price", params],
    queryFn: () => apiFetch<OptionPriceResponse>("/api/derivatives/price", { method: "POST", body: params, auth: false }),
    enabled: !!params && params.strike > 0,
  });
}

export function useOptionsScanner(months: number, rate: number) {
  return useQuery({
    queryKey: ["derivatives", "scanner", months, rate],
    queryFn: () =>
      apiFetch<{ results: ScannerRow[] }>(`/api/derivatives/scanner?months=${months}&rate=${rate}`, {
        auth: false,
      }),
  });
}

// ── Risk ──
export function useVarCvar(params: {
  portfolio_value: number;
  confidence: number;
  sigma_annual: number;
  holding_period: number;
}) {
  return useQuery({
    queryKey: ["risk", "var", params],
    queryFn: () => apiFetch<VarResponse>("/api/risk/var", { method: "POST", body: params, auth: false }),
    enabled: params.portfolio_value > 0,
  });
}

export function useDeltaHedge() {
  return useMutation({
    mutationFn: (params: { ticker: string; n_options: number; rate: number; volatility: number; months: number }) =>
      apiFetch<HedgeResponse>("/api/risk/hedge", { method: "POST", body: params, auth: false }),
  });
}

// ── Backtest ──
export function useBacktestStocks() {
  return useQuery({
    queryKey: ["backtest", "stocks"],
    queryFn: () =>
      apiFetch<{ stocks: Record<string, string>; strategies: Record<string, string> }>("/api/backtest/stocks", {
        auth: false,
      }),
  });
}

export function useRunBacktest() {
  return useMutation({
    mutationFn: (params: { ticker: string; strategy: string; initial_capital: number }) =>
      apiFetch<BacktestResponse>("/api/backtest", { method: "POST", body: params, auth: false }),
  });
}

// ── AI ──
export function useAiStatus() {
  return useQuery({
    queryKey: ["ai", "status"],
    queryFn: () => apiFetch<{ available: boolean }>("/api/ai/status", { auth: false }),
    staleTime: 60_000,
  });
}

export function useAiCommentary() {
  return useMutation({
    mutationFn: () => apiFetch<{ commentary: string }>("/api/ai/commentary", { method: "POST" }),
  });
}

export function useAiPortfolioAnalysis() {
  return useMutation({
    mutationFn: () => apiFetch<{ analysis: string }>("/api/ai/portfolio-analysis", { method: "POST" }),
  });
}
