"""Strategy backtesting, ported verbatim from the Strategy Backtester page in
app.py — same 4 strategies, same signal/return/drawdown/sharpe math.
"""
import numpy as np
import pandas as pd
from scipy.stats import norm

AVAILABLE_STOCKS = {
    "DANGCEM": "Dangote Cement",
    "MTNN": "MTN Nigeria",
    "GTCO": "Guaranty Trust",
    "ZENITHBANK": "Zenith Bank",
    "SEPLAT": "Seplat Energy",
    "UBA": "United Bank Africa",
    "ACCESSCORP": "Access Bank",
    "AIRTELAFRI": "Airtel Africa",
    "BUACEM": "BUA Cement",
    "NESTLE": "Nestle Nigeria",
}

STRATEGIES = {
    "buy_and_hold": "Buy and Hold",
    "ma_crossover": "Moving Average Crossover (20/50)",
    "rsi_mean_reversion": "RSI Mean Reversion",
    "delta_signal": "Delta Signal (Options Based)",
}


def run_backtest(df_bt: pd.DataFrame, strategy: str, initial_capital: float, ticker: str,
                  get_volatility_fn=None):
    if strategy not in STRATEGIES:
        raise ValueError(f"Unknown strategy: {strategy}")

    df_bt = df_bt.copy()

    if strategy == "buy_and_hold":
        df_bt["Signal"] = 1
        df_bt["Position"] = 1

    elif strategy == "ma_crossover":
        df_bt["MA20"] = df_bt["Price"].rolling(20).mean()
        df_bt["MA50"] = df_bt["Price"].rolling(50).mean()
        df_bt["Signal"] = 0
        df_bt.loc[df_bt["MA20"] > df_bt["MA50"], "Signal"] = 1
        df_bt.loc[df_bt["MA20"] < df_bt["MA50"], "Signal"] = -1
        df_bt["Position"] = df_bt["Signal"]

    elif strategy == "rsi_mean_reversion":
        delta_p = df_bt["Price"].diff()
        gain = delta_p.where(delta_p > 0, 0).rolling(14).mean()
        loss = (-delta_p.where(delta_p < 0, 0)).rolling(14).mean()
        rs = gain / loss
        df_bt["RSI"] = 100 - (100 / (1 + rs))
        df_bt["Signal"] = 0
        df_bt.loc[df_bt["RSI"] < 30, "Signal"] = 1
        df_bt.loc[df_bt["RSI"] > 70, "Signal"] = -1
        df_bt["Position"] = df_bt["Signal"]

    elif strategy == "delta_signal":
        r_bt = 0.265
        sigma_bt = get_volatility_fn(ticker) if get_volatility_fn else 0.45
        t_bt = 0.25

        deltas_bt = []
        for price_val in df_bt["Price"]:
            try:
                k = price_val * 1.10
                d1 = (np.log(price_val / k) + (r_bt + sigma_bt**2 / 2) * t_bt) / (sigma_bt * np.sqrt(t_bt))
                deltas_bt.append(norm.cdf(d1))
            except Exception:
                deltas_bt.append(0.5)

        df_bt["Delta"] = deltas_bt
        df_bt["Signal"] = 0
        df_bt.loc[df_bt["Delta"] > 0.5, "Signal"] = 1
        df_bt.loc[df_bt["Delta"] < 0.3, "Signal"] = -1
        df_bt["Position"] = df_bt["Signal"]

    df_bt["Daily_Return"] = df_bt["Price"].pct_change()
    df_bt["Strategy_Return"] = df_bt["Daily_Return"] * df_bt["Position"].shift(1)
    df_bt = df_bt.dropna(subset=["Strategy_Return"])

    if len(df_bt) == 0:
        return None

    df_bt["Portfolio_Value"] = initial_capital * (1 + df_bt["Strategy_Return"]).cumprod()
    df_bt["BuyHold_Value"] = initial_capital * (1 + df_bt["Daily_Return"]).cumprod()

    total_return_bt = (df_bt["Portfolio_Value"].iloc[-1] - initial_capital) / initial_capital * 100
    bh_return = (df_bt["BuyHold_Value"].iloc[-1] - initial_capital) / initial_capital * 100

    ret_std = df_bt["Strategy_Return"].std()
    sharpe = (df_bt["Strategy_Return"].mean() / ret_std * np.sqrt(252)) if ret_std > 0 else 0

    rolling_max = df_bt["Portfolio_Value"].cummax()
    drawdown = (df_bt["Portfolio_Value"] - rolling_max) / rolling_max * 100
    max_drawdown = drawdown.min()

    winning_days = (df_bt["Strategy_Return"] > 0).sum()
    total_days = len(df_bt)
    win_rate = winning_days / total_days * 100

    df_bt["Month"] = df_bt["Date"].dt.to_period("M")
    monthly_returns = df_bt.groupby("Month")["Strategy_Return"].sum() * 100
    monthly_returns.index = monthly_returns.index.astype(str)

    buy_signals = df_bt[df_bt["Signal"] == 1]
    sell_signals = df_bt[df_bt["Signal"] == -1]

    return {
        "strategy_name": STRATEGIES[strategy],
        "stock_name": AVAILABLE_STOCKS.get(ticker, ticker),
        "period_start": df_bt["Date"].iloc[0].strftime("%Y-%m-%d"),
        "period_end": df_bt["Date"].iloc[-1].strftime("%Y-%m-%d"),
        "summary": {
            "strategy_return": round(float(total_return_bt), 2),
            "buy_hold_return": round(float(bh_return), 2),
            "alpha": round(float(total_return_bt - bh_return), 2),
            "sharpe_ratio": round(float(sharpe), 2),
            "max_drawdown": round(float(max_drawdown), 2),
            "win_rate": round(float(win_rate), 1),
            "final_value": round(float(df_bt["Portfolio_Value"].iloc[-1]), 2),
            "profit": round(float(df_bt["Portfolio_Value"].iloc[-1] - initial_capital), 2),
            "total_days": int(total_days),
        },
        "equity_curve": [
            {"date": d.strftime("%Y-%m-%d"), "strategy": float(pv), "buy_hold": float(bh)}
            for d, pv, bh in zip(df_bt["Date"], df_bt["Portfolio_Value"], df_bt["BuyHold_Value"])
        ],
        "drawdown_curve": [
            {"date": d.strftime("%Y-%m-%d"), "drawdown": float(dd)}
            for d, dd in zip(df_bt["Date"], drawdown)
        ],
        "price_with_signals": {
            "prices": [
                {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
                for d, p in zip(df_bt["Date"], df_bt["Price"])
            ],
            "buy_signals": [
                {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
                for d, p in zip(buy_signals["Date"], buy_signals["Price"])
            ],
            "sell_signals": [
                {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
                for d, p in zip(sell_signals["Date"], sell_signals["Price"])
            ],
        },
        "monthly_returns": [
            {"month": str(m), "return": float(r)} for m, r in monthly_returns.items()
        ],
    }
