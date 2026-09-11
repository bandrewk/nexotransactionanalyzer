# Changelog

All notable changes to this project will be documented in this file.

## [4.5.0] - 2026-09-11

### Fixed
- Nexo Card credit-line accounts no longer inflate holdings with phantom EUR and a negative `xUSD` balance. In Credit Mode a card payment is exported as three rows — a credit-line draw (`Credit Card Withdrawal Credit`), a conversion of that borrowed money to fiat to pay the merchant (`Exchange Credit`), and the purchase itself (`Nexo Card Purchase`). Only the third was recognised, and it was already ignored, so the other two were summed as though they moved real assets: the conversion credited EUR the account never held, and the draw accumulated a negative balance in `xUSD`, which is a credit line rather than an asset. Both funding rows are now ignored and the chain nets to no change in holdings. (#84)
- `Exchange Liquidation`, which repays card debt, was credited instead of debited. Nexo writes the repayment amount positive although it leaves the account — the same inverted convention `Manual Repayment` already had patched — so an asset sold to repay the card increased the balance. (#84)
- Negative `Interest` rows no longer inflate "Interest Earned". Nexo writes a positive figure in `USD Equivalent` even on rows that debit the account, so charges and reversals were counted as earnings. Interest statistics now count a row only when it credits, and the debited value is shown separately as "Charged / Reversed". **This is not confined to credit-line accounts:** any export containing a negative or zero-amount interest row will show a lower "Interest Earned" after upgrading. Currency balances are unchanged. (#84)
- Transactions were excluded by matching `pending` or `rejected` anywhere in the free-text `Details` column, case-sensitively. A row whose status was `Rejected` was therefore counted, while an approved row whose text merely mentioned "pending" was dropped. The status is now read as the field's leading token. This also affects accounts with no credit line. (#84)
- A blank `Transaction` id no longer truncates an account. Parsing stopped at the first row with an empty id while the File Details page went on describing the whole file, so an export with one blank id part-way through produced balances from only the rows before it, with nothing to indicate the rest had been dropped. (#84)
- `BUSD` was missing from the supported asset list, so a holding in it was excluded from the portfolio total and reported as unpriced. (#84)
- A row's status is now read once and used everywhere. The Status section and the detail-prefix summary previously classified the same rows differently, disagreeing within a single report. (#84)
- The "Detail prefixes" summary in the diagnostic report published whatever text preceded the first `/` in `Details`, so a prefix containing an email address or a merchant name was posted verbatim. Prefixes are now matched against the status words Nexo uses, and anything else is counted as `(other)`. The counts were the diagnostic value; the free text was not. (#84)

### Added
- A rule table covering all 34 recognised transaction types, up from 22. Each type records its effect on holdings, the row shapes it was written against, whether the rule is evidenced or inferred, and an explanation shown on the File Details page. (#84)
- File Details reports rows whose shape or currencies the app has no rule for, including types it otherwise recognises, and samples them. Previously only wholly unrecognised types were surfaced, so a known type behaving unusually was invisible. (#84)
- A per-type, per-currency contribution table, stating what each transaction type contributes to each balance and what the ignored types would have moved. This is what makes a wrong total traceable to the rows that caused it. (#84)
- For each row shape the app has no rule for, the report states its date span, currency pairs, and the `Details` text those rows share. Text appearing in only one row is never published, so a minority variant is visible without exposing anything unique to a single transaction. (#84)
- "Charged / Reversed" on the Overview dashboard, shown beside gross interest when an account has interest charges. (#84)

### Changed
- The demo fixture moves to the 12-column schema with a `Credit Line` column and includes credit-line card activity, so the shipped example exercises the paths this release fixes (3,421 → 3,466 rows). (#84)
- Report size is bounded by dropping the least diagnostic sections first and naming what was withheld, rather than truncating the end. Sample rows are never dropped. (#84)
- The report's closing statement that nothing was altered is withdrawn whenever that stops being true. (#84)

### Internal
- Card purchases are treated as Credit Mode. In Debit Mode they spend held assets instead of drawing a loan, and the two are indistinguishable by row shape; the report now surfaces the `Credit Line` column per type so such an export can be identified. (#84)
- The export schema varies by account rather than by date — an account without a credit line has 11 columns, one with a credit line has 12. Tests cover both. (#84)

## [4.4.0] - 2026-09-07

### Added
- A **File Details** page, reachable from the sidebar, reporting what the app actually read from an export: the column names and how many there are, the row count, the date range, and every transaction type with the shape of its rows. It also produces a report that can be pasted into an issue, so nobody has to send their CSV to get a data problem looked at. (#84, #97)
- The dashboard says so when an export contains transaction types the app does not recognise, naming them and giving the affected row count. Unrecognised types are not skipped by the balance calculation — they fall through to the generic path and are summed as if understood — so a file containing them produces a confident total that is wrong. This does not correct that; it stops it being silent. (#84, #97)

### Fixed
- A CSV the parser rejects now explains why. It previously displayed "Loaded &lt;filename&gt;" — a success confirmation — and discarded the reason: `fileSelected` was set before the file had been read, so the component rendered the loaded state while the only error renderer sat in a branch that could no longer be reached, and dismissing the card cleared the message before it could ever appear. (#97)
- `loadCSV` left `isLoading` true forever when parsing threw, and the file read had no error handler at all, which was a genuine silent hang if a file became unreadable between selection and reading. (#97)

### Changed
- papaparse 5.5.4 → 5.7.0, eslint 10.8.1 → 10.9.1, postcss 8.5.26 → 8.5.28, `@vitejs/plugin-react` 6.0.1 → 6.1.1, `@testing-library/react` 16.3.2 → 16.3.3. (#92, #93, #94, #95, #96)
- The papaparse minor was checked rather than trusted: its only changes are the removal of the jQuery integration, a `downloadTimeout` option for remote parsing, and date handling in `unparse` — none of which this app uses. Parse output was compared between versions across eleven edge cases, including a comma inside a quoted field (#34), escaped quotes, CRLF, a byte-order mark, a newline inside a quoted field and a header with padding. All identical.

### Internal
- Old export schemas remain rejected rather than supported. A pre-2023 export uses different transaction type names, but renaming is only the visible half of the change: two types also flipped sign convention, and the free-text `Details` column changed shape. A single sample file cannot establish what else moved in vintages nobody has seen, so no alias map is introduced. `LEGACY_TYPE_NAMES` recognises such a file only in order to explain it, and a test asserts it stays out of the parsing and balance paths.
- Diagnostic sample rows are published unaltered. Any redaction rule would be inferred from the handful of exports available, and one that misses something is worse than none because the user stops checking. A warning naming what to look for — transaction hashes, merchant names and locations, amounts, transaction IDs — leads the report and is on screen before it can be copied.
- The app never asserts that an unreadable file is simply old. Nexo removed a column in May 2026 (#39), so the same symptom can mean this app has not caught up rather than the export being stale; both explanations are offered wherever it cannot tell them apart.
- Test suite grew from 160 to 176 tests across 12 suites, and the E2E suite from 18 to 21.

## [4.3.0] - 2026-09-07

### Added
- The dashboard now states the date range an export actually covers, under the transaction count, and says so plainly when the newest row is more than 30 days old. Every balance in the app is a running sum over the whole CSV, which assumes the file begins at account opening and ends today. A date-bounded export breaks that assumption without breaking anything visible: balances come out correct as of the cut-off and are then priced at today's prices, so assets sold after the cut-off still read as holdings and the total reads high. Nothing in the numbers gives it away, which is why the covered span has to be stated outright. (#84, #89)

### Fixed
- The demo's "1W Change" tile had quietly degraded to `--` for every visitor who clicked Try Demo, and would have kept getting worse. `generate_demo.py` had its window hardcoded to 2025-03 .. 2026-03, so the fixture's newest row had drifted 165 days old — well past the three-day freshness `computeWeekPerformance` requires before it will report a week-over-week figure. Dates are now anchored to the generation date and every row shifted by one constant, so the fixture always ends on the day it was built. The seed is unchanged, so the data is identical and the row count is still 3,421. (#89)

### Changed
- `@tanstack/react-table` 8.21.3 → 9.2.4, a breaking major. v9 makes features opt-in rather than bundled: the four `get*RowModel` options are gone and the row-model factories move into a static `tableFeatures({...})` object alongside the feature modules, `useReactTable` is renamed `useTable`, and pagination state is read from `table.state` rather than `table.getState()`. Behaviour is unchanged, and the `@tanstack/react-table/legacy` compatibility layer was deliberately not used. Two suppressions became unnecessary and were removed: `@typescript-eslint/no-explicit-any`, since `columnHelper.columns([...])` preserves per-column value types, and `react-hooks/incompatible-library`, which v9 no longer trips. (#87)
- Six dependency updates: papaparse 5.5.4, react-dom 19.2.8, `@types/react-dom` 19.2.4, `@playwright/test` 1.62.1, `@testing-library/user-event` 14.6.4. Two of these were security advisories that had been sitting unapplied on `development` — browserslist (high, unbounded memory growth and a prototype write via untrusted stats) and `@humanfs/node` (moderate, recursive copy following symlinks out of the source tree). Both had landed on `main` only, because Dependabot security updates ignore `target-branch` by design, so `development` carried them until it was reconciled. `npm audit` now reports 0 vulnerabilities on both branches. (#80, #81, #82, #83, #85, #86)
- papaparse 5.5.3 → 5.5.4 was checked for silent parser drift rather than trusted: parsing a full export produced byte-identical output across both versions.

### Internal
- `npm run test:e2e` now runs the build itself. Playwright serves `dist/` through `vite preview`, so `npx playwright test` on its own exercised whatever was last built rather than current source — locally that failed silently and in the worst direction, going green against code that was no longer there. CI was never affected, since it built as a separate step; that step is now removed so `test:e2e` is the single owner. (#88)
- E2E coverage for table sorting, which had none at any level. The unit suites are pure-logic `src/lib/` tests that never touch the table, and the e2e suite covered rendering, search, pagination and column visibility but not sorting — so a regression in the sorted row model would have passed CI unnoticed, which is exactly the risk the react-table major introduced. Confirmed to fail when sorting is disabled. (#87)
- `npm run lint:paths` fails the build on machine-local absolute paths. `generate_demo.py` had written to a hardcoded absolute Windows user path since the demo was added, which meant it only ran on one machine and put a local username into a public repository. The path is now derived from the script's own location. (#89)
- Test suite grew from 152 to 160 tests across 11 suites, and the E2E suite from 17 to 18.

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
