from fastapi import APIRouter, HTTPException

from .. import data_fetcher
from ..core.serialize import clean_records

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/prices")
def get_prices():
    df = data_fetcher.get_ngx_prices()
    if df is None:
        raise HTTPException(503, "Could not fetch NGX market data.")
    stocks = clean_records(df)
    source = stocks[0].get("source", "unknown") if stocks else "unknown"
    gainers = int((df["change_pct"] > 0).sum())
    losers = int((df["change_pct"] < 0).sum())
    flat = int((df["change_pct"] == 0).sum())
    return {
        "stocks": stocks,
        "source": source,
        "summary": {"total": len(df), "gainers": gainers, "losers": losers, "flat": flat},
    }


@router.get("/news")
def get_news():
    return {"articles": data_fetcher.get_market_news()}
