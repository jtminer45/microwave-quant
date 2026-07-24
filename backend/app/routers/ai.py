import json

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .. import data_fetcher, llm_assistant, user_store
from ..core.constants import ASI_YTD_RETURN
from ..core.jwt_utils import get_current_username
from ..services.portfolio_sim import simulate_portfolio

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _require_ai():
    if not llm_assistant.is_available():
        raise HTTPException(503, "AI features are not configured (missing ANTHROPIC_API_KEY).")


@router.get("/status")
def status():
    return {"available": llm_assistant.is_available()}


@router.post("/commentary")
def commentary(username: str = Depends(get_current_username)):
    _require_ai()
    df = data_fetcher.get_ngx_prices()
    if df is None:
        raise HTTPException(503, "Could not fetch market data.")

    gainers = int((df["change_pct"] > 0).sum())
    losers = int((df["change_pct"] < 0).sum())
    flat = int((df["change_pct"] == 0).sum())
    top_gainers = df.nlargest(5, "change_pct")[["ticker", "change_pct"]]
    top_losers = df.nsmallest(5, "change_pct")[["ticker", "change_pct"]]
    news = data_fetcher.get_market_news()

    lines = [f"Total stocks: {len(df)} | Gainers: {gainers} | Losers: {losers} | Flat: {flat}"]
    lines.append("Top gainers: " + ", ".join(
        f"{r.ticker} ({r.change_pct:+.2f}%)" for r in top_gainers.itertuples()))
    lines.append("Top losers: " + ", ".join(
        f"{r.ticker} ({r.change_pct:+.2f}%)" for r in top_losers.itertuples()))
    if news:
        lines.append("Recent headlines: " + " | ".join(a["title"] for a in news[:5]))

    return {"commentary": llm_assistant.get_market_commentary("\n".join(lines))}


@router.post("/portfolio-analysis")
def portfolio_analysis(username: str = Depends(get_current_username)):
    _require_ai()
    holdings = user_store.load_portfolio(username) or []
    if not holdings:
        raise HTTPException(400, "No portfolio to analyze yet.")
    df = data_fetcher.get_ngx_prices()
    if df is None:
        raise HTTPException(503, "Could not fetch market data.")

    prices = {row["ticker"]: row["price"] for row in df.to_dict(orient="records") if row.get("ticker")}
    holding_lines = []
    total_cost = total_value = 0.0
    for h in holdings:
        current_price = prices.get(h["ticker"])
        if current_price is None:
            continue
        cost = h["qty"] * h["buy_price"]
        value = h["qty"] * current_price
        return_pct = ((value - cost) / cost * 100) if cost > 0 else 0
        holding_lines.append(f"{h['ticker']} ({h['qty']:,} sh, {return_pct:+.2f}%, ₦{value:,.2f} value)")
        total_cost += cost
        total_value += value

    if not holding_lines:
        raise HTTPException(400, "No portfolio to analyze yet.")

    total_pnl = total_value - total_cost
    total_return = (total_pnl / total_cost * 100) if total_cost > 0 else 0
    sim = simulate_portfolio(total_value)

    lines = [
        "Holdings: " + ", ".join(holding_lines),
        f"Total cost: ₦{total_cost:,.2f} | Current value: ₦{total_value:,.2f} | "
        f"P&L: ₦{total_pnl:,.2f} | Return: {total_return:.2f}%",
        f"ASI benchmark YTD return: {ASI_YTD_RETURN:.2f}% (alpha: {total_return - ASI_YTD_RETURN:+.2f}pp)",
        f"Monte Carlo (1yr, 1000 sims): expected ₦{sim['expected_value']:,.2f}, "
        f"95th pct ₦{sim['best_case_95th']:,.2f}, 5th pct ₦{sim['worst_case_5th']:,.2f}, "
        f"probability of profit {sim['probability_of_profit']:.1%}",
    ]
    return {"analysis": llm_assistant.get_portfolio_analysis("\n".join(lines))}


class ChatRequest(BaseModel):
    messages: list[dict]


@router.post("/chat")
def chat(body: ChatRequest, username: str = Depends(get_current_username)):
    _require_ai()
    df = data_fetcher.get_ngx_prices()
    context_lines = []
    if df is not None:
        context_lines.append("Current NGX snapshot (ticker: price, change%) — " + ", ".join(
            f"{r.ticker}: ₦{r.price:,.2f} ({r.change_pct:+.2f}%)"
            for r in df.itertuples() if pd.notna(r.ticker) and pd.notna(r.price)
        ))
    holdings = user_store.load_portfolio(username)
    if holdings:
        context_lines.append("User's portfolio: " + ", ".join(
            f"{h['ticker']} x{h['qty']:,} @ ₦{h['buy_price']:,.2f}" for h in holdings
        ))
    context_summary = "\n".join(context_lines) if context_lines else "No market data currently loaded."

    def event_stream():
        try:
            for chunk in llm_assistant.stream_chat_reply(body.messages, context_summary):
                yield f"data: {json.dumps({'text': chunk})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
