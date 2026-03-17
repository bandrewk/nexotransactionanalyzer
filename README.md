[![Node.js CI](https://github.com/bandrewk/nexotransactionanalyzer/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/bandrewk/nexotransactionanalyzer/actions/workflows/node.js.yml)
# nexo-ta.com

Web analyzer app for the Nexo.com crypto platform. Upload and analyze your exported transaction `.csv` files.

Version >= 2.0 is using Typescript and React.

## Build

```
git clone https://github.com/bandrewk/nexotransactionanalyzer
cd nexotransactionanalyzer
npm install
npm start
```

No external services required. Currency metadata is bundled locally in `src/currencyData.ts` and price data is fetched from CoinGecko and frankfurter.app at runtime.

## Features

- Transaction tracking and portfolio overview
- Portfolio value determination using CoinGecko and frankfurter.app exchange APIs
- Donut chart visualization of portfolio distribution
- Coinlist with dust/residual balance separation
- Transaction linkage to blockchain explorer (TX linkage)
- Earned interest tracking with charts
- Deposit/withdrawal history
- Referral bonus tracking
- Support for the latest Nexo CSV export format (12-column)

## Support development

ETH: 0x6aa9da4a0f149a140f6813cbd84e1ee2df05e76e

BTC: bc1q5sl35at30wtftl4je7p0pwwxhwtekfe23602tj

RVN: RCJ92C29iZimha5H4Lw3GwKQQNiCMdd5dh

## Deprecated versions

V1: [v1.nexo-ta.com](https://v1.nexo-ta.com/)
