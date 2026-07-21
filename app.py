import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
import numpy as np
import math
import os
import sys
import io
from datetime import datetime
from scipy.stats import norm

sys.path.append('src')
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src'))
from data_fetcher import get_ngx_prices, get_stock_volatility, load_historical

# ── Page Config ──
st.set_page_config(
    page_title="Microwave Quant",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ── Sidebar ──
st.sidebar.title("📈 Microwave Quant")
st.sidebar.markdown("*Nigeria's First Quantitative Analytics Platform*")
st.sidebar.markdown("---")

page = st.sidebar.selectbox(
    "Navigate",
    ["🏠 Market Overview",
     "📊 Stock Analysis",
     "💼 Portfolio Analytics",
     "⚡ Derivatives Pricing",
     "⚠️ Risk Dashboard",
     "🔬 Strategy Backtester"]
)

st.sidebar.markdown("---")
st.sidebar.markdown("""
**📚 Data & Methodology**
- Prices: Mansa Markets (20-min delay)
- Models: Black-Scholes, GBM Monte Carlo
- Risk: Parametric VaR / CVaR
""")
st.sidebar.warning("""
⚠️ **Disclaimer**
Delayed market data. For analytical purposes only. 
Not investment advice. Past performance does not 
guarantee future results.
""")
st.sidebar.markdown("Built by **Jonathan Miner**")
st.sidebar.markdown("© 2026 Microwave Quant")

# ── Helper Functions ──
def black_scholes(s, k, t, r, sigma, option_type="call"):
    d1 = (math.log(s/k) + (r + sigma**2/2) * t) / (sigma * math.sqrt(t))
    d2 = d1 - sigma * math.sqrt(t)
    if option_type == "call":
        return s * norm.cdf(d1) - k * math.exp(-r*t) * norm.cdf(d2)
    return k * math.exp(-r*t) * norm.cdf(-d2) - s * norm.cdf(-d1)

def calculate_greeks(s, k, t, r, sigma):
    d1 = (math.log(s/k) + (r + sigma**2/2) * t) / (sigma * math.sqrt(t))
    d2 = d1 - sigma * math.sqrt(t)
    delta = norm.cdf(d1)
    gamma = norm.pdf(d1) / (s * sigma * math.sqrt(t))
    vega = s * norm.pdf(d1) * math.sqrt(t) / 100
    theta = ((-s * norm.pdf(d1) * sigma) / (2 * math.sqrt(t)) -
             r * k * math.exp(-r*t) * norm.cdf(d2)) / 365
    rho = k * t * math.exp(-r*t) * norm.cdf(d2) / 100
    return delta, gamma, vega, theta, rho

def data_source_banner(df):
    if 'source' in df.columns and str(df['source'].iloc[0]) == 'snapshot':
        st.warning("⚠️ Live feed unavailable — showing last cached prices.")

# ═══════════════════════════════════════════
# 🏠 MARKET OVERVIEW
# ═══════════════════════════════════════════
if page == "🏠 Market Overview":
    st.caption("⚠️ Data delayed 20 minutes. Not investment advice.")
    st.title("🏠 NGX Market Overview")
    st.markdown("*Live Nigerian Exchange Market Data*")

    if st.button("🔄 Refresh Data"):
        st.cache_data.clear()
        st.rerun()

    with st.spinner("Fetching live NGX data..."):
        df = get_ngx_prices()

    if df is not None:
        data_source_banner(df)

        gainers = len(df[df['change_pct'] > 0])
        losers = len(df[df['change_pct'] < 0])
        flat = len(df[df['change_pct'] == 0])

        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Total Stocks", len(df))
        col2.metric("Gainers 📈", gainers)
        col3.metric("Losers 📉", losers)
        col4.metric("Flat ➡️", flat)

        st.markdown("---")

        col1, col2 = st.columns(2)
        with col1:
            st.subheader("🏆 Top 5 Gainers")
            gainers_df = df.nlargest(5, 'change_pct')[['ticker', 'price', 'change_pct']]
            gainers_df.columns = ['Ticker', 'Price (₦)', 'Change %']
            st.dataframe(gainers_df, use_container_width=True, hide_index=True)

        with col2:
            st.subheader("📉 Top 5 Losers")
            losers_df = df.nsmallest(5, 'change_pct')[['ticker', 'price', 'change_pct']]
            losers_df.columns = ['Ticker', 'Price (₦)', 'Change %']
            st.dataframe(losers_df, use_container_width=True, hide_index=True)

        st.markdown("---")
        st.subheader("📋 Full NGX Market Data")

        def color_change(val):
            color = 'green' if val > 0 else 'red' if val < 0 else 'gray'
            return f'color: {color}'

        display_df = df[['ticker', 'company', 'price', 'change_pct', 'market_cap']].copy()
        display_df.columns = ['Ticker', 'Company', 'Price (₦)', 'Change %', 'Market Cap']
        styled = display_df.style.applymap(color_change, subset=['Change %'])
        st.dataframe(styled, use_container_width=True, hide_index=True)

        st.markdown("---")
        st.subheader("📊 Market Breadth")

        fig = go.Figure(data=[
            go.Bar(name='Gainers', x=['Market Breadth'], y=[gainers], marker_color='green'),
            go.Bar(name='Losers', x=['Market Breadth'], y=[losers], marker_color='red'),
            go.Bar(name='Flat', x=['Market Breadth'], y=[flat], marker_color='gray')
        ])
        fig.update_layout(barmode='group', height=300)
        st.plotly_chart(fig, use_container_width=True)

        st.caption(f"Last updated: {df['time'].iloc[0]} WAT | Source: Mansa Markets")

    else:
        st.error("Could not fetch NGX data. Please check your internet connection and refresh.")

# ═══════════════════════════════════════════
# 📊 STOCK ANALYSIS
# ═══════════════════════════════════════════
elif page == "📊 Stock Analysis":
    st.caption("⚠️ Data delayed 20 minutes. Not investment advice.")
    st.title("📊 Stock Analysis")
    st.markdown("*Deep dive into any NGX listed stock*")

    with st.spinner("Loading market data..."):
        df = get_ngx_prices()

    if df is not None:
        data_source_banner(df)

        ticker = st.selectbox("Select Stock", df['ticker'].dropna().tolist())
        stock = df[df['ticker'] == ticker].iloc[0]

        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Current Price", f"₦{stock['price']:,.2f}")
        col2.metric("Change %", f"{stock['change_pct']:.2f}%")
        col3.metric("Market Cap", stock['market_cap'])
        col4.metric("Volume", stock['volume'])

        st.markdown("---")

        hist_df = load_historical(ticker)

        if hist_df is not None:
            st.subheader(f"📈 {ticker} Price History")
            fig = px.line(hist_df, x='Date', y='Price',
                         title=f"{ticker} Historical Price",
                         color_discrete_sequence=['#1B3A6B'])
            fig.update_layout(height=400)
            st.plotly_chart(fig, use_container_width=True)

            hist_df['daily_return'] = hist_df['Price'].pct_change() * 100

            col1, col2 = st.columns(2)
            with col1:
                st.subheader("📊 Return Distribution")
                fig2 = px.histogram(hist_df.dropna(), x='daily_return',
                                   nbins=50, title="Daily Returns Distribution",
                                   color_discrete_sequence=['#2E74B5'])
                st.plotly_chart(fig2, use_container_width=True)

            with col2:
                st.subheader("📉 Key Statistics")
                returns = hist_df['daily_return'].dropna()
                st.metric("Average Daily Return", f"{returns.mean():.3f}%")
                st.metric("Volatility (Daily)", f"{returns.std():.3f}%")
                st.metric("Best Day", f"{returns.max():.2f}%")
                st.metric("Worst Day", f"{returns.min():.2f}%")
                st.metric("52W High", f"₦{hist_df['Price'].max():,.2f}")
                st.metric("52W Low", f"₦{hist_df['Price'].min():,.2f}")
        else:
            st.info(f"📊 Historical charts for {ticker} are available in the full version. Live pricing and derivatives are fully functional.")

    else:
        st.error("Could not fetch market data.")

# ═══════════════════════════════════════════
# 💼 PORTFOLIO ANALYTICS
# ═══════════════════════════════════════════
elif page == "💼 Portfolio Analytics":
    st.caption("⚠️ Data delayed 20 minutes. Not investment advice.")
    st.title("💼 Portfolio Analytics")
    st.markdown("*Build and analyse your NGX portfolio*")

    with st.spinner("Loading market data..."):
        df = get_ngx_prices()

    if df is not None:
        data_source_banner(df)
        tickers = df['ticker'].dropna().tolist()

        st.subheader("📋 Build Your Portfolio")

        if 'portfolio_stocks' not in st.session_state:
            st.session_state.portfolio_stocks = [
                {"ticker": tickers[0], "qty": 1000,
                 "buy_price": float(df[df['ticker']==tickers[0]]['price'].iloc[0])}
            ]

        col1, col2 = st.columns([1, 5])
        with col1:
            if st.button("➕ Add Stock"):
                st.session_state.portfolio_stocks.append(
                    {"ticker": tickers[0], "qty": 1000,
                     "buy_price": float(df[df['ticker']==tickers[0]]['price'].iloc[0])}
                )
        with col2:
            if st.button("➖ Remove Last") and len(st.session_state.portfolio_stocks) > 1:
                st.session_state.portfolio_stocks.pop()

        st.markdown("---")

        for i, stock in enumerate(st.session_state.portfolio_stocks):
            col1, col2, col3 = st.columns(3)
            with col1:
                ticker_sel = st.selectbox(f"Stock {i+1}", tickers,
                                         key=f"ticker_{i}",
                                         index=tickers.index(stock['ticker']) if stock['ticker'] in tickers else 0)
                st.session_state.portfolio_stocks[i]['ticker'] = ticker_sel
            with col2:
                qty = st.number_input("Quantity", min_value=1,
                                     value=stock['qty'], key=f"qty_{i}")
                st.session_state.portfolio_stocks[i]['qty'] = qty
            with col3:
                buy_px = st.number_input("Buy Price (₦)", min_value=0.01,
                                        value=stock['buy_price'], key=f"buy_{i}")
                st.session_state.portfolio_stocks[i]['buy_price'] = buy_px

        st.markdown("---")

        portfolio = []
        for s in st.session_state.portfolio_stocks:
            current_price = float(df[df['ticker']==s['ticker']]['price'].iloc[0])
            cost = s['qty'] * s['buy_price']
            value = s['qty'] * current_price
            pnl = value - cost
            return_pct = (pnl / cost * 100) if cost > 0 else 0
            portfolio.append({
                "Ticker": s['ticker'],
                "Quantity": s['qty'],
                "Buy Price (₦)": s['buy_price'],
                "Current Price (₦)": current_price,
                "Cost (₦)": round(cost, 2),
                "Value (₦)": round(value, 2),
                "P&L (₦)": round(pnl, 2),
                "Return %": round(return_pct, 2)
            })

        portfolio_df = pd.DataFrame(portfolio)
        total_cost = portfolio_df['Cost (₦)'].sum()
        total_value = portfolio_df['Value (₦)'].sum()
        total_pnl = total_value - total_cost
        total_return = (total_pnl / total_cost * 100) if total_cost > 0 else 0

        st.subheader("📊 Portfolio Summary")
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Total Cost", f"₦{total_cost:,.2f}")
        col2.metric("Current Value", f"₦{total_value:,.2f}")
        col3.metric("P&L", f"₦{total_pnl:,.2f}", delta=f"{total_return:.2f}%")
        col4.metric("Total Return", f"{total_return:.2f}%")

        st.markdown("---")
        st.subheader("📋 Holdings Breakdown")
        st.dataframe(portfolio_df, use_container_width=True, hide_index=True)

        st.markdown("---")
        st.subheader("🥧 Portfolio Allocation")
        fig_pie = px.pie(portfolio_df, values='Value (₦)', names='Ticker',
                        title="Portfolio Allocation by Value")
        st.plotly_chart(fig_pie, use_container_width=True)

        st.markdown("---")
        st.subheader("🎲 Monte Carlo Simulation")
        st.markdown("*1,000 scenarios over 252 trading days*")

        n_simulations = 1000
        n_days = 252
        mu = 0.15
        sigma_mc = 0.45

        np.random.seed(42)
        simulations = np.zeros((n_days, n_simulations))

        for i in range(n_simulations):
            daily_returns = np.random.normal(mu/n_days, sigma_mc/np.sqrt(n_days), n_days)
            price_path = total_value * (1 + daily_returns).cumprod()
            simulations[:, i] = price_path

        final_values = simulations[-1, :]

        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Expected Value", f"₦{final_values.mean():,.2f}")
        col2.metric("Best Case (95th)", f"₦{np.percentile(final_values, 95):,.2f}")
        col3.metric("Worst Case (5th)", f"₦{np.percentile(final_values, 5):,.2f}")
        col4.metric("Prob of Profit", f"{(final_values > total_value).mean():.1%}")

        fig = go.Figure()
        for i in range(100):
            fig.add_trace(go.Scatter(y=simulations[:, i], mode='lines',
                                    line=dict(color='blue', width=0.3),
                                    opacity=0.1, showlegend=False))
        fig.add_trace(go.Scatter(y=simulations.mean(axis=1), mode='lines',
                                name='Mean Path', line=dict(color='red', width=2)))
        fig.add_hline(y=total_value, line_dash="dash", line_color="green",
                     annotation_text="Initial Value")
        fig.update_layout(title="Portfolio Monte Carlo Simulation",
                         xaxis_title="Trading Days",
                         yaxis_title="Portfolio Value (₦)",
                         height=400)
        st.plotly_chart(fig, use_container_width=True)

        # ── ASI Benchmark ──
        st.markdown("---")
        st.subheader("📊 Portfolio vs ASI Benchmark")

        asi_ytd = 32.32

        col1, col2, col3 = st.columns(3)
        col1.metric("Your Portfolio Return", f"{total_return:.2f}%")
        col2.metric("ASI Benchmark Return", f"{asi_ytd:.2f}%")
        col3.metric("Alpha (Outperformance)",
                   f"{total_return - asi_ytd:.2f}%",
                   delta="above market" if total_return > asi_ytd else "below market",
                   delta_color="normal" if total_return > asi_ytd else "inverse")

        fig_bench = go.Figure(data=[
            go.Bar(name='Your Portfolio', x=['Returns'],
                  y=[total_return], marker_color='#1B3A6B'),
            go.Bar(name='ASI Benchmark', x=['Returns'],
                  y=[asi_ytd], marker_color='#2E74B5'),
        ])
        fig_bench.update_layout(barmode='group',
            title="Portfolio Return vs ASI Benchmark",
            yaxis_title="Return (%)", height=350)
        st.plotly_chart(fig_bench, use_container_width=True)

        if total_return > asi_ytd:
            st.success(f"✅ Outperforming ASI by {total_return - asi_ytd:.2f} percentage points")
        else:
            st.warning(f"⚠️ Underperforming ASI by {asi_ytd - total_return:.2f} percentage points")

        # ── PDF Report ──
        st.markdown("---")
        st.subheader("📄 Generate Client Report")

        client_name = st.text_input("Client Name", value="PIPC Securities")

        if st.button("📥 Generate PDF Report"):
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.units import inch

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4,
                                   rightMargin=50, leftMargin=50,
                                   topMargin=50, bottomMargin=50)

            styles = getSampleStyleSheet()
            story = []

            title_style = ParagraphStyle('Title', parent=styles['Heading1'],
                fontSize=24, textColor=colors.HexColor('#1B3A6B'), spaceAfter=10)
            subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'],
                fontSize=11, textColor=colors.gray, spaceAfter=20)
            body_style = ParagraphStyle('Body', parent=styles['Normal'],
                fontSize=10, spaceAfter=8)

            story.append(Paragraph("Microwave Quant", title_style))
            story.append(Paragraph("Nigerian Exchange Portfolio Analytics Report", subtitle_style))
            story.append(Paragraph(f"Client: {client_name}", body_style))
            story.append(Paragraph(f"Report Date: {datetime.now().strftime('%B %d, %Y')}", body_style))
            story.append(Spacer(1, 20))

            story.append(Paragraph("Portfolio Summary", styles['Heading2']))
            summary_data = [
                ['Metric', 'Value'],
                ['Total Cost', f"NGN {total_cost:,.2f}"],
                ['Current Value', f"NGN {total_value:,.2f}"],
                ['Total P&L', f"NGN {total_pnl:,.2f}"],
                ['Total Return', f"{total_return:.2f}%"],
                ['ASI Benchmark', f"{asi_ytd:.2f}%"],
                ['Alpha', f"{total_return - asi_ytd:.2f}%"],
            ]
            summary_table = Table(summary_data, colWidths=[3*inch, 3*inch])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1B3A6B')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 10),
                ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0,1), (-1,-1),
                 [colors.white, colors.HexColor('#EBF3FB')]),
                ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ]))
            story.append(summary_table)
            story.append(Spacer(1, 20))

            story.append(Paragraph("Holdings Breakdown", styles['Heading2']))
            holdings_data = [['Ticker', 'Qty', 'Buy Price', 'Current', 'P&L', 'Return %']]
            for p in portfolio:
                holdings_data.append([
                    p['Ticker'], f"{p['Quantity']:,}",
                    f"NGN {p['Buy Price (₦)']:,.2f}",
                    f"NGN {p['Current Price (₦)']:,.2f}",
                    f"NGN {p['P&L (₦)']:,.2f}",
                    f"{p['Return %']:.2f}%"
                ])
            holdings_table = Table(holdings_data,
                colWidths=[0.9*inch, 0.7*inch, 1.3*inch, 1.3*inch, 1.3*inch, 0.8*inch])
            holdings_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1B3A6B')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 9),
                ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0,1), (-1,-1),
                 [colors.white, colors.HexColor('#EBF3FB')]),
            ]))
            story.append(holdings_table)
            story.append(Spacer(1, 20))

            story.append(Paragraph("Monte Carlo Simulation — 1,000 Scenarios", styles['Heading2']))
            mc_data = [
                ['Metric', 'Value'],
                ['Expected Value (1 year)', f"NGN {final_values.mean():,.2f}"],
                ['Best Case (95th percentile)', f"NGN {np.percentile(final_values, 95):,.2f}"],
                ['Worst Case (5th percentile)', f"NGN {np.percentile(final_values, 5):,.2f}"],
                ['Probability of Profit', f"{(final_values > total_value).mean():.1%}"],
            ]
            mc_table = Table(mc_data, colWidths=[3*inch, 3*inch])
            mc_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1B3A6B')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 10),
                ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0,1), (-1,-1),
                 [colors.white, colors.HexColor('#EBF3FB')]),
                ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ]))
            story.append(mc_table)
            story.append(Spacer(1, 20))

            story.append(Paragraph("Disclaimer", styles['Heading2']))
            story.append(Paragraph(
                "This report is generated by Microwave Quant for analytical purposes only "
                "and does not constitute investment advice. Past performance does not guarantee "
                "future results. All data is sourced from public market data and may be delayed. "
                "(c) 2026 Microwave Quant — Built by Jonathan Miner",
                body_style
            ))

            doc.build(story)
            buffer.seek(0)

            st.download_button(
                label="📥 Download PDF Report",
                data=buffer,
                file_name=f"microwave_quant_{client_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf",
                mime="application/pdf"
            )
            st.success("✅ Report generated successfully!")

    else:
        st.error("Could not fetch market data.")

