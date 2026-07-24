"""Monte Carlo portfolio simulation, ported verbatim from the Portfolio
Analytics page in app.py (same seed=42, n_simulations=1000, n_days=252,
mu=0.15, sigma=0.45 — for numeric parity), using an instance-scoped
RandomState instead of the global one so concurrent API requests don't
interfere with each other's random stream.
"""
import numpy as np


def simulate_portfolio(total_value: float, n_simulations: int = 1000, n_days: int = 252,
                        mu: float = 0.15, sigma: float = 0.45):
    rng = np.random.RandomState(42)
    simulations = np.zeros((n_days, n_simulations))

    for i in range(n_simulations):
        daily_returns = rng.normal(mu / n_days, sigma / np.sqrt(n_days), n_days)
        price_path = total_value * (1 + daily_returns).cumprod()
        simulations[:, i] = price_path

    final_values = simulations[-1, :]

    return {
        "expected_value": float(final_values.mean()),
        "best_case_95th": float(np.percentile(final_values, 95)),
        "worst_case_5th": float(np.percentile(final_values, 5)),
        "probability_of_profit": float((final_values > total_value).mean()),
        "mean_path": simulations.mean(axis=1).tolist(),
        # 100 sample paths for the fan chart, matching the original chart
        "sample_paths": simulations[:, :100].T.tolist(),
        "initial_value": total_value,
    }
