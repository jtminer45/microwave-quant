import requests
import pandas as pd
from io import StringIO
from datetime import datetime
import streamlit as st

@st.cache_data(ttl=900)  # cache for 15 minutes

def get_ngx_prices():
    url = "https://www.mansamarkets.com/nigeria"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        tables = pd.read_html(StringIO(response.text))
        df = tables[0]
        df.columns = ['rank', 'ticker', 'price', 'change', 'change_pct', 
                      'volume', 'shares_outstanding', 'market_cap']
        
        # Clean price
        df['price'] = df['price'].astype(str).str.replace('₦', '').str.replace(',', '').str.strip()
        df['price'] = pd.to_numeric(df['price'], errors='coerce')
        
        # Clean change_pct
        df['change_pct'] = df['change_pct'].astype(str).str.replace('%', '').str.strip()
        df['change_pct'] = pd.to_numeric(df['change_pct'], errors='coerce')
        
        # Split company name from ticker
        df['company'] = df['ticker'].str.extract(r'^(.*?)([A-Z]{3,})$')[0]
        df['ticker'] = df['ticker'].str.extract(r'([A-Z]{3,})$')
        
        df['date'] = datetime.now().strftime('%Y-%m-%d')
        df['time'] = datetime.now().strftime('%H:%M:%S')
        df = df.drop(columns=['rank'])
        
        return df
    
    except Exception as e:
        return None
  
def get_stock_volatility(ticker):
    """Calculate real annualised volatility from historical data"""
    import os
    import numpy as np
    
    file_path = f"/Users/minerjonathan/Desktop/ngx-predictor/data/{ticker}.csv"
    
    if os.path.exists(file_path):
        df = pd.read_csv(file_path)
        df['Price'] = pd.to_numeric(
            df['Price'].astype(str).str.replace(',', ''), errors='coerce'
        )
        df['daily_return'] = df['Price'].pct_change()
        df = df[df['daily_return'].between(-0.20, 0.20)]
        sigma = df['daily_return'].std() * np.sqrt(252)
        return round(sigma, 4)
    
    return 0.45  # default if no historical data