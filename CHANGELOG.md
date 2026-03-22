# Changelog

All notable changes to this project will be documented in this file.

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
