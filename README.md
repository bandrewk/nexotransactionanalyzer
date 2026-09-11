[![CI](https://github.com/bandrewk/nexotransactionanalyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/bandrewk/nexotransactionanalyzer/actions/workflows/ci.yml)
[![Deploy](https://github.com/bandrewk/nexotransactionanalyzer/actions/workflows/deploy.yml/badge.svg)](https://github.com/bandrewk/nexotransactionanalyzer/actions/workflows/deploy.yml)
[![Release](https://github.com/bandrewk/nexotransactionanalyzer/actions/workflows/release.yml/badge.svg)](https://github.com/bandrewk/nexotransactionanalyzer/actions/workflows/release.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

# nexo-ta.com

A privacy-first analytical tool for the [Nexo](https://www.nexo.com) crypto lending platform. Upload your exported transaction `.csv` file and get instant portfolio insights — all processing happens locally in your browser.

![Landing Page](docs/image1.png)

![Demo](docs/image2.gif)

## Features

### Portfolio Analytics
- Real-time portfolio value via CoinGecko, with DefiLlama as fallback
- Historic portfolio value chart from DefiLlama daily closes, fiat via Frankfurter
- Assets that cannot be priced are named, never silently valued at zero
- Portfolio distribution donut chart
- Performance metrics: Net Invested, Interest Earned, Unrealized P/L, and Charged / Reversed where an account pays credit-line interest
- 1-week portfolio change on Dashboard, which states why rather than showing a dash when it cannot be derived
- Date range filtering on charts (1M, 3M, 6M, 1Y, All)
- The date range an export covers is stated outright, and flagged when it stops more than 30 days ago

### Transaction Management
- Searchable, sortable, paginated transaction table
- Transaction type dropdown filter
- Blockchain explorer links for 20 chains (BTC, SOL, XRP, ADA, DOT, TRX, etc.)
- Column visibility toggles (ID, Fee, Time)
- Recognition of all 34 Nexo transaction types

### File Details
- Reports what the app read from your export: column names, row count, date range, and every transaction type with the shape of its rows and how it is handled
- Flags rows whose shape or currencies the app has no rule for, including types it otherwise recognises, and samples them
- States what each transaction type contributes to each balance, so a wrong total can be traced to the rows that caused it
- Names transaction types the app does not recognise, and says so on the Dashboard too, since figures derived from them cannot be trusted
- Generates a report to paste into a GitHub issue, so a data problem can be looked at without sending your CSV. Amounts sit in one section that can be removed on its own
- A CSV that cannot be read explains why, naming the missing columns

### Coinlist
- Holdings grid with coin icons and USD values
- Dust & residual balance section
- Zero balance toggle

### Interest Tracking
- Interest chart split by payout kind, with a daily/monthly switch
- Per-currency interest breakdown with bar chart and table
- Disclaimer about Nexo CSV limitations for in-kind vs NEXO interest detection

### Other
- Dark mode (system default + manual toggle)
- Responsive design (desktop-first with mobile sidebar)
- Demo mode with realistic sample data
- Save/restore session via localStorage
- Crypto news feed (CoinDesk)

## Tech Stack

| Category | Technology |
|---|---|
| Build | Vite 8 |
| Framework | React 19 |
| Language | TypeScript 5.9 |
| State | Zustand |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Table | TanStack Table v8 |
| Icons | Lucide React |
| Unit Tests | Vitest |
| E2E Tests | Playwright |
| CI/CD | GitHub Actions + FTP Deploy |

## Getting Started

```bash
git clone https://github.com/bandrewk/nexotransactionanalyzer
cd nexotransactionanalyzer
npm install
npm run dev
```

No external services required. Currency metadata is bundled locally in `src/data/currencies.ts` and price data is fetched at runtime from CoinGecko and DefiLlama (crypto) and Frankfurter (fiat). None require an API key.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run lint:paths` | Fails on machine-local absolute paths in tracked files |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:e2e` | E2E tests (Playwright); builds first, since Playwright serves `dist/` |

## Testing

Unit suites by area, plus end-to-end scenarios:

- **CSV Parser** — parsing, normalization (EURX→EUR), repayment/liquidation fixes, export schema regression, both the 11- and 12-column schemas
- **Transaction Types** — the rule table: every type has an effect on holdings, the shapes it was written against, and whether it is evidenced or inferred
- **Balance Calculator** — running balances, interest split by payout kind, deposit/withdrawal tracking, internal transfer skipping
- **Price Oracle** — DefiLlama request planning, point-budget chunking, carry-forward staleness cap, unpriced-symbol reporting
- **Interest Series** — monthly aggregation, value preservation
- **Portfolio** — totals and which holdings had to be excluded
- **Performance** — week-over-week change, and when it must refuse to answer
- **TX Linkage** — blockchain explorer URL mapping for 20 chains
- **Formatting** — USD, crypto amounts, percentages, edge cases
- **Storage** — localStorage save/load, version mismatch, corruption handling
- **Date Filter** — range filtering logic
- **Export Coverage** — the span a file covers, and when it is stale enough to warn about
- **CSV Diagnostics** — schema and type analysis of a file the parser rejects, row-shape derivation, report generation, and what the report must never publish
- **E2E** — full demo flow, navigation, search, sorting, pagination, column visibility, dark mode, save/restore, rejection of an unreadable file, File Details

### End-to-end tests

```bash
npx playwright install chromium   # one-time browser download
npm run test:e2e
```

If you'd rather use a Chrome you already have installed, point Playwright at it:

```bash
PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome-stable npm run test:e2e
```

## CI/CD

The project uses three chained GitHub Actions workflows:

1. **CI** — Lint, absolute-path check, typecheck, unit tests (Node 20/22/24 matrix), build, E2E tests
2. **Deploy** — FTP upload to production (triggers after CI passes on main)
3. **Release** — Creates a GitHub release from `CHANGELOG.md` (triggers after Deploy succeeds)

## Demo Data

A Python script (`generate_demo.py`) generates realistic sample transaction data for testing. The demo CSV covers ~1 year of transactions across 12+ currencies, representative of credit-line card activity. Its dates are anchored to the day it is generated rather than fixed, so the fixture does not age out of the freshness window the Dashboard needs to show a weekly change.

## Privacy

All CSV processing happens locally in your browser. No transaction data is ever sent to any server.

## Notice of Non-Affiliation and Disclaimer

We are not affiliated, associated, authorized, endorsed by, or in any way officially connected with Nexo Financial LLC, or any of its subsidiaries or its affiliates. The official Nexo Financial LLC website can be found at [nexo.com](https://www.nexo.com). The name NEXO as well as related names, marks, emblems and images are registered trademarks of their respective owners.

## Support Development

ETH: `0x6aa9da4a0f149a140f6813cbd84e1ee2df05e76e`

BTC: `bc1q5sl35at30wtftl4je7p0pwwxhwtekfe23602tj`

RVN: `RCJ92C29iZimha5H4Lw3GwKQQNiCMdd5dh`

## Previous Versions

- V3: [v3.nexo-ta.com](https://v3.nexo-ta.com/)
- V2: [v2.nexo-ta.com](https://v2.nexo-ta.com/)
- V1: [v1.nexo-ta.com](https://v1.nexo-ta.com/)
