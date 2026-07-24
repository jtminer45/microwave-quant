from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import data_fetcher
from ..services import backtester

router = APIRouter(prefix="/api/backtest", tags=["backtest"])


@router.get("/stocks")
def available_stocks():
    return {"stocks": backtester.AVAILABLE_STOCKS, "strategies": backtester.STRATEGIES}


class BacktestRequest(BaseModel):
    ticker: str
    strategy: str
    initial_capital: float = 1_000_000


@router.post("")
def run(body: BacktestRequest):
    if body.ticker not in backtester.AVAILABLE_STOCKS:
        raise HTTPException(400, f"Unknown ticker {body.ticker}.")
    if body.strategy not in backtester.STRATEGIES:
        raise HTTPException(400, f"Unknown strategy {body.strategy}.")

    df_bt = data_fetcher.load_historical(body.ticker)
    if df_bt is None:
        raise HTTPException(404, f"No historical data for {body.ticker}.")

    result = backtester.run_backtest(
        df_bt, body.strategy, body.initial_capital, body.ticker,
        get_volatility_fn=data_fetcher.get_stock_volatility,
    )
    if result is None:
        raise HTTPException(400, "Not enough data to run this strategy on this stock.")
    return result
