from fastapi import APIRouter, HTTPException

from .. import data_fetcher
from ..core.serialize import clean_records

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/{ticker}/history")
def get_history(ticker: str):
    ticker = ticker.upper()
    df = data_fetcher.load_historical(ticker)
    if df is None:
        raise HTTPException(404, f"No historical data available for {ticker}.")

    df = df.copy()
    df["daily_return"] = df["Price"].pct_change() * 100
    price_series = df[["Date", "Price"]].copy()
    price_series["Date"] = price_series["Date"].dt.strftime("%Y-%m-%d")
    price_series = price_series.rename(columns={"Date": "date", "Price": "price"})
    prices = clean_records(price_series)

    returns = df["daily_return"].dropna()
    stats = {
        "avg_daily_return": float(returns.mean()) if len(returns) else None,
        "volatility_daily": float(returns.std()) if len(returns) else None,
        "best_day": float(returns.max()) if len(returns) else None,
        "worst_day": float(returns.min()) if len(returns) else None,
        "high_52w": float(df["Price"].max()),
        "low_52w": float(df["Price"].min()),
    }
    return {"ticker": ticker, "prices": prices, "stats": stats}


@router.get("/{ticker}/volatility")
def get_volatility(ticker: str):
    ticker = ticker.upper()
    return {"ticker": ticker, "volatility": data_fetcher.get_stock_volatility(ticker)}
