import { COIN_PAIR, COIN_SYMBOL, EXCHANGE } from "../constants/enum";
import { ExchangeAccountInfo } from "../db/schemas/ExchangeAccountInfo";
import { IAssetInfo } from "./IMarketInfo";

export enum ORDER_TYPE {
    BUY,
    SELL,
}


export enum JOB_TYPE {
    KIMP_TRADE
}

export enum ENTER_PRIORITY {
    QTY,
    PRICE,
}

export enum FEE_TYPE {
    KRW,
    USD,
    BNB,
}

export enum COMPLETE_TYPE {    
    FAIL,
    SUCCESS,
    NONE,
}

export interface IOrderInfo {
    price: number,
    qty: number,
    timestamp: number,
}

export interface ITradeInfo {
    jobWrokerId: string,

    exchange: EXCHANGE,
    orderId: string | number,
    
    type: ORDER_TYPE,
    avgPrice: number,
    totalVolume: number,
    totalQty: number,
    totalFee: number,

    orderInfos: IOrderInfo[],

    remainedBalance: number,
    createdAt: number,
    updatedAt: number,
}

export interface ITradeStatus {
    avgPrice_1: number,
    totalVolume_1: number,
    totalQty_1: number,
    totalFee_1: number,

    avgPrice_2: number,
    totalVolume_2: number,
    totalQty_2: number,
    totalFee_2: number,

    // 취소해야할 성공한 trade
    avgPrice_fail: number,
    totalVolume_fail: number,
    totalQty_fail: number,
    totalFee_fail: number,

    // 취소한 trade
    avgPrice_cancel: number,
    totalVolume_cancel: number,
    totalQty_cancel: number,
    totalFee_cancel: number,

    timestamp: number,
}

export interface ITradeJobInfo {
    _id?: string,
    userUID: string,
    jobWrokerId: string,

    enterTradeStatus: ITradeStatus,
    exitTradeStatus: ITradeStatus,

    enterTradeInfo_1: ITradeInfo[] | any,
    enterTradeInfo_2: ITradeInfo[] | any,
    exitTradeInfo_1: ITradeInfo[] | any,
    exitTradeInfo_2: ITradeInfo[] | any,

    targetEnterPrimium: number,
    targetExitPrimium: number,
    targetExitTheTher: number,

    enterStartPrimium: number,
    exitStartPrimium: number,

    enteredPrimium: number,
    exitedPrimium: number,

    enterStartThether: number,
    exitStartThether: number,

    enteredThether: number,
    exitedThether: number,

    enteredCurrencyPrice: number,
    exitedCurrencyPrice: number,

    enterCompleteType: COMPLETE_TYPE,
    exitCompleteType: COMPLETE_TYPE,

    createdAt: number,
    updatedAt: number,
}

export interface IJobWorker {
    _id?: string,
    userUID: string,
    userEmail: string,

    exchangeAccountInfoId_1: string,
    exchangeAccountInfoId_2: string,

    exchangeAccountInfo_1: ExchangeAccountInfo | null,
    exchangeAccountInfo_2: ExchangeAccountInfo | null,

    jobType: JOB_TYPE,
    config: JobConfig,

    coinPair_1: COIN_PAIR,
    coinPair_2: COIN_PAIR,

    symbol_1: COIN_SYMBOL,
    symbol_2: COIN_SYMBOL,

    tradeJobInfos: ITradeJobInfo[],

    enterTargetPrimium: number,
    exitTargetPrimium: number,

    createdAt?: number,
    updatedAt?: number,
}

export interface IJobWorkerInfo extends IJobWorker {
    isStarted?: boolean,
    assetInfo?: IAssetInfo,
}

export interface JobConfig {
    maxInputAmount: number,
    leverage: number,
    splitTradeQty: number,
    useCurrencyHedge: boolean,
    enterPriority: ENTER_PRIORITY,
}

export interface IPrimiumChartConfig {
    exchange1: EXCHANGE,
    exchange2: EXCHANGE,
    coinPair1: COIN_PAIR,
    coinPair2: COIN_PAIR,
    coinSymbol: COIN_SYMBOL
}


export interface OCHL {
    open: number,
    close: number,
    high: number,
    low: number,
    time: number,
    timestamp: number,
    localtime: string,
}

export interface IChartData {
    enter: OCHL[],
    exit: OCHL[]
}