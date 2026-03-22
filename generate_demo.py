import random
import string
from datetime import datetime, timedelta

random.seed(42)

def gen_tx_id():
    chars = string.ascii_letters + string.digits
    return "NXT" + "".join(random.choices(chars, k=random.randint(20, 30)))

def usd(val):
    return f"${val:.2f}"

rows = []

# 12-column header matching the current Nexo export format
header = "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),normalizedDisplayDetails"

# Representative mid-prices for amount generation (not used by the app — it fetches real prices)
mid_prices = {
    "BTC": 80000, "ETH": 3000, "NEXO": 1.1, "XRP": 1.5, "LINK": 15,
    "DOGE": 0.25, "SOL": 140, "ADA": 0.7, "DOT": 8, "AVAX": 35,
    "MATIC": 1.0, "USDC": 1.0, "EURX": 1.08, "EUR": 1.08, "USD": 1.0,
    "DAI": 1.0, "USDT": 1.0, "BNB": 600, "POL": 0.5,
}

# Interest yield ranges (daily amount in currency units)
currencies_interest = {
    "BTC": (0.00001, 0.0005, 60000, 95000),
    "ETH": (0.0005, 0.005, 1800, 4200),
    "NEXO": (0.1, 2.0, 0.8, 1.5),
    "XRP": (0.05, 0.5, 0.4, 2.5),
    "LINK": (0.05, 0.5, 6, 25),
    "DOGE": (0.5, 5.0, 0.06, 0.45),
    "SOL": (0.001, 0.05, 20, 260),
    "ADA": (0.1, 2.0, 0.25, 1.2),
    "DOT": (0.01, 0.2, 4, 12),
    "AVAX": (0.005, 0.1, 10, 65),
    "MATIC": (0.1, 1.0, 0.5, 2.0),
}

start_date = datetime(2025, 3, 1)
end_date = datetime(2026, 3, 17)

def amt_for_usd(cur, target_usd):
    """Convert a target USD value to a currency amount using mid-price."""
    return round(target_usd / mid_prices.get(cur, 1.0), 8)

def add_row(tx_type, in_cur, in_amt, out_cur, out_amt, usd_val, details, dt, fee="-", fee_cur="-"):
    rows.append((
        gen_tx_id(),
        tx_type,
        in_cur,
        f"{in_amt:.8f}",
        out_cur,
        f"{out_amt:.8f}",
        usd(usd_val),
        fee,
        fee_cur,
        details,
        dt.strftime("%Y-%m-%d %H:%M:%S"),
        details,  # normalizedDisplayDetails = same as Details
    ))

# ==========================================
# INFLOWS (establish positive portfolio)
# ==========================================

# --- Initial deposits (large, early) to seed the portfolio ---
initial_deposits = [
    ("USDC", 20000, 3),   # 3 USDC deposits totaling ~60k
    ("BTC", 5000, 3),     # 3 BTC deposits totaling ~15k
    ("ETH", 3000, 3),     # 3 ETH deposits totaling ~9k
    ("SOL", 1500, 3),
    ("XRP", 2000, 3),
    ("LINK", 500, 2),
    ("DOGE", 1500, 3),
    ("ADA", 1000, 3),
]
for cur, max_usd, count in initial_deposits:
    for j in range(count):
        target = random.uniform(max_usd * 0.5, max_usd)
        amt = amt_for_usd(cur, target)
        tx_hash = ''.join(random.choices('0123456789abcdef', k=64))
        # Early deposits: first 90 days
        dt = start_date + timedelta(days=random.randint(0, 90))
        add_row("Top up Crypto", cur, amt, cur, amt, round(target, 2),
                f"approved / {tx_hash}", dt)

# --- Ongoing smaller top-ups throughout the year ---
topup_currencies = ["BTC", "ETH", "XRP", "DOGE", "SOL", "LINK", "ADA", "USDC"]
for i in range(20):
    cur = random.choice(topup_currencies)
    target = random.uniform(100, 2000)
    amt = amt_for_usd(cur, target)
    tx_hash = ''.join(random.choices('0123456789abcdef', k=64))
    dt = start_date + timedelta(days=random.randint(30, 370))
    add_row("Top up Crypto", cur, amt, cur, amt, round(target, 2),
            f"approved / {tx_hash}", dt)

# --- Daily Interest (1 year, 8 currencies) ---
interest_currencies = ["BTC", "ETH", "NEXO", "XRP", "LINK", "DOGE", "SOL", "ADA"]
d = datetime(2025, 3, 1)
while d <= end_date:
    for cur in interest_currencies:
        min_amt, max_amt, min_price, max_price = currencies_interest[cur]
        amt = round(random.uniform(min_amt, max_amt), 8)
        price = random.uniform(min_price, max_price)
        usd_val = round(amt * price, 2)
        add_row("Interest", cur, amt, cur, amt, usd_val,
                f"approved / {cur} Interest Earned", d.replace(hour=6))
    d += timedelta(days=1)

