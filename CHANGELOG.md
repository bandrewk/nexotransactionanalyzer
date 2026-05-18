# Changelog

All notable changes to this project will be documented in this file.

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
