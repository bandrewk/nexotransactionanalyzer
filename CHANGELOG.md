# Changelog

All notable changes to this project will be documented in this file.

## [4.2.0] - 2026-08-15

### Fixed
- Historic portfolio chart works again, and no longer invents numbers. CryptoCompare's `min-api` began returning HTTP 401 with no CORS headers, so the browser blocked every request; the old code swallowed the failure and valued unpriced assets at `0`, drawing a smooth, plausible, **wrong** line from fiat balances alone. Historic crypto prices now come from DefiLlama (no API key, CORS-enabled, addressed by the coingecko ids already bundled in `currencies.ts`); fiat continues to use Frankfurter, which is the only source that can price it. (#69)
- Days holding an asset with no usable price are omitted from the portfolio series rather than undervalued, and carry-forward is capped at 7 days so a stale price cannot pass as coverage. Assets with missing or partial price data are named on the chart card. (#69)
- Dashboard "Portfolio Value" no longer hangs on "Loading...". CoinGecko's public tier rate-limits aggressively and its 429 responses carry no CORS headers, so `fetch` rejected with no retry, backoff, or fallback. The feed now falls back to DefiLlama per id and backs off exponentially. A partial CoinGecko response no longer leaves coins unpriced, which had quietly dropped them from the total. (#69)
- "1W Change" reported `+$0.00` as a real figure for anyone who had not transacted in seven days. The series is keyed by transaction dates, so the week-ago lookup collapsed onto the final point. It now renders `--` when the data cannot support the comparison. (#72, #76)
- Portfolio totals silently excluded holdings that could not be priced, reading lower than reality with no indication. Excluded holdings are now named. (#73, #76)
- USD balances were never priced at all — the fiat feed only ever fetched EUR and GBP, so any USD holding kept `usdEquivalent: 0` forever and vanished from the total. (#76)
- "Unrealized P/L" rendered `-100%` as a genuine result while the price feed was unavailable, unlike the total card which was already gated. Both it and its "Portfolio" sub-figure are now gated. (#74, #76)

### Added
- Earned Interest chart is split by payout kind. A term deposit settles its whole accrual on the maturity date, so a single payout dwarfed every ordinary day and flattened the chart. Regular interest is a continuous area; term payouts are discrete bars, and either series can be hidden from the legend to rescale the axis. (#70)
- Daily/monthly switch on the Earned Interest chart, defaulting to monthly. (#70)
- Overview portfolio breakdown is labelled "Top 3 by value" with a `+N more` hint; it was already truncated at three without saying so. (#70)

### Changed
- Resolved all 12 outstanding Dependabot PRs in one verified pass, including two majors: eslint 9 → 10 and vitest 3 → 4. Both were checked for silent breakage rather than just a green run — a deliberate lint violation and a deliberately failing test were each confirmed to still be reported. `npm audit` reports 0 vulnerabilities, dev included. (#75)
- `actions/checkout` and `actions/setup-node` bumped to v7. (#75)
- Market data attribution updated from CryptoCompare to DefiLlama in the footer and README.

### Internal
- `npm run typecheck` now actually type-checks. The root `tsconfig.json` has `"files": []` with only project references, so `tsc --noEmit` checked nothing and always exited 0. Confirmed by introducing a deliberate type error: the old script stayed green, `tsc -b` caught it. Builds were never blind, since `npm run build` runs `tsc -b`, but the standalone script gave false confidence. (#70)
- Price access, portfolio totals, week-over-week performance and interest aggregation extracted from components into `src/lib/`, making them testable without a DOM or network.
- Test suite grew from 101 to 152 tests across 10 suites, including synthetic regression coverage pinning the 11-column Nexo export schema and all 22 transaction types.
- `PLAYWRIGHT_CHROME_PATH` escape hatch so the E2E suite runs against an already-installed Chrome without downloading Playwright's own browser.
- `.github/dependabot.yml` documents why security updates bypass `target-branch` and open against the default branch.
- README corrected: transaction type count (27 → 22), explorer chains ("19+" → 20, and the example listed a chain with no explorer entry), test counts, and price sources.

## [4.1.0] - 2026-05-18

### Fixed
- CSV parser correctly handles commas inside quoted `Details` fields (e.g. `"approved / lidl, berlin"`) by migrating from a hand-rolled parser to papaparse. (#34, #35)
- CSV parser accepts Nexo's current 11-column export schema. The hardcoded 12-column guard previously rejected exports after Nexo removed the `normalizedDisplayDetails` column in May 2026. Header-name validation against `meta.fields` replaces the count check and accepts both 11- and 12-column schemas. (#39, #46)
- Live currency rates work again. Migrated the Frankfurter API from the deprecated `api.frankfurter.app` (now 301-redirects with CORS failures) to `api.frankfurter.dev/v1/`. (#40, #47)

### Changed
- Resolved 11 Dependabot advisories in dev-only toolchain (vite, postcss, lodash, picomatch, @babel/runtime, brace-expansion, ws). Runtime bundle unaffected. (#49)
- Bumped dev dependencies: react/react-dom 19.2.4 → 19.2.6 (#45), autoprefixer 10.4.27 → 10.5.0 (#43), typescript-eslint 8.57.1 → 8.59.4 (#42).
- Brand-neutral attribution: "frankfurter.dev" → "Frankfurter" in Footer and README.
- Removed "Rebuilt from scratch" tagline from the landing-page banner.

### Removed
- Dead pre-React `html-draw/` mockup folder. (#48)

### Internal
- Two new regression tests for the papaparse migration: end-of-data sentinel break, and throw-on-malformed-row (no silent swallowing).
- Three new regression tests for the column-count fix: 11-column schema accepted, whitespace-padded headers handled via `transformHeader: trim`, extra unknown columns ignored.

## [4.0.0] - 2026-03-22

### Complete Rebuild
- Rebuilt from scratch with Vite 8, React 19, TypeScript 5.9, Zustand, Tailwind CSS v4
- Replaced Create React App, Redux, CSS Modules, gridjs, phosphor-react

### New Features
- Dark mode with system default and manual toggle
- Demo mode with realistic sample data (Try Demo button)
- Date range filtering on charts (1M, 3M, 6M, 1Y, All)
- Transaction type dropdown filter
- Portfolio performance metrics (Net Invested, Interest Earned, Unrealized P/L)
- 1-week portfolio change on Dashboard
- Responsive design with collapsible mobile sidebar
- Crypto news feed (CoinDesk)
- Save/restore session via localStorage

### Improvements
- Premium fintech dashboard UI design
- Dark/light logo variants with adaptive favicon
- Proper SVG coin icons with fallback
- Interest breakdown disclaimer (CSV limitation for in-kind vs NEXO detection)
- Round-trip deposit/withdrawal notice on Net Invested metric
- Nexo referral CTA on landing page
- Non-affiliation disclaimer preserved

### Testing
- 84 unit tests (Vitest): CSV parser, balance calculator, TX linkage, formatting, storage, date filter
- 17 E2E tests (Playwright): full demo flow, navigation, search, pagination, dark mode, save/restore
- CI pipeline: lint, typecheck, unit tests (Node 20/22/24), build, E2E
- CD pipeline: FTP deploy on main after CI passes
- Automated GitHub releases from CHANGELOG.md after successful deploy

### Tech Stack
- Vite 8 (build)
- React 19 (framework)
- TypeScript 5.9 (language)
- Zustand (state management)
- Tailwind CSS v4 (styling)
- Recharts (charts)
- TanStack Table v8 (data table)
- Lucide React (icons)
- Vitest (unit tests)
- Playwright (E2E tests)
