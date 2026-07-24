from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .. import data_fetcher, user_store
from ..core.constants import ASI_YTD_RETURN
from ..core.jwt_utils import get_current_username
from ..services import pdf_report, portfolio_sim

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


class Holding(BaseModel):
    ticker: str
    qty: float
    buy_price: float


class PortfolioUpdate(BaseModel):
    holdings: list[Holding]


class ReportRequest(BaseModel):
    client_name: str


def _price_map(df):
    return {row["ticker"]: row["price"] for row in df.to_dict(orient="records") if row.get("ticker")}


def _compute_summary(holdings: list, df):
    prices = _price_map(df)
    computed = []
    total_cost = 0.0
    total_value = 0.0
    for h in holdings:
        current_price = prices.get(h["ticker"])
        if current_price is None:
            continue
        cost = h["qty"] * h["buy_price"]
        value = h["qty"] * current_price
        pnl = value - cost
        return_pct = (pnl / cost * 100) if cost > 0 else 0
        computed.append({
            "ticker": h["ticker"],
            "quantity": h["qty"],
            "buy_price": h["buy_price"],
            "current_price": current_price,
            "cost": round(cost, 2),
            "value": round(value, 2),
            "pnl": round(pnl, 2),
            "return_pct": round(return_pct, 2),
        })
        total_cost += cost
        total_value += value
    total_pnl = total_value - total_cost
    total_return = (total_pnl / total_cost * 100) if total_cost > 0 else 0
    summary = {
        "total_cost": round(total_cost, 2),
        "total_value": round(total_value, 2),
        "total_pnl": round(total_pnl, 2),
        "total_return": round(total_return, 2),
        "asi_ytd_return": ASI_YTD_RETURN,
        "alpha": round(total_return - ASI_YTD_RETURN, 2),
    }
    return computed, summary


@router.get("")
def get_portfolio(username: str = Depends(get_current_username)):
    holdings = user_store.load_portfolio(username) or []
    df = data_fetcher.get_ngx_prices()
    if df is None:
        raise HTTPException(503, "Could not fetch market data.")
    computed, summary = _compute_summary(holdings, df)
    sim = portfolio_sim.simulate_portfolio(summary["total_value"]) if summary["total_value"] > 0 else None
    return {"holdings": holdings, "computed": computed, "summary": summary, "monte_carlo": sim}


@router.put("")
def update_portfolio(body: PortfolioUpdate, username: str = Depends(get_current_username)):
    holdings = [h.model_dump() for h in body.holdings]
    user_store.save_portfolio(username, holdings)
    df = data_fetcher.get_ngx_prices()
    if df is None:
        raise HTTPException(503, "Could not fetch market data.")
    computed, summary = _compute_summary(holdings, df)
    sim = portfolio_sim.simulate_portfolio(summary["total_value"]) if summary["total_value"] > 0 else None
    return {"holdings": holdings, "computed": computed, "summary": summary, "monte_carlo": sim}


@router.post("/report")
def generate_report(body: ReportRequest, username: str = Depends(get_current_username)):
    holdings = user_store.load_portfolio(username) or []
    if not holdings:
        raise HTTPException(400, "Portfolio is empty — nothing to report.")
    df = data_fetcher.get_ngx_prices()
    if df is None:
        raise HTTPException(503, "Could not fetch market data.")
    computed, summary = _compute_summary(holdings, df)
    if summary["total_value"] <= 0:
        raise HTTPException(400, "Portfolio is empty — nothing to report.")
    sim = portfolio_sim.simulate_portfolio(summary["total_value"])
    buffer = pdf_report.build_portfolio_pdf(
        body.client_name, computed, summary, ASI_YTD_RETURN, sim
    )
    filename = f"longon_capital_{body.client_name.replace(' ', '_')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
