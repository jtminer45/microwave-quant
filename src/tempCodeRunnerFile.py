import requests
import pandas as pd
from io import StringIO
from datetime import datetime

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