// Coinbase API, avoid if possible
export const COINBASE_API_STRING =
  "https://api.coinbase.com/v2/exchange-rates?currency=";

// Refresh prices every n seconds (ms)
export const PRICEFEED_PULL_RATE = 60000;

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

// Get ECB API for EUR.
// Date format: 2009-05-31
export const ECB_API_EUR = (startDate: string, endDate: string) => {
  //https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?startPeriod=2009-05-01&endPeriod=2009-05-31&detail=dataonly&format=jsondata
  const api = `https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?startPeriod=${startDate}&endPeriod=${endDate}&detail=dataonly&format=jsondata`;
  return api;
};

// Bank of england api for GBP
// Sadly unuseable without CORS proxy
// Date format: 28/Aug/2022
export const BOE_API_GBP = (date: string) => {
  const api =
    "https://crossorigin.me/https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes";

  const params = new URLSearchParams({
    Datefrom: `${date}`,
    Dateto: `${date}`,
    SeriesCodes: "XUDLGBD",
    CSVF: "TN",
    UsingCodes: "Y",
    VPD: "Y",
    VFD: "N",
  });

  return api + params;
};

//Refresh news  every n seconds (ms)
export const NEWSFEED_PULL_RATE = 300000; // 5min

export const VERSION = `1`;
