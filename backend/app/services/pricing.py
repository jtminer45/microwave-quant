"""Black-Scholes option pricing + Greeks, ported verbatim from the formulas
in app.py's Derivatives Pricing page so results are numerically identical.
"""
import math

import numpy as np
from scipy.stats import norm


def black_scholes(s, k, t, r, sigma, option_type="call"):
    d1 = (math.log(s / k) + (r + sigma**2 / 2) * t) / (sigma * math.sqrt(t))
    d2 = d1 - sigma * math.sqrt(t)
    if option_type == "call":
        return s * norm.cdf(d1) - k * math.exp(-r * t) * norm.cdf(d2)
    return k * math.exp(-r * t) * norm.cdf(-d2) - s * norm.cdf(-d1)


def calculate_greeks(s, k, t, r, sigma):
    d1 = (math.log(s / k) + (r + sigma**2 / 2) * t) / (sigma * math.sqrt(t))
    d2 = d1 - sigma * math.sqrt(t)
    delta = norm.cdf(d1)
    gamma = norm.pdf(d1) / (s * sigma * math.sqrt(t))
    vega = s * norm.pdf(d1) * math.sqrt(t) / 100
    theta = ((-s * norm.pdf(d1) * sigma) / (2 * math.sqrt(t)) -
              r * k * math.exp(-r * t) * norm.cdf(d2)) / 365
    rho = k * t * math.exp(-r * t) * norm.cdf(d2) / 100
    return delta, gamma, vega, theta, rho


def signal_from_delta(delta: float) -> str:
    if delta > 0.5:
        return "BUY_CALL"
    if delta < 0.3:
        return "BUY_PUT"
    return "NEUTRAL"


def price_with_curve(s, k, t, r, sigma, option_type="call"):
    """Full pricing result for one option, including the delta curve across
    a stock-price range (mirrors the Derivatives Pricing page's Delta Curve chart)."""
    price = black_scholes(s, k, t, r, sigma, option_type)
    delta, gamma, vega, theta, rho = calculate_greeks(s, k, t, r, sigma)
    break_even = k + price if option_type == "call" else k - price

    stock_range = np.linspace(s * 0.5, s * 1.5, 100)
    delta_curve = [
        {"price": float(sp), "delta": float(calculate_greeks(sp, k, t, r, sigma)[0])}
        for sp in stock_range
    ]

    return {
        "price": round(price, 2),
        "break_even": round(break_even, 2),
        "signal": signal_from_delta(delta),
        "greeks": {
            "delta": round(delta, 4),
            "gamma": round(gamma, 6),
            "vega": round(vega, 4),
            "theta": round(theta, 4),
            "rho": round(rho, 4),
        },
        "delta_curve": delta_curve,
    }


def scan_all_stocks(df, t, r, get_volatility_fn):
    """Runs Black-Scholes across every NGX stock at strike = 1.1x spot
    (mirrors the NGX Options Scanner table)."""
    results = []
    for _, row in df.iterrows():
        if row.get("ticker") is None or row.get("price") is None:
            continue
        try:
            s = float(row["price"])
            k = s * 1.10
            vol = get_volatility_fn(row["ticker"])

            call_price = black_scholes(s, k, t, r, vol, "call")
            put_price = black_scholes(s, k, t, r, vol, "put")
            delta, *_ = calculate_greeks(s, k, t, r, vol)
            break_even = k + call_price

            results.append({
                "ticker": row["ticker"],
                "price": round(s, 2),
                "strike": round(k, 2),
                "call_price": round(call_price, 2),
                "put_price": round(put_price, 2),
                "delta": round(delta, 4),
                "implied_volatility": round(vol * 100, 1),
                "break_even": round(break_even, 2),
                "signal": signal_from_delta(delta),
            })
        except Exception:
            continue
    return results
