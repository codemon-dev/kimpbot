
export enum EXCHANGE_RATE_URL {
    DUNAMU = 'http://quotation-api-cdn.dunamu.com/v1/forex/recent?codes=FRX.KRWUSD',
    INVESTRING = 'https://api.investing.com/api/financialdata/650/historical/chart/?period=P1W&interval=PT1M&pointscount=60',

    // 실시간
    // YAHOO = 'https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?region=US&lang=en-US&includePrePost=false&interval=1d&useYfid=false&range=1d&corsDomain=finance.yahoo.com&.tsrc=finance'
    // 1분단위
    YAHOO = 'https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?region=US&lang=en-US&includePrePost=false&interval=1m&useYfid=false&range=1d&corsDomain=finance.yahoo.com&.tsrc=finance',
    WEBULL = 'https://quotes-gw.webullfintech.com/api/stock/tickerRealTime/getQuote?tickerId=913344371&includeSecu=1&includeQuote=1&more=1',
}
  
export enum EXCHANGE {
    NONE = "none",
    UPBIT = "upbit",
    BITHUM = "bithum",
    BINANCE = "binance",
    BYBIT = "bybit",    
}

export enum CURRENCY_TYPE {
    NONE= "NONE",
    KRW='KRW',
    USDT="USDT",
}

export enum CURRENCY_SITE_TYPE {
    NONE= "NONE",
    DUNAMU='DUNAMU',
    INVESTRING="INVESTRING",
    YAHOO = 'YAHOO',
    WEBULL = 'WEBULL',
}

export enum EXCHANGE_TYPE {
    DOMESTIC,
    OVERSEA,
    NONE,
}

export enum COIN_SYMBOL {
    NONE = "NONE",
    BTC = "BTC",
    ETH = "ETH",
    XRP = "XRP",
    DOGE = "DOGE",
    KRW = "KRW",
    USDT = "USDT",
}

export enum COIN_PAIR {
    NONE = "NONE",
    BTCKRW = "KRW-BTC",
    ETHKRW = "KRW-ETH",
    XRPKRW = "KRW-XRP",
    DOGEKRW = "KRW-DOGE",
    BTCUSDT = "BTCUSDT",
    ETHUSDT = "ETHUSDT",
    XRPUSDT = "XRPUSDT",
    DOGEUSDT = "DOGEUSDT",    
}
  
export enum UPBIT_ENDPOINT {
    CHANCE = "https://api.upbit.com/v1/orders/chance",
    ACCOUNTS = "https://api.upbit.com/v1/accounts",
    ORDERS = "https://api.upbit.com/v1/orders",
    ORDER = "https://api.upbit.com/v1/order",
}
  

export enum FETCH_METHOD {
    GET = "GET",
    POST = "POST",
    DELETE = "DELETE",
}
  
export enum ORDER_BID_ASK {
    ASK = "ask",    // 매도
    BID = "bid",    // 매수
}

export enum UPBIT_ORDER_TYPE {    
    MARKET_SELL = "market", // 시장가 매도
    LIMIT = "limit",    // 지정가
    MARKET_BUY = "price" // 시장가 매수
}