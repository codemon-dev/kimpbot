import { COIN_PAIR, COIN_SYMBOL, EXCHANGE, EXCHANGE_TYPE, ORDER_BID_ASK } from "../../constants/enum";
import { CoinInfo } from "../../interface/IMarketInfo";
import Handlers from "./Handlers";
import BinanceHander from "./binanceHandler"
import UpbitHandler from "./upbitHandler";

export interface ExchangeTradeInfo {
    coinInfo: CoinInfo,
    coinBalacne: number,
    avaliableBanance: number,
    totalBalance: number,
}

export interface ExchangeHandlerConfig {
    exchange: EXCHANGE;
    coinPairs: COIN_PAIR[];
    symbols: COIN_SYMBOL[];
    apiKey: string;
    secretKey: string;
    jobId: string;
    listener: any;
    leverage: number;
}

export interface IExchangeCoinInfo {
    coinPair: COIN_PAIR;
    status: boolean;
    minPrice: number;
    maxPrice: number;
    tickSize: number;
    stepSize: number;
    minQty: number;
    maxQty: number;
    minNotional: number;
    liquidationFee: number;
    takerFee: number;
    makerFee: number;
}

export default class ExchangeHandler {
    private handlers: Handlers;
    public exchangeHandler: BinanceHander | UpbitHandler | undefined;    
    private exchangeType: EXCHANGE_TYPE | undefined;
    private coinPairs: COIN_PAIR[];
    private symbols: COIN_SYMBOL[];
    private listener: any;
    private exchangeCoinInfos: Map<COIN_PAIR, IExchangeCoinInfo>;
    private config: ExchangeHandlerConfig;
    public exchange: EXCHANGE | undefined;

    constructor (handlers: Handlers, config: ExchangeHandlerConfig) {
        handlers?.logHandler?.log?.info("create ExchangeHandler")
        this.handlers = handlers;
        this.coinPairs = [...config.coinPairs];
        this.symbols = [...config.symbols];
        this.listener = config.listener;
        this.exchangeCoinInfos = new Map<COIN_PAIR, IExchangeCoinInfo>();
        this.exchange = config.exchange;
        this.config = config;
        
        if (config.exchange === EXCHANGE.UPBIT) {
            this.exchangeHandler = new UpbitHandler(this.handlers, config.jobId);
            this.exchangeType = EXCHANGE_TYPE.DOMESTIC;
        } else if (config.exchange === EXCHANGE.BINANCE) {
            this.exchangeHandler = new BinanceHander(this.handlers);
            this.exchangeType = EXCHANGE_TYPE.OVERSEA;
        } else {
            this.handlers?.logHandler?.log?.error(`${config.exchange} is not supported.`)
            return;
        }
    }

    public initialize = async () => {
        if (!this.exchangeHandler) {
            return false
        }
        this.handlers?.logHandler?.log?.info("initialize.")
        const ret = await this.exchangeHandler?.initialize(this.config);
        if (ret === false) {
            return false;
        }
        this.exchangeHandler.addListener(this.listener);
        return true;
    }

    public startHandler = async (coinPairs: COIN_PAIR[]) => {
        if (!this.exchangeHandler) {
            return;
        }
        this.handlers?.logHandler?.log?.info("startHandler.")       
        this.exchangeHandler.startHandler(coinPairs);
    }

    public getCoinInfos = async (coinPair: COIN_PAIR) => {
        let exchangeCoinInfo: IExchangeCoinInfo = {
            coinPair: COIN_PAIR.NONE,
            status: false,
            minPrice: 0,
            maxPrice: 0,
            tickSize: 0,
            stepSize: 0,
            minQty: 0,
            maxQty: 0,
            minNotional: 0,
            liquidationFee: 0,
            takerFee: 0,
            makerFee: 0,
        };
        try {
            if (!this.exchangeHandler) {
                return exchangeCoinInfo;
            }
            this.exchangeCoinInfos = await this.exchangeHandler.getExchangeCoinInfos(this.coinPairs);
            exchangeCoinInfo = this.exchangeCoinInfos?.get(coinPair) ?? exchangeCoinInfo;
        } catch (err) {
            this.handlers?.logHandler?.log?.error("getCoinInfos err. err: ", err);
        }
        return exchangeCoinInfo;
    }

    public checkFakeTrade = async (bidAsk: ORDER_BID_ASK, volume: number, price: number) => {
        const ret = await this.exchangeHandler?.checkFakeTrade(bidAsk, volume, price);
        this.handlers?.logHandler?.log?.info("checkFakeTrade: ", ret);
        return ret;
    }

    public fetchBalance = async () => {
        if (!this.exchangeHandler) {
            return
        }
        return await this.exchangeHandler.fetchBalance();
    }

    public orderMarketBuy = async (volume: number, price: number, jobWorkerId?: string) => {
        return await this.exchangeHandler?.orderMarketBuy(volume, price, jobWorkerId);
    }

    public orderMarketSell = async (volume: number, jobWorkerId?: string) => {
        return await this.exchangeHandler?.orderMarketSell(volume, jobWorkerId);
    }

    public dispose = () => {
        this.handlers?.logHandler?.log?.info("dispose ExchangeHandler. ");
        this.exchangeHandler?.removeListener();
        this.exchangeHandler?.dispose();
        delete this.exchangeHandler;
    }
}