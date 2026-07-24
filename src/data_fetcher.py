import requests
import pandas as pd
import numpy as np
import os
from io import StringIO
from datetime import datetime
import streamlit as st

# Historical data bundled with the repo — works on any machine/host
HISTORICAL_PATHS = [
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "historical"),
]

# Fallback snapshot bundled with the app
FALLBACK_SNAPSHOT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "ngx_snapshot.csv"
)


def find_historical_file(ticker):
    """Return path to historical CSV for ticker, or None if unavailable."""
    for base in HISTORICAL_PATHS:
        path = os.path.join(base, f"{ticker}.csv")
        if os.path.exists(path):
            return path
    return None


@st.cache_data(ttl=900)
def get_ngx_prices():
    """Fetch live NGX prices. Falls back to bundled snapshot if scrape fails."""
    url = "https://www.mansamarkets.com/nigeria"
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

    try:
        response = requests.get(url, headers=headers, timeout=30)
        tables = pd.read_html(StringIO(response.text))
        df = tables[0]
        df.columns = ['rank', 'ticker', 'price', 'change', 'change_pct',
                      'volume', 'shares_outstanding', 'market_cap']

        df['price'] = df['price'].astype(str).str.replace('₦', '').str.replace(',', '').str.strip()
        df['price'] = pd.to_numeric(df['price'], errors='coerce')

        df['change_pct'] = df['change_pct'].astype(str).str.replace('%', '').str.strip()
        df['change_pct'] = pd.to_numeric(df['change_pct'], errors='coerce')

        # NGX tickers are 2-10 uppercase letters (e.g. "NB" for Nigerian
        # Breweries) — {3,} used to miss any 2-letter ticker entirely.
        df['company'] = df['ticker'].str.extract(r'^(.*?)([A-Z]{2,})$')[0]
        df['ticker'] = df['ticker'].str.extract(r'([A-Z]{2,})$')

        df['date'] = datetime.now().strftime('%Y-%m-%d')
        df['time'] = datetime.now().strftime('%H:%M:%S')
        df['source'] = 'live'
        df = df.drop(columns=['rank'])

        # Save snapshot for future fallback (best effort)
        try:
            os.makedirs(os.path.dirname(FALLBACK_SNAPSHOT), exist_ok=True)
            df.to_csv(FALLBACK_SNAPSHOT, index=False)
        except Exception:
            pass

        return df

    except Exception:
        # Live scrape failed — try bundled snapshot
        if os.path.exists(FALLBACK_SNAPSHOT):
            df = pd.read_csv(FALLBACK_SNAPSHOT)
            df['source'] = 'snapshot'
            return df
        return None


def get_stock_volatility(ticker):
    """Annualised volatility from historical data, sector default otherwise."""
    path = find_historical_file(ticker)

    if path:
        df = pd.read_csv(path)
        df['Price'] = pd.to_numeric(
            df['Price'].astype(str).str.replace(',', ''), errors='coerce'
        )
        df['daily_return'] = df['Price'].pct_change()
        df = df[df['daily_return'].between(-0.20, 0.20)]
        sigma = df['daily_return'].std() * np.sqrt(252)
        if pd.notna(sigma) and sigma > 0:
            return round(sigma, 4)

    return 0.45  # NGX market default when no historical data


def load_historical(ticker):
    """Load cleaned historical prices for ticker, or None if unavailable."""
    path = find_historical_file(ticker)
    if not path:
        return None

    df = pd.read_csv(path)
    df['Date'] = pd.to_datetime(df['Date'], format='mixed', dayfirst=True)
    df = df.sort_values('Date').reset_index(drop=True)
    df['Price'] = pd.to_numeric(
        df['Price'].astype(str).str.replace(',', ''), errors='coerce'
    )
    return df.dropna(subset=['Price'])

@st.cache_data(ttl=1800)  # cache 30 minutes
def get_market_news():
    """Fetch Nigerian market news from RSS feeds. Returns [] on any failure."""
    try:
        import feedparser
        feeds = [
            ("Nairametrics", "https://nairametrics.com/feed/"),
            ("BusinessDay", "https://businessday.ng/feed/"),
        ]
        articles = []
        for source, url in feeds:
            try:
                parsed = feedparser.parse(url)
                for entry in parsed.entries[:4]:
                    articles.append({
                        "source": source,
                        "title": entry.get("title", ""),
                        "link": entry.get("link", ""),
                        "published": entry.get("published", "")[:16],
                    })
            except Exception:
                continue
        return articles
    except Exception:
        return []