from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import data_fetcher
from ..services import risk_calc

router = APIRouter(prefix="/api/risk", tags=["risk"])


class VarRequest(BaseModel):
    portfolio_value: float
    confidence: float = 95
    sigma_annual: float = 0.45
    holding_period: int = 1


@router.post("/var")
def var_cvar(body: VarRequest):
    if body.portfolio_value <= 0:
        raise HTTPException(400, "portfolio_value must be positive.")
    result = risk_calc.compute_var_cvar(
        body.portfolio_value, body.confidence, body.sigma_annual, body.holding_period
    )
    result["stress_scenarios"] = risk_calc.stress_test(body.portfolio_value)
    return result


class HedgeRequest(BaseModel):
    ticker: str
    n_options: int = 10000
    rate: float = 0.27
    volatility: float = 0.45
    months: int = 3


@router.post("/hedge")
def hedge(body: HedgeRequest):
    df = data_fetcher.get_ngx_prices()
    if df is None:
        raise HTTPException(503, "Could not fetch market data.")
    ticker = body.ticker.upper()
    row = df[df["ticker"] == ticker]
    if row.empty:
        raise HTTPException(404, f"Ticker {ticker} not found.")

    s = float(row.iloc[0]["price"])
    t = body.months / 12
    result = risk_calc.delta_hedge(s, body.n_options, body.rate, body.volatility, t)
    result.update({"ticker": ticker, "stock_price": s})
    return result
