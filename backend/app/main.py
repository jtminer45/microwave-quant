import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import ai, auth, backtest, derivatives, market, portfolio, risk, stocks

app = FastAPI(title="Longon Capital API", version="1.0.0")

_origins_env = os.environ.get("CORS_ORIGINS", "http://localhost:5173")
origins = [o.strip() for o in _origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(market.router)
app.include_router(stocks.router)
app.include_router(portfolio.router)
app.include_router(derivatives.router)
app.include_router(risk.router)
app.include_router(backtest.router)
app.include_router(ai.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "longon-capital-api"}