# --- Fixed Term Interest ---
term_currencies = ["BTC", "ETH", "XRP", "NEXO", "LINK"]
for i in range(30):
    cur = random.choice(term_currencies)
    min_amt, max_amt, min_price, max_price = currencies_interest[cur]
    amt = round(random.uniform(max_amt * 5, max_amt * 50), 8)
    price = random.uniform(min_price, max_price)
    usd_val = round(amt * price, 2)
    dt = start_date + timedelta(days=random.randint(10, 370))
    add_row("Fixed Term Interest", cur, amt, cur, amt, usd_val,
            "approved / Term Deposit Interest", dt.replace(hour=5))

# --- Exchange Cashback ---
for i in range(40):
    cur = random.choice(["NEXO", "EURX", "USDC"])
    amt = round(random.uniform(0.01, 5.0), 8)
    price = random.uniform(0.8, 1.5)
    usd_val = round(amt * price, 2)
    pct = random.choice(["0.25", "0.5", "1"])
    dt = start_date + timedelta(days=random.randint(5, 370))
    add_row("Exchange Cashback", cur, amt, cur, amt, usd_val,
            f"approved / {pct} % on top of your Exchange transaction", dt)

# --- Deposit To Exchange / Exchange Deposited On (EUR -> EURX) ---
for i in range(20):
    amt = round(random.uniform(50, 1500), 2)
    usd_val = round(amt * random.uniform(1.02, 1.12), 2)
    dt = start_date + timedelta(days=random.randint(10, 370))
    fee_val = round(random.uniform(0, 2), 8) if random.random() > 0.5 else None
    add_row("Deposit To Exchange", "EUR", amt, "EURX", amt, usd_val,
            "approved / EUR Top Up", dt, f"{fee_val:.8f}" if fee_val else "-", "EUR" if fee_val else "-")
    add_row("Exchange Deposited On", "EUR", -amt, "EURX", amt, usd_val,
            "approved / EUR to EURX", dt)

# --- Referral Bonus ---
for i in range(3):
    dt = start_date + timedelta(days=random.randint(10, 300))
    add_row("Referral Bonus", "BTC", 0.00056603, "BTC", 0.00056603, 25.00,
            "approved / Referral bonus", dt)

# --- Dividend ---
amt = round(random.uniform(5, 50), 8)
price = random.uniform(0.8, 3.0)
usd_val = round(amt * price, 2)
dt = datetime(2025, 8, 15)
add_row("Dividend", "NEXO", amt, "NEXO", amt, usd_val,
        "approved / Loyalty Dividend", dt.replace(hour=9))

# ==========================================
# INTERNAL TRANSFERS (skipped by portfolio calc, but shown in transactions)
# ==========================================

# --- Locking / Unlocking Term Deposits ---
for i in range(20):
    cur = random.choice(term_currencies)
    target = random.uniform(200, 2000)
    amt = amt_for_usd(cur, target)
    lock_dt = start_date + timedelta(days=random.randint(10, 280))
    unlock_dt = lock_dt + timedelta(days=random.choice([30, 90]))
    add_row("Locking Term Deposit", cur, -amt, cur, amt, round(target, 2),
            "approved / Transfer from Savings Wallet to Term Wallet", lock_dt)
    add_row("Unlocking Term Deposit", cur, amt, cur, amt, round(target, 2),
            "approved / Transfer from Term Wallet to Savings Wallet", unlock_dt.replace(hour=5))

# --- Transfer In / Transfer Out (Credit Line) ---
for i in range(10):
    cur = random.choice(["USDC", "DAI", "USDT", "BTC", "ETH"])
    target = random.uniform(500, 3000)
    price = mid_prices.get(cur, 1.0)
    amt = round(target / price, 8)
    usd_val = round(target, 2)
    dt = start_date + timedelta(days=random.randint(10, 370))
    add_row("Transfer Out", cur, -amt, cur, amt, usd_val,
            "approved / Transfer from Savings Wallet to Credit Line Wallet", dt)
    dt2 = dt + timedelta(days=random.randint(1, 60))
    add_row("Transfer In", cur, amt, cur, amt, usd_val,
            "approved / Transfer from Credit Line Wallet to Savings Wallet", dt2)

# ==========================================
# OUTFLOWS (keep small relative to inflows)
# ==========================================

# --- Exchanges (value-neutral: subtract from one currency, add to another) ---
exchange_pairs = [
    ("BTC", "NEXO"), ("ETH", "NEXO"), ("USDC", "EURX"), ("EURX", "USDC"),
    ("BTC", "ETH"), ("XRP", "NEXO"), ("DOGE", "BTC"), ("SOL", "USDC"),
    ("LINK", "ETH"), ("ADA", "USDC"), ("NEXO", "USDC"), ("ETH", "USDC"),
]
for i in range(60):
    from_cur, to_cur = random.choice(exchange_pairs)
    # Keep exchange values modest ($50 - $500)
    target_usd = random.uniform(50, 500)
    amt_from = amt_for_usd(from_cur, target_usd)
    amt_to = amt_for_usd(to_cur, target_usd)
    dt = start_date + timedelta(days=random.randint(5, 370))
    fee = round(amt_from * random.uniform(0.001, 0.01), 8)
    add_row("Exchange", from_cur, -amt_from, to_cur, amt_to, round(target_usd, 2),
            f"approved / Exchange {from_cur} to {to_cur}", dt, f"{fee:.8f}", from_cur)

