
export interface IBinancePriceAmount {
    price: string,
    amount: string,
}

export interface IBestBidAsk {
    coinPair: string;
    receivedAt: number;
    bestBid: string;
    bestAsk: string;
    bestBidQty: string;
    bestAskQty: string;    
}

export interface IBinanceDeepth {
    coinPair: string;
    timestamp: number;
    receivedAt: number;
    bid: IBinancePriceAmount[];
    ask: IBinancePriceAmount[];    
}

export interface IBinanceAggTrade {
    coinPair: string;
    timestamp: number,
    receivedAt: number;
    isMaker: boolean,
    price: string,
    amount: string,
}
export interface IBinanceCoinInfos {
    [key: string]: IBinanceCoinInfo
}

export interface IBinanceCoinInfo {
    coinPair: string;
    deepth: IBinanceDeepth;
    bestBidAsk: IBestBidAsk;
    aggregateTrade: IBinanceAggTrade;
}


export interface IBinanceAccount {
    feeTier: number;    //0,
    canTrade: boolean;  //true,
    canDeposit: boolean;    //true,
    canWithdraw: boolean;   //true,
    updateTime: number;    //0,
    multiAssetsMargin: boolean;     //false,
    totalInitialMargin: string; //'0.00000000',
    totalMaintMargin: string;   //'0.00000000',
    totalWalletBalance: string; //'0.00000000',
    totalUnrealizedProfit: string;  //'0.00000000',
    totalMarginBalance: string; //'0.00000000',
    totalPositionInitialMargin: string; //'0.00000000',
    totalOpenOrderInitialMargin: string;    //'0.00000000',
    totalCrossWalletBalance: string;    //'0.00000000',
    totalCrossUnPnl: string;    //'0.00000000',
    availableBalance: string;   //'0.00000000',
    maxWithdrawAmount: string;  //'0.00000000'
    assets: {
        asset: string;  //'BTC'
        walletBalance: string;  //'0.00000000',
        unrealizedProfit: string;   //'0.00000000',
        marginBalance: string;  //'0.00000000',
        maintMargin: string;    //'0.00000000',
        initialMargin: string;  //'0.00000000',
        positionInitialMargin: string;  //'0.00000000',
        openOrderInitialMargin: string; //'0.00000000',
        maxWithdrawAmount: string;  //'0.00000000',
        crossWalletBalance: string; //'0.00000000',
        crossUnPnl: string; //'0.00000000',
        availableBalance: string;   //'0.00000000',
        marginAvailable: boolean;   //true,
        updateTime: number; //0
    }[];
    positions: {
        symbol: string; //'SUSHIUSDT',
        initialMargin: string;  //'0',
        maintMargin: string;    //'0',
        unrealizedProfit: string;   //'0.00000000',
        positionInitialMargin: string;  //'0',
        openOrderInitialMargin: string; //'0',
        leverage: string;   //'20',
        isolated: boolean;  //false,
        entryPrice: string; //'0.0',
        maxNotional: string;    //'25000',
        positionSide: string;   //'BOTH',
        positionAmt: string;    //'0',
        notional: string;   //'0',
        isolatedWallet: string; //'0',
        updateTime: number; //0,
        bidNotional: string;    //'0',
        askNotional: string;    //'0',
    }[]
}


export interface IBinanceOrderResponse {
    orderId: any; //3379672655,
    symbol: string; //'BTCUSDT',
    status: string; //'NEW',
    clientOrderId: string; //'Ugn0iig4p4fIXKEraQSFDB',
    price: string; //'53330.00',
    avgPrice: string; //'0.00',
    origQty: string; //'0.001',
    executedQty: string; //'0.000',
    cumQty: string; //'0.000',
    cumQuote: string; //'0.00000',
    timeInForce: string; //'GTX',
    type: string; //'LIMIT',
    reduceOnly: boolean;    //false,
    closePosition: boolean;    //false,
    side: string; //'SELL',
    positionSide: string; //'SHORT',
    stopPrice: string; //'0.00',
    workingType: string; //'CONTRACT_PRICE',
    priceProtect: boolean;    //false,
    origType: string; //'LIMIT',
    updateTime: number; //1687273928431
}

export interface IBinanceUserTrade {
    symbol: string; //'BTCUSDT',
    id: any; //262086445,
    orderId: number; //3388726196,
    side: string; //'SELL',
    price: string; //'30155.40',
    qty: string; //'0.100',
    realizedPnl: string; //'0',
    marginAsset: string; //'USDT',
    quoteQty: string; //'3015.54000',
    commission: string; //'1.20621600',
    commissionAsset: string; //'USDT',
    time: number; //1687962305038,
    positionSide: string; //'SHORT',
    maker: boolean; //false,
    buyer: boolean; //false
}