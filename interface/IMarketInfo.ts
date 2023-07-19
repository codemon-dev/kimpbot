import { COIN_PAIR, COIN_SYMBOL, CURRENCY_SITE_TYPE, CURRENCY_TYPE, EXCHANGE, EXCHANGE_TYPE } from "../constants/enum";
import { ICurrencyInfos } from "./ICurrency";

export interface IMarketInfo {
    currencyInfos: ICurrencyInfos;
    coinInfos: CoinInfos;
}

export interface IReqMarketInfo {
    symbols?: COIN_SYMBOL[];
    exchanges?: EXCHANGE[];
    onOff: boolean;
}

export interface CoinInfos {
    [key: string]: CoinInfo
}

export interface PriceQty {
    price: number,
    qty: number
}

export interface OrderBookInfo {
    bid: PriceQty[],
    ask: PriceQty[],
    timestamp: number,
}

export interface CoinInfo {
    coinPair: COIN_PAIR,
    symbol: COIN_SYMBOL,
    exchange: EXCHANGE, 
    exchangeType: EXCHANGE_TYPE, 
    price: number,
    sellPrice: number,
    sellQty: number,
    buyPrice: number,
    buyQty: number,
    accountInfo?: ACCOUNT_INFO,
    orderBook: OrderBookInfo,
}

export interface ACCOUNT_INFO {
    coinPair: COIN_PAIR,
    qty: number,
    pnl: number,
    price: number,
    avaliableBalance: number,
    leverage: number,
    isolated: boolean,
    currencyType: CURRENCY_TYPE,
    initialMargin: number,
}

export interface IAssetInfo {
    jobWorkerId: string,
    currencyPrice: number,
    symbol: COIN_SYMBOL
    currencyType_1: CURRENCY_TYPE,
    currencyType_2: CURRENCY_TYPE,
    balance_1: number,
    balance_2: number,    
    coinQty_1: number,
    coinQty_2: number,
    price_1: number,
    price_2: number,
    pnl_1: number,
    pnl_2: number,
    margin_1: number,
    margin_2: number,
}