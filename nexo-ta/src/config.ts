// Coinbase API, avoid if possible
export const COINBASE_API_STRING =
  "https://api.coinbase.com/v2/exchange-rates?currency=";

// Refresh prices every n seconds (ms)
export const PRICEFEED_PULL_RATE = 10000 / 2;

// Coingecko simple price api
// See https://www.coingecko.com/en/api/documentation
export const COINGECKO_API_SIMPLE_PRICE = (id: string[]) => {
  let currencies = "";

  id.forEach((element, index) => {
    currencies += index > 0 ? `,${element}` : `${element}`;
  });

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${currencies}&vs_currencies=usd`;
  return url;
};

//Refresh news  every n seconds (ms)
export const NEWSFEED_PULL_RATE = 300000; // 5min

export const VERSION = `1`;
