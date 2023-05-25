export interface IBinancePriceAmount {
    price: string,
    amount: string,
}

export interface IBestBidAsk {
    symbol: string;
    receivedAt: number;
    bestBid: string;
    bestAsk: string;
    bestBidQty: string;
    bestAskQty: string;    
}

export interface IBinanceDeepth {
    symbol: string;
    timestamp: number;
    receivedAt: number;
    bid: IBinancePriceAmount[];
    ask: IBinancePriceAmount[];    
}

export interface IBinanceAggTrade {
    symbol: string;
    timestamp: number,
    receivedAt: number;
    isMaker: boolean,
    price: string,
    amount: string,
}

export interface IBinanceCoinInfo {
    symbol: string;
    deepth: IBinanceDeepth;
    bestBidAsk: IBestBidAsk;
    aggregateTrade: IBinanceAggTrade;
}