# ═══════════════════════════════════════════
# ⚡ DERIVATIVES PRICING
# ═══════════════════════════════════════════
elif page == "⚡ Derivatives Pricing":
    st.caption("⚠️ Data delayed 20 minutes. Not investment advice.")
    st.title("⚡ Derivatives Pricing")
    st.markdown("*Black-Scholes Options Pricing for NGX Stocks*")

    with st.spinner("Loading market data..."):
        df = get_ngx_prices()

    if df is not None:
        data_source_banner(df)

        col1, col2 = st.columns([1, 2])

        with col1:
            st.subheader("⚙️ Parameters")
            ticker = st.selectbox("Select Stock", df['ticker'].dropna().tolist())
            stock_row = df[df['ticker'] == ticker].iloc[0]
            S = stock_row['price']

            st.metric("Current Price", f"₦{S:,.2f}")

            K = st.number_input("Strike Price (₦)",
                               value=float(round(S * 1.1, 2)), step=10.0)
            T = st.slider("Time to Expiry (months)", 1, 12, 3) / 12
            r = st.slider("Risk-Free Rate (%)", 10, 35, 27) / 100

            real_vol = get_stock_volatility(ticker)
            sigma = st.slider("Volatility (%)", 10, 100, int(real_vol * 100)) / 100
            st.caption(f"📊 Historical volatility for {ticker}: {real_vol*100:.1f}%")

            option_type = st.radio("Option Type", ["call", "put"])

        with col2:
            st.subheader("📊 Pricing Results")

            price = black_scholes(S, K, T, r, sigma, option_type)
            delta, gamma, vega, theta, rho = calculate_greeks(S, K, T, r, sigma)
            break_even = K + price if option_type == "call" else K - price

            if delta > 0.5:
                signal = "🟢 BUY CALL"
            elif delta < 0.3:
                signal = "🔴 BUY PUT"
            else:
                signal = "🟡 NEUTRAL"

            col_a, col_b, col_c = st.columns(3)
            col_a.metric("Option Price", f"₦{price:,.2f}")
            col_b.metric("Break-even", f"₦{break_even:,.2f}")
            col_c.metric("Signal", signal)

            st.markdown("---")
            st.subheader("🔢 The Greeks")

            col_a, col_b, col_c, col_d, col_e = st.columns(5)
            col_a.metric("Delta", f"{delta:.4f}")
            col_b.metric("Gamma", f"{gamma:.6f}")
            col_c.metric("Vega", f"{vega:.4f}")
            col_d.metric("Theta", f"{theta:.4f}")
            col_e.metric("Rho", f"{rho:.4f}")

            st.markdown("---")
            st.subheader("📈 Delta Curve")

            stock_range = np.linspace(S * 0.5, S * 1.5, 100)
            deltas = [calculate_greeks(s, K, T, r, sigma)[0] for s in stock_range]

            fig = go.Figure()
            fig.add_trace(go.Scatter(x=stock_range, y=deltas,
                                    name='Delta', line=dict(color='blue', width=2)))
            fig.add_vline(x=S, line_dash="dash", line_color="green",
                         annotation_text="Current Price")
            fig.add_vline(x=K, line_dash="dash", line_color="red",
                         annotation_text="Strike")
            fig.update_layout(title=f"{ticker} Delta Curve",
                            xaxis_title="Stock Price (₦)",
                            yaxis_title="Delta", height=350)
            st.plotly_chart(fig, use_container_width=True)

        # ── NGX Options Scanner ──
        st.markdown("---")
        st.subheader("📊 NGX Options Scanner — All Stocks")
        st.markdown("*Black-Scholes pricing across all NGX stocks simultaneously*")

        scanner_results = []
        for _, row in df.iterrows():
            if pd.isna(row['ticker']) or pd.isna(row['price']):
                continue
            try:
                s = float(row['price'])
                k = s * 1.10
                stock_vol = get_stock_volatility(row['ticker'])

                call_price = black_scholes(s, k, T, r, stock_vol, "call")
                put_price = black_scholes(s, k, T, r, stock_vol, "put")
                d, g, v, th, rh = calculate_greeks(s, k, T, r, stock_vol)
                be = k + call_price

                if d > 0.5:
                    sig = "🟢 BUY CALL"
                elif d < 0.3:
                    sig = "🔴 BUY PUT"
                else:
                    sig = "🟡 NEUTRAL"

                scanner_results.append({
                    "Ticker": row['ticker'],
                    "Price (₦)": f"₦{s:,.2f}",
                    "Strike (₦)": f"₦{k:,.2f}",
                    "Call (₦)": f"₦{call_price:,.2f}",
                    "Put (₦)": f"₦{put_price:,.2f}",
                    "Delta": round(d, 4),
                    "IV": f"{stock_vol*100:.1f}%",
                    "Break-even (₦)": f"₦{be:,.2f}",
                    "Signal": sig
                })
            except Exception:
                continue

        scanner_df = pd.DataFrame(scanner_results)
        st.dataframe(scanner_df, use_container_width=True, hide_index=True)

    else:
        st.error("Could not fetch market data.")

