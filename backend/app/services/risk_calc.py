"""VaR/CVaR, stress testing, and delta-hedge math, ported verbatim from the
Risk Dashboard page in app.py.
"""
import math

import numpy as np
from scipy.stats import norm

STRESS_SCENARIOS = {
    "NGN devalues 20%": -0.20,
    "Oil price crashes 30%": -0.15,
    "CBN rate hike 5%": -0.10,
    "Market crash 25%": -0.25,
    "Political crisis -15%": -0.15,
    "Bull run +30%": 0.30,
    "Oil boom +25%": 0.25,
}


def compute_var_cvar(portfolio_value: float, confidence: float, sigma_annual: float,
                      holding_period: int):
    sigma_daily = sigma_annual / np.sqrt(252)
    sigma_period = sigma_daily * np.sqrt(holding_period)
    z_score = norm.ppf(confidence / 100)

    var = portfolio_value * sigma_period * z_score
    cvar = portfolio_value * sigma_period * norm.pdf(z_score) / (1 - confidence / 100)

    confidence_levels = list(range(90, 100))
    var_curve = [
        {"confidence": c, "var": float(portfolio_value * sigma_period * norm.ppf(c / 100))}
        for c in confidence_levels
    ]
    cvar_curve = [
        {"confidence": c,
         "cvar": float(portfolio_value * sigma_period * norm.pdf(norm.ppf(c / 100)) / (1 - c / 100))}
        for c in confidence_levels
    ]

    return {
        "var": float(var),
        "cvar": float(cvar),
        "var_pct": float(var / portfolio_value * 100),
        "cvar_pct": float(cvar / portfolio_value * 100),
        "var_curve": var_curve,
        "cvar_curve": cvar_curve,
    }


def stress_test(portfolio_value: float):
    results = []
    for scenario, impact in STRESS_SCENARIOS.items():
        stressed_value = portfolio_value * (1 + impact)
        pnl = stressed_value - portfolio_value
        results.append({
            "scenario": scenario,
            "impact_pct": impact * 100,
            "new_value": stressed_value,
            "pnl": pnl,
            "is_gain": impact > 0,
        })
    return results


def delta_hedge(stock_price: float, n_options: int, r: float, sigma: float, t: float):
    strike = stock_price * 1.1
    d1 = (math.log(stock_price / strike) + (r + sigma**2 / 2) * t) / (sigma * math.sqrt(t))
    delta = norm.cdf(d1)
    shares_to_short = delta * n_options
    hedge_cost = shares_to_short * stock_price
    return {
        "delta": round(delta, 4),
        "shares_to_short": round(shares_to_short),
        "hedge_cost": round(hedge_cost, 2),
        "strike": round(strike, 2),
    }