# --- Withdrawals (small, USD-targeted) ---
for i in range(15):
    cur = random.choice(["BTC", "ETH", "DOGE", "XRP", "USDC", "SOL"])
    target = random.uniform(100, 1500)
    amt = amt_for_usd(cur, target)
    dt = start_date + timedelta(days=random.randint(60, 370))
    add_row("Withdrawal", cur, -amt, cur, amt, round(target, 2),
            f"approved / {cur} withdrawal", dt)

# --- Withdraw Exchanged / Exchange To Withdraw (EURX -> EUR) ---
for i in range(10):
    amt = round(random.uniform(100, 800), 2)
    usd_val = round(amt * random.uniform(1.02, 1.12), 2)
    dt = start_date + timedelta(days=random.randint(60, 370))
    add_row("Exchange To Withdraw", "EURX", amt, "EUR", amt, usd_val,
            "approved / EURX to EUR", dt)
    add_row("Withdraw Exchanged", "EUR", -amt, "EUR", amt, usd_val,
            "approved / EUR withdrawal", dt)

# --- Nexo Card Purchase + Cashback ---
# No commas in merchant names - the parser splits on commas naively
merchants = [
    "AMAZON MKTPLACE PMTS | LUXEMBOURG",
    "PAYPAL *SPOTIFY | 35314369001",
    "SHELL 1234 | FRANKFURT",
    "REWE MARKT | BERLIN",
    "UBER *EATS | AMSTERDAM",
    "IKEA ONLINE | HOFHEIM",
    "NETFLIX.COM | LOS GATOS",
    "BOOKING.COM | AMSTERDAM",
    "LIDL FILIALE | MUNICH",
    "EDEKA CENTER | HAMBURG",
    "MEDIAMARKT | COLOGNE",
    "ZALANDO SE | BERLIN",
    "STARBUCKS | NEW YORK",
    "APPLE.COM | CUPERTINO",
]
for i in range(20):
    merchant = random.choice(merchants)
    usd_amt = round(random.uniform(5, 200), 2)
    eur_amt = round(usd_amt / random.uniform(1.05, 1.12), 2)
    dt = start_date + timedelta(days=random.randint(30, 370))
    add_row("Nexo Card Purchase", "USD", -usd_amt, "EUR", eur_amt, usd_amt,
            "approved", dt)
    cb_pct = random.choice([0.005, 0.01, 0.02])
    cb_usd = round(usd_amt * cb_pct, 2)
    nexo_price = random.uniform(0.8, 1.5)
    cb_nexo = round(cb_usd / nexo_price, 8)
    add_row("Cashback", "NEXO", cb_nexo, "NEXO", cb_nexo, cb_usd,
            f"approved / {merchant}", dt)

# --- Manual Repayment ---
for i in range(10):
    amt = round(random.uniform(100, 500), 8)
    dt = start_date + timedelta(days=random.randint(30, 370))
    add_row("Manual Repayment", "USD", amt, "USD", 0, amt,
            "approved / Fiat Repayment", dt)

# --- Liquidation ---
for i in range(3):
    cur = random.choice(["BTC", "ETH", "LINK"])
    target = random.uniform(100, 500)
    amt = amt_for_usd(cur, target)
    dt = start_date + timedelta(days=random.randint(60, 370))
    add_row("Liquidation", cur, -amt, cur, amt, round(target, 2),
            "approved / Liquidation", dt)

# Sort all rows by date descending
rows.sort(key=lambda r: r[10], reverse=True)

# Write CSV
with open("C:/Users/Bryan/Documents/GitHub/nexotransactionanalyzer/nexo_demo_transactions.csv", "w", newline="") as f:
    f.write(header + "\n")
    for r in rows:
        parts = list(r)
        # Quote the Details field (index 9) like the real Nexo export
        parts[9] = '"' + parts[9] + '"'
        f.write(",".join(str(x) for x in parts) + "\n")

# Stats
types = {}
currs = {}
for r in rows:
    t = r[1]
    types[t] = types.get(t, 0) + 1
    c = r[2]
    currs[c] = currs.get(c, 0) + 1

print(f"Total rows: {len(rows)}")
print(f"\nTransaction types:")
for t, c in sorted(types.items(), key=lambda x: -x[1]):
    print(f"  {t}: {c}")
print(f"\nCurrencies:")
for c, n in sorted(currs.items(), key=lambda x: -x[1]):
    print(f"  {c}: {n}")