# ═══════════════════════════════════════════
# ⚠️ RISK DASHBOARD
# ═══════════════════════════════════════════
elif page == "⚠️ Risk Dashboard":
    st.caption("⚠️ Data delayed 20 minutes. Not investment advice.")
    st.title("⚠️ Risk Dashboard")
    st.markdown("*Portfolio Risk Metrics and Analysis*")

    with st.spinner("Loading market data..."):
        df = get_ngx_prices()

    if df is not None:
        data_source_banner(df)
        tickers = df['ticker'].dropna().tolist()

        st.subheader("⚙️ Portfolio & Risk Settings")

        col1, col2, col3 = st.columns(3)
        with col1:
            selected = st.multiselect("Select Stocks", tickers, default=tickers[:3])
        with col2:
            portfolio_value = st.number_input("Portfolio Value (₦)",
                                             value=10_000_000, step=1_000_000)
        with col3:
            confidence = st.slider("Confidence Level (%)", 90, 99, 95)
            sigma_annual = st.slider("Annual Volatility (%)", 10, 100, 45) / 100
            holding_period = st.slider("Holding Period (days)", 1, 30, 1)

        if selected:
            st.markdown("---")

            sigma_daily = sigma_annual / np.sqrt(252)
            sigma_period = sigma_daily * np.sqrt(holding_period)
            z_score = norm.ppf(confidence / 100)

            var = portfolio_value * sigma_period * z_score
            cvar = portfolio_value * sigma_period * norm.pdf(z_score) / (1 - confidence/100)

            st.subheader(f"📉 Value at Risk (VaR) & CVaR — {confidence}% Confidence")

            col1, col2, col3, col4 = st.columns(4)
            col1.metric("Portfolio Value", f"₦{portfolio_value:,.2f}")
            col2.metric(f"VaR ({holding_period}d)", f"₦{var:,.2f}",
                       delta=f"-{var/portfolio_value*100:.2f}%", delta_color="inverse")
            col3.metric(f"CVaR ({holding_period}d)", f"₦{cvar:,.2f}",
                       delta=f"-{cvar/portfolio_value*100:.2f}%", delta_color="inverse")
            col4.metric("Volatility", f"{sigma_annual*100:.1f}%")

            st.info(f"""
            **Interpretation:**
            - **VaR {confidence}%**: There is a {100-confidence}% chance of losing more than ₦{var:,.2f} over {holding_period} day(s)
            - **CVaR {confidence}%**: If losses exceed VaR, the average loss will be ₦{cvar:,.2f}
            - CVaR is always worse than VaR — it measures tail risk beyond VaR
            """)

            st.markdown("---")
            st.subheader("📊 VaR Across Confidence Levels")

            confidence_levels = [90, 91, 92, 93, 94, 95, 96, 97, 98, 99]
            vars_list = [portfolio_value * sigma_period * norm.ppf(c/100)
                        for c in confidence_levels]
            cvars_list = [portfolio_value * sigma_period * norm.pdf(norm.ppf(c/100)) / (1-c/100)
                         for c in confidence_levels]

            fig = go.Figure()
            fig.add_trace(go.Scatter(x=confidence_levels, y=vars_list,
                                    name='VaR', line=dict(color='orange', width=2)))
            fig.add_trace(go.Scatter(x=confidence_levels, y=cvars_list,
                                    name='CVaR', line=dict(color='red', width=2)))
            fig.add_vline(x=confidence, line_dash="dash", line_color="blue",
                         annotation_text=f"Selected: {confidence}%")
            fig.update_layout(title="VaR and CVaR vs Confidence Level",
                            xaxis_title="Confidence Level (%)",
                            yaxis_title="Risk (₦)", height=350)
            st.plotly_chart(fig, use_container_width=True)

            st.markdown("---")
            st.subheader("🔥 Stress Testing")
            st.markdown("*What happens to your portfolio under extreme scenarios?*")

            scenarios = {
                "NGN devalues 20%": -0.20,
                "Oil price crashes 30%": -0.15,
                "CBN rate hike 5%": -0.10,
                "Market crash 25%": -0.25,
                "Political crisis -15%": -0.15,
                "Bull run +30%": 0.30,
                "Oil boom +25%": 0.25,
            }

            stress_results = []
            for scenario, impact in scenarios.items():
                stressed_value = portfolio_value * (1 + impact)
                pnl = stressed_value - portfolio_value
                stress_results.append({
                    "Scenario": scenario,
                    "Impact": f"{impact*100:.0f}%",
                    "New Value (₦)": f"₦{stressed_value:,.2f}",
                    "P&L (₦)": f"₦{pnl:,.2f}",
                    "Outcome": "🟢 Gain" if impact > 0 else "🔴 Loss"
                })

            st.dataframe(pd.DataFrame(stress_results),
                        use_container_width=True, hide_index=True)

            st.markdown("---")
            st.subheader("🛡️ Delta Hedge Calculator")

            hedge_ticker = st.selectbox("Stock to Hedge", selected)
            n_options = st.number_input("Number of Call Options", value=10000, step=1000)
            r_hedge = st.slider("Risk-Free Rate (%)", 10, 35, 27, key="r_hedge") / 100
            sigma_hedge = st.slider("Volatility (%)", 10, 100, 45, key="s_hedge") / 100
            T_hedge = st.slider("Time to Expiry (months)", 1, 12, 3, key="t_hedge") / 12

            stock_price = float(df[df['ticker']==hedge_ticker]['price'].iloc[0])
            strike = stock_price * 1.1

            d1 = (math.log(stock_price/strike) +
                  (r_hedge + sigma_hedge**2/2) * T_hedge) / \
                 (sigma_hedge * math.sqrt(T_hedge))
            delta = norm.cdf(d1)
            shares_to_short = delta * n_options
            hedge_cost = shares_to_short * stock_price

            col1, col2, col3 = st.columns(3)
            col1.metric("Option Delta", f"{delta:.4f}")
            col2.metric("Shares to Short", f"{shares_to_short:,.0f}")
            col3.metric("Hedge Cost (₦)", f"₦{hedge_cost:,.2f}")

            st.success(f"To be Delta neutral on {n_options:,} {hedge_ticker} call options — short {shares_to_short:,.0f} shares at ₦{stock_price:,.2f} each. Total hedge cost: ₦{hedge_cost:,.2f}")

    else:
        st.error("Could not fetch market data.")

