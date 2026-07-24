from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import data_fetcher
from ..services import pricing

router = APIRouter(prefix="/api/derivatives", tags=["derivatives"])


class PriceRequest(BaseModel):
    ticker: str
    strike: float
    months: int = 3
    rate: float = 0.27
    volatility: float | None = None
    option_type: str = "call"


@router.post("/price")
def price_option(body: PriceRequest):
    if body.option_type not in ("call", "put"):
        raise HTTPException(400, "option_type must be 'call' or 'put'.")
    df = data_fetcher.get_ngx_prices()
    if df is None:
        raise HTTPException(503, "Could not fetch market data.")
    ticker = body.ticker.upper()
    row = df[df["ticker"] == ticker]
    if row.empty:
        raise HTTPException(404, f"Ticker {ticker} not found.")

    s = float(row.iloc[0]["price"])
    vol = body.volatility if body.volatility is not None else data_fetcher.get_stock_volatility(ticker)
    t = body.months / 12
    result = pricing.price_with_curve(s, body.strike, t, body.rate, vol, body.option_type)
    result.update({"ticker": ticker, "current_price": s, "implied_volatility": vol})
    return result


@router.get("/scanner")
def scan(months: int = 3, rate: float = 0.27):
    df = data_fetcher.get_ngx_prices()
    if df is None:
        raise HTTPException(503, "Could not fetch market data.")
    t = months / 12
    results = pricing.scan_all_stocks(df, t, rate, data_fetcher.get_stock_volatility)
    return {"results": results}