# ═══════════════════════════════════════════
# 🔬 STRATEGY BACKTESTER
# ═══════════════════════════════════════════
elif page == "🔬 Strategy Backtester":
    st.caption("⚠️ Past performance does not guarantee future results.")
    st.title("🔬 Strategy Backtester")
    st.markdown("*Test if our signals actually made money historically*")

    available_stocks = {
        "DANGCEM": "Dangote Cement",
        "MTNN": "MTN Nigeria",
        "GTCO": "Guaranty Trust",
        "ZENITHBANK": "Zenith Bank",
        "SEPLAT": "Seplat Energy",
        "UBA": "United Bank Africa",
        "ACCESSCORP": "Access Bank",
        "AIRTELAFRI": "Airtel Africa",
        "BUACEM": "BUA Cement",
        "NESTLE": "Nestle Nigeria"
    }

    st.subheader("⚙️ Backtest Settings")

    col1, col2, col3 = st.columns(3)
    with col1:
        bt_ticker = st.selectbox("Select Stock", list(available_stocks.keys()), index=4)
    with col2:
        initial_capital = st.number_input("Initial Capital (₦)",
                                         value=1_000_000, step=100_000)
    with col3:
        strategy = st.selectbox("Strategy", [
            "Buy and Hold",
            "Moving Average Crossover (20/50)",
            "RSI Mean Reversion",
            "Delta Signal (Options Based)"
        ])

    df_bt = load_historical(bt_ticker)

    if df_bt is not None:
        # ── Strategy Logic ──
        if strategy == "Buy and Hold":
            df_bt['Signal'] = 1
            df_bt['Position'] = 1

        elif strategy == "Moving Average Crossover (20/50)":
            df_bt['MA20'] = df_bt['Price'].rolling(20).mean()
            df_bt['MA50'] = df_bt['Price'].rolling(50).mean()
            df_bt['Signal'] = 0
            df_bt.loc[df_bt['MA20'] > df_bt['MA50'], 'Signal'] = 1
            df_bt.loc[df_bt['MA20'] < df_bt['MA50'], 'Signal'] = -1
            df_bt['Position'] = df_bt['Signal']

        elif strategy == "RSI Mean Reversion":
            delta_p = df_bt['Price'].diff()
            gain = delta_p.where(delta_p > 0, 0).rolling(14).mean()
            loss = (-delta_p.where(delta_p < 0, 0)).rolling(14).mean()
            rs = gain / loss
            df_bt['RSI'] = 100 - (100 / (1 + rs))
            df_bt['Signal'] = 0
            df_bt.loc[df_bt['RSI'] < 30, 'Signal'] = 1
            df_bt.loc[df_bt['RSI'] > 70, 'Signal'] = -1
            df_bt['Position'] = df_bt['Signal']

        elif strategy == "Delta Signal (Options Based)":
            r_bt = 0.265
            sigma_bt = get_stock_volatility(bt_ticker)
            T_bt = 0.25

            deltas_bt = []
            for price_val in df_bt['Price']:
                try:
                    k = price_val * 1.10
                    d1 = (np.log(price_val/k) + (r_bt + sigma_bt**2/2) * T_bt) / \
                         (sigma_bt * np.sqrt(T_bt))
                    deltas_bt.append(norm.cdf(d1))
                except Exception:
                    deltas_bt.append(0.5)

            df_bt['Delta'] = deltas_bt
            df_bt['Signal'] = 0
            df_bt.loc[df_bt['Delta'] > 0.5, 'Signal'] = 1
            df_bt.loc[df_bt['Delta'] < 0.3, 'Signal'] = -1
            df_bt['Position'] = df_bt['Signal']

        # ── Returns ──
        df_bt['Daily_Return'] = df_bt['Price'].pct_change()
        df_bt['Strategy_Return'] = df_bt['Daily_Return'] * df_bt['Position'].shift(1)
        df_bt = df_bt.dropna(subset=['Strategy_Return'])

        if len(df_bt) > 0:
            df_bt['Portfolio_Value'] = initial_capital * (1 + df_bt['Strategy_Return']).cumprod()
            df_bt['BuyHold_Value'] = initial_capital * (1 + df_bt['Daily_Return']).cumprod()

            total_return_bt = (df_bt['Portfolio_Value'].iloc[-1] - initial_capital) / initial_capital * 100
            bh_return = (df_bt['BuyHold_Value'].iloc[-1] - initial_capital) / initial_capital * 100

            ret_std = df_bt['Strategy_Return'].std()
            sharpe = (df_bt['Strategy_Return'].mean() / ret_std * np.sqrt(252)) if ret_std > 0 else 0

            rolling_max = df_bt['Portfolio_Value'].cummax()
            drawdown = (df_bt['Portfolio_Value'] - rolling_max) / rolling_max * 100
            max_drawdown = drawdown.min()

            winning_days = (df_bt['Strategy_Return'] > 0).sum()
            total_days = len(df_bt)
            win_rate = winning_days / total_days * 100

            # ── Results ──
            st.markdown("---")
            st.subheader(f"📊 {bt_ticker} — {strategy} Results")
            st.markdown(f"*{df_bt['Date'].iloc[0].strftime('%B %Y')} → {df_bt['Date'].iloc[-1].strftime('%B %Y')}*")

            col1, col2, col3, col4 = st.columns(4)
            col1.metric("Strategy Return", f"{total_return_bt:.2f}%",
                       delta=f"{total_return_bt - bh_return:.2f}% vs Buy & Hold")
            col2.metric("Buy & Hold Return", f"{bh_return:.2f}%")
            col3.metric("Sharpe Ratio", f"{sharpe:.2f}")
            col4.metric("Max Drawdown", f"{max_drawdown:.2f}%", delta_color="inverse")

            col1, col2, col3, col4 = st.columns(4)
            col1.metric("Win Rate", f"{win_rate:.1f}%")
            col2.metric("Final Value", f"NGN {df_bt['Portfolio_Value'].iloc[-1]:,.2f}")
            col3.metric("Profit", f"NGN {df_bt['Portfolio_Value'].iloc[-1] - initial_capital:,.2f}")
            col4.metric("Total Trading Days", f"{total_days:,}")

            st.markdown("---")
            st.subheader("📈 Portfolio Value Over Time")

            fig_bt = go.Figure()
            fig_bt.add_trace(go.Scatter(x=df_bt['Date'], y=df_bt['Portfolio_Value'],
                name=strategy, line=dict(color='#1B3A6B', width=2)))
            fig_bt.add_trace(go.Scatter(x=df_bt['Date'], y=df_bt['BuyHold_Value'],
                name='Buy & Hold', line=dict(color='#2E74B5', width=1.5, dash='dash')))
            fig_bt.update_layout(title=f"{bt_ticker} — Strategy vs Buy & Hold",
                xaxis_title="Date", yaxis_title="Portfolio Value (NGN)",
                height=400, hovermode='x unified')
            st.plotly_chart(fig_bt, use_container_width=True)

            st.subheader("📉 Drawdown Over Time")
            fig_dd = go.Figure()
            fig_dd.add_trace(go.Scatter(x=df_bt['Date'], y=drawdown,
                fill='tozeroy', name='Drawdown',
                line=dict(color='red', width=1), fillcolor='rgba(255,0,0,0.2)'))
            fig_dd.update_layout(title="Strategy Drawdown",
                xaxis_title="Date", yaxis_title="Drawdown (%)", height=300)
            st.plotly_chart(fig_dd, use_container_width=True)

            if strategy != "Buy and Hold":
                st.subheader("📊 Price Chart with Buy/Sell Signals")
                buy_signals = df_bt[df_bt['Signal'] == 1]
                sell_signals = df_bt[df_bt['Signal'] == -1]

                fig_sig = go.Figure()
                fig_sig.add_trace(go.Scatter(x=df_bt['Date'], y=df_bt['Price'],
                    name='Price', line=dict(color='gray', width=1.5)))
                fig_sig.add_trace(go.Scatter(x=buy_signals['Date'], y=buy_signals['Price'],
                    mode='markers', name='BUY Signal',
                    marker=dict(color='green', size=8, symbol='triangle-up')))
                fig_sig.add_trace(go.Scatter(x=sell_signals['Date'], y=sell_signals['Price'],
                    mode='markers', name='SELL Signal',
                    marker=dict(color='red', size=8, symbol='triangle-down')))
                fig_sig.update_layout(title=f"{bt_ticker} Price with Trading Signals",
                    xaxis_title="Date", yaxis_title="Price (NGN)", height=400)
                st.plotly_chart(fig_sig, use_container_width=True)

            st.subheader("📅 Monthly Returns")
            df_bt['Month'] = df_bt['Date'].dt.to_period('M')
            monthly_returns = df_bt.groupby('Month')['Strategy_Return'].sum() * 100
            monthly_returns.index = monthly_returns.index.astype(str)

            fig_monthly = go.Figure(data=go.Bar(
                x=monthly_returns.index, y=monthly_returns.values,
                marker_color=['green' if v > 0 else 'red' for v in monthly_returns.values]))
            fig_monthly.update_layout(title="Monthly Strategy Returns (%)",
                xaxis_title="Month", yaxis_title="Return (%)", height=300)
            st.plotly_chart(fig_monthly, use_container_width=True)

            st.subheader("📋 Strategy Summary")
            summary = pd.DataFrame({
                'Metric': ['Strategy', 'Stock', 'Period', 'Initial Capital',
                          'Final Value', 'Total Profit', 'Strategy Return',
                          'Buy & Hold Return', 'Alpha', 'Sharpe Ratio',
                          'Max Drawdown', 'Win Rate', 'Trading Days'],
                'Value': [strategy, available_stocks[bt_ticker],
                    f"{df_bt['Date'].iloc[0].strftime('%b %Y')} → {df_bt['Date'].iloc[-1].strftime('%b %Y')}",
                    f"NGN {initial_capital:,.2f}",
                    f"NGN {df_bt['Portfolio_Value'].iloc[-1]:,.2f}",
                    f"NGN {df_bt['Portfolio_Value'].iloc[-1] - initial_capital:,.2f}",
                    f"{total_return_bt:.2f}%", f"{bh_return:.2f}%",
                    f"{total_return_bt - bh_return:.2f}%", f"{sharpe:.2f}",
                    f"{max_drawdown:.2f}%", f"{win_rate:.1f}%", f"{total_days:,}"]
            })
            st.dataframe(summary, use_container_width=True, hide_index=True)

            st.markdown("---")
            st.warning("""
            ⚠️ **Backtesting Disclaimer**
            Past performance does not guarantee future results. 
            Backtested results do not account for transaction costs, slippage, 
            liquidity constraints, or market impact. Educational purposes only.
            """)
        else:
            st.info("Not enough data to run this strategy on this stock.")

    else:
        st.info(f"📊 Backtesting for {bt_ticker} requires historical data — available in the full version.")
