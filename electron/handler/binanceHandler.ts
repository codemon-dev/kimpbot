import Binance from "node-binance-api"
import Handlers from "./Handlers";
import { IBinanceAccount, IBinanceDeepth, IBinanceOrderResponse, IBinanceUserTrade } from "../../interface/IBinance";
import { ACCOUNT_INFO, CoinInfos, PriceQty } from "../../interface/IMarketInfo";
import { COIN_PAIR, COIN_SYMBOL, CURRENCY_TYPE, EXCHANGE, EXCHANGE_TYPE, ORDER_BID_ASK } from "../../constants/enum";
import { IBestBidAsk } from "../../interface/IBinance";
import { IBinanceAggTrade } from "../../interface/IBinance";
import { ExchangeHandlerConfig, IExchangeCoinInfo } from "./exchangeHandler";
import { getSymbolFromCoinPair } from "../../util/tradeUtil";
import { IOrderInfo, ITradeInfo, ORDER_TYPE } from "../../interface/ITradeInfo";
import _ from "lodash";
import { FETCH_BALANCE_INTERVAL } from "../../constants/constants";

export default class BinanceHander {
    private handlers: Handlers | undefined;
    private binance: Binance | undefined;
    public coinInfos: CoinInfos = {};
    private listener: any = null;
    private exchnageCoinInfos: Map<COIN_PAIR, IExchangeCoinInfo>;
    private apiKey: any = null;
    private secretKey: any = null;
    private coinPairs: COIN_PAIR[] = [];
    private balanceInterval: any = null;
    private accountInfo: ACCOUNT_INFO;

    constructor (handlers: Handlers) {
        handlers.logHandler?.log?.info(`create BinanceHander`)
        this.handlers = handlers
        this.exchnageCoinInfos = new Map<COIN_PAIR, IExchangeCoinInfo>();
        this.binance = new Binance().options({
            verbose: false,
            test: false,
            useServerTime: true,
            hedgeMode: true,
        });
        this.accountInfo = {
            coinPair: COIN_PAIR.NONE,
            qty: 0,
            initialMargin: 0,
            avaliableBalance: 0,
            currencyType: CURRENCY_TYPE.NONE,
            pnl: 0,
            price: 0,
            leverage: 0,
            isolated: false,
        }
    }

    public addListener = (listener: any) => { this.listener = listener; }
    public removeListener = () => { this.listener = null;}

    public dispose = () => {
        this.handlers?.logHandler?.log?.info("dispose BinanceHandler")
        if (this.balanceInterval) {
            clearInterval(this.balanceInterval);
            this.balanceInterval = null;
        }
        this.removeListener();
    }

    public setAPIKey = (apiKey: string, secretKey: string) => {
        this.handlers?.logHandler?.log?.info(`[BINANCE] setAPIKey. apiKey: ${apiKey}, secretKey: ${secretKey}`);
        this.apiKey = apiKey;
        this.secretKey = secretKey;
        this.binance?.options({...this.binance.getOptions(), ...{
            APIKEY: apiKey,
            APISECRET: secretKey,
        }});
    }

    public initialize = async (config: ExchangeHandlerConfig) => {
        this.coinPairs = [...config.coinPairs];

        this.coinPairs.forEach((coinPair: COIN_PAIR) => {
            this.coinInfos[coinPair] = {
                coinPair, symbol: getSymbolFromCoinPair(coinPair), exchange: EXCHANGE.BINANCE,  exchangeType: EXCHANGE_TYPE.OVERSEA, 
                price: -1, sellPrice: -1, sellQty: -1, buyPrice: -1, buyQty: -1, accountInfo: this.accountInfo, orderBook: {bid: [], ask: [], timestamp: 0}
            }
        })

        this.setAPIKey(config.apiKey, config.secretKey);
        
        if (this.apiKey && this.secretKey) {
            const ret1 = await this.binance?.futuresMarginType(this.coinPairs[0], 'CROSSED');
            const ret2 = await this.binance?.futuresChangePositionSideDual(true);
            const ret3 = await this.binance?.futuresLeverage(this.coinPairs[0], config.leverage);

            // this.handlers?.logHandler?.log?.debug("ret1: ", ret1)
            // this.handlers?.logHandler?.log?.debug("ret2: ", ret2)
            // this.handlers?.logHandler?.log?.debug("ret3: ", ret3)
            await this.fetchBalance();
            this.handlers?.logHandler?.log?.info(`[BINANCE][initialize]. accountInfo: `, this.accountInfo)
        }
        
        this.handlers?.logHandler?.log?.info("[BINANCE] config: ", config)
        if (!this.accountInfo || this.accountInfo.isolated === true || this.accountInfo.leverage !== config.leverage) {
            return false;
        }
        return true;
    }

    public checkFakeTrade = async (order: ORDER_BID_ASK, volume: number, price: number) => {
        /*        
        ETHUSDT 의 경우 아래처럼 bigINT 때문에 cancle order불가하여 임시 로 막음.
        orderId: { s: 1, e: 18, c: [ 83897, 65609753236609 ] },
        symbol: 'ETHUSDT',
        */
        return true;

        let ret: any;
        // this.handlers?.logHandler?.log?.info(`[BINANCE][checkFakeTrade][1] volume: ${volume}, price: `, price);
        if (order === ORDER_BID_ASK.ASK) {
            ret = await this.orderShort(this.coinPairs[0], volume, price);
        } else {
            ret = await this.orderBuy(this.coinPairs[0], volume, price);
            
        }
        if (!ret || ret.status !== "NEW") {
            return false;
        }
        const response: IBinanceOrderResponse = ret;
        this.handlers?.logHandler?.log?.info(`[BINANCE][cancleOrder][0] orderId: ${response.orderId}, ret: `, ret);
        ret = await this.binance?.futuresCancel(this.coinPairs[0], {orderId: response.orderId});
        this.handlers?.logHandler?.log?.info(`[BINANCE][cancleOrder][2] orderId: ${response.orderId}, ret: `, ret);
        return true;
    }

    public orderMarketBuy = async (volume: number, price: number, jobWorkerId?: string) => {
        return new Promise(async (resolve) => {
            try {
                let orderRet: any;
                volume = this.binance?.roundStep(volume, this.exchnageCoinInfos.get(this.coinPairs[0])?.stepSize)
                orderRet = await this.binance?.futuresMarketBuy(this.coinPairs[0], volume, {positionSide: "SHORT", newOrderRespType: 'RESULT'})
                this.handlers?.logHandler?.log?.info(`[BINANCE][ORDER][MARKET_BUY] volume: ${volume}, orderRet: `, orderRet);
                if (!orderRet || !orderRet.orderId || !orderRet.symbol) {
                    resolve(null);
                    return;
                }
                const orderRes: IBinanceOrderResponse = orderRet;
                if (orderRes.status === "FILLED") {
                    let trades: any = await this.binance?.futuresUserTrades(this.coinPairs[0], {orderId: orderRet.orderId});
                    let fee = parseFloat((parseFloat(orderRes.cumQuote) * (this.exchnageCoinInfos.get(this.coinPairs[0])?.takerFee ?? 0) * 0.01).toFixed(8));
                    if (trades?.length > 0 && trades[0].orderId === orderRes.orderId && trades[0].commissionAsset === "USDT") {
                        fee = parseFloat(trades[0].commission);
                    }

                    let orderInfo: IOrderInfo = {
                        price: parseFloat(orderRes.avgPrice),
                        qty: parseFloat(orderRes.executedQty),
                        timestamp: orderRes.updateTime,
                    }
                    const accountInfo = await this.fetchBalance();
                    let tradeInfo: ITradeInfo = {
                        jobWrokerId: jobWorkerId ?? "",
                        exchange: EXCHANGE.BINANCE,
                        orderId: orderRet.orderId,
                        type: ORDER_TYPE.SELL,
                        avgPrice: orderInfo.price,
                        totalVolume: parseFloat(orderRes.cumQuote),
                        totalQty: orderInfo.qty,
                        totalFee: fee,
                        orderInfos: [orderInfo],
                        avaliableBalance: accountInfo?.avaliableBalance ?? 0,
                        createdAt: orderInfo.timestamp,
                        updatedAt: orderInfo.timestamp,
                    }
                    resolve(tradeInfo);
                    return;
                }
                resolve(null);
            } catch (err) {
                this.handlers?.logHandler?.log?.error("[EXCEPTION][BINANCE][ORDER][MARKET_SELL] err: ", err)
                resolve(null);
            }
        });
    }
    
    public orderMarketSell = async (volume: number, jobWorkerId?: string) => {        
        return new Promise(async (resolve) => {
            try {
                let orderRet: any;            
                volume = this.binance?.roundStep(volume, this.exchnageCoinInfos.get(this.coinPairs[0])?.stepSize)
                orderRet = await this.binance?.futuresMarketSell(this.coinPairs[0], volume, {newOrderRespType: 'RESULT'});            
                this.handlers?.logHandler?.log?.info(`[BINANCE][ORDER][MARKET_SELL] volume: ${volume}, orderRet: `, orderRet);
                if (!orderRet || !orderRet.orderId || !orderRet.symbol) {
                    resolve(null);
                    return;
                }
                const orderRes: IBinanceOrderResponse = orderRet;
                if (orderRes.status === "FILLED") {
                    let trades: any = await this.binance?.futuresUserTrades(this.coinPairs[0], {orderId: orderRet.orderId});
                    let fee = parseFloat((parseFloat(orderRes.cumQuote) * (this.exchnageCoinInfos.get(this.coinPairs[0])?.takerFee ?? 0) * 0.01).toFixed(8));
                    if (trades?.length > 0 && trades[0].orderId === orderRes.orderId && trades[0].commissionAsset === "USDT") {
                        fee = parseFloat(trades[0].commission);
                    }
    
                    const accountInfo = await this.fetchBalance();
                    let orderInfo: IOrderInfo = {
                        price: parseFloat(orderRes.avgPrice),
                        qty: parseFloat(orderRes.executedQty),
                        timestamp: orderRes.updateTime,
                    }
                    let tradeInfo: ITradeInfo = {
                        jobWrokerId: jobWorkerId ?? "",
                        exchange: EXCHANGE.BINANCE,
                        orderId: orderRet.orderId,
                        type: ORDER_TYPE.SELL,
                        avgPrice: orderInfo.price,
                        totalVolume: parseFloat(orderRes.cumQuote),
                        totalQty: orderInfo.qty,
                        totalFee: fee,
                        orderInfos: [orderInfo],
                        avaliableBalance: accountInfo?.avaliableBalance ?? 0,
                        createdAt: orderInfo.timestamp,
                        updatedAt: orderInfo.timestamp,
                    }
                    resolve(tradeInfo);
                    return;
                }
                resolve(null);
            } catch (err) {
                this.handlers?.logHandler?.log?.error("[EXCEPTION][BINANCE][ORDER][MARKET_SELL] err: ", err)
                resolve(null);
            }
        });
    }

    public orderBuy = async (coinPair: COIN_PAIR, volume: number, price: number) => {
        let ret: any = await this.binance?.futuresBuy(coinPair, volume, price);
        this.handlers?.logHandler?.log?.info(`[BINANCE][ORDER][LONG] coinPair: ${coinPair}, volume: ${volume}, price: ${price}. ret: `, ret);
        if (!ret || ret.code) {
            return null;
        }
        return ret;
    }

    public orderShort = async (coinPair: COIN_PAIR, volume: number, price: number) => {
        let ret: any = await this.binance?.futuresSell(coinPair, volume, price);
        this.handlers?.logHandler?.log?.info(`[BINANCE][ORDER][SHORT] coinPair: ${coinPair}, volume: ${volume}, price: ${price}. ret: `, ret);
        if (!ret || ret.code) {
            return null;
        }
        return ret;
    }

    public fetchBalance = async (symbols: COIN_SYMBOL[] = [COIN_SYMBOL.USDT]): Promise<any> => {        
        try {
            if (!this.apiKey || !this.secretKey) {
                return;
            }
            let account: IBinanceAccount = await this.binance?.futuresAccount();
            account.assets = account.assets?.filter((asset: any) => (symbols?.includes(asset.asset)))   // "USDT", "BTC"
            // account.positions = account.positions?.filter((position: any) => {
            //     return (this.coinPairs?.includes(position.symbol) && position.positionSide == "SHORT")
            // });  //"BTCUSDT"
            account.positions = account.positions?.filter((position: any) => {
                return (this.coinPairs?.includes(position.symbol) && position.positionSide === "SHORT")
            });  //"BTCUSDT"
            // this.handlers?.logHandler?.log?.debug("[BINANCE] totalWalletBalance: ", account.totalWalletBalance);
            // this.handlers?.logHandler?.log?.debug("[BINANCE] availableBalance: ", account.availableBalance);
            // this.handlers?.logHandler?.log?.debug("[BINANCE] totalCrossUnPnl: ", account.totalCrossUnPnl);
            // this.handlers?.logHandler?.log?.debug("[BINANCE] positions: ", account.positions);          

            this.accountInfo = {
                coinPair: account.positions?.length > 0? account.positions[0].symbol as COIN_PAIR: COIN_PAIR.NONE,
                qty: account.positions?.length > 0? Math.abs(parseFloat(account.positions[0].positionAmt)): 0,
                initialMargin: account.positions?.length >0? parseFloat(account.positions[0].initialMargin): 0,
                avaliableBalance: parseFloat(account.availableBalance),
                currencyType: CURRENCY_TYPE.USDT,
                pnl: account.positions?.length > 0 ? parseFloat(account.positions[0].unrealizedProfit): 0,
                price: account.positions?.length > 0 ? parseFloat(account.positions[0].entryPrice): 0,
                leverage: account.positions?.length > 0? parseFloat(account.positions[0].leverage): 0,
                isolated: account.positions?.length > 0? account.positions[0].isolated: false,
            }
            if (this.coinPairs?.length > 0) {
                this.coinInfos[this.coinPairs[0]].accountInfo = {...this.accountInfo}
            }
        } catch (err: any) {
            this.handlers?.logHandler?.log?.error("[BINANCE] fetchBalance error: ", err);
            this.accountInfo = {
                coinPair: COIN_PAIR.NONE,
                qty: 0,
                initialMargin: 0,
                avaliableBalance: 0,
                currencyType: CURRENCY_TYPE.USDT,
                pnl: 0,
                price: 0,
                leverage: 0,
                isolated: false,
            }
            if (this.coinPairs?.length > 0) {
                this.coinInfos[this.coinPairs[0]].accountInfo = {...this.accountInfo}
            }
        } finally {
            return this.accountInfo;
        }
    }

    public getExchangeCoinInfos = async (coinPairs: COIN_PAIR[]) => {
        const exchagneInfo: any = await this.binance?.futuresExchangeInfo();
        if (!exchagneInfo || exchagneInfo.symbols?.length === 0) {
            this.exchnageCoinInfos.clear();
            return this.exchnageCoinInfos;
        }
        try {
            //this.handlers?.logHandler?.log?.info('exchagneInfo: ', exchagneInfo);
            for (const symbol of exchagneInfo.symbols) {
                if (coinPairs.includes(symbol.pair)) {                
                    let exchangeCoinInfo: IExchangeCoinInfo = {
                        coinPair: symbol.pair,
                        status: symbol.status === "TRADING"? true: false,
                        liquidationFee: symbol.liquidationFee,
                        pricePrecision: symbol.pricePrecision ?? -1,
                        quantityPrecision: symbol.quantityPrecision ?? -1,
                        takerFee: 0.04,
                        makerFee: 0.02,
                        minPrice: 0,
                        maxPrice: 0,
                        tickSize: 0,
                        stepSize: 0,
                        minQty: 0,
                        maxQty: 0,
                        minNotional: 0,                                            
                    }
                    for (let filter of symbol.filters ) {
                        if ( filter.filterType == "MIN_NOTIONAL" ) {
                            exchangeCoinInfo.minNotional = filter.notional;
                        } else if ( filter.filterType == "PRICE_FILTER" ) {
                            exchangeCoinInfo.minPrice = filter.minPrice;
                            exchangeCoinInfo.maxPrice = filter.maxPrice;
                            exchangeCoinInfo.tickSize = filter.tickSize;
                        // } else if ( filter.filterType == "LOT_SIZE" ) {
                        } else if ( filter.filterType == "MARKET_LOT_SIZE" ) {
                            exchangeCoinInfo.stepSize = filter.stepSize;
                            exchangeCoinInfo.minQty = filter.minQty;
                            exchangeCoinInfo.maxQty = filter.maxQty;
                        }
                    }
                    this.handlers?.logHandler?.log?.info(exchangeCoinInfo);
                    this.exchnageCoinInfos.set(exchangeCoinInfo.coinPair, exchangeCoinInfo);
                    break;
                }
            }
        } catch (err) {
            this.handlers?.logHandler?.log?.error("[BINANCE] getExchangeCoinInfos error: ", err);
            this.exchnageCoinInfos.clear();
        }
        return this.exchnageCoinInfos
    }

    public startHandler = async (coinPairs: COIN_PAIR[]) => {
        this.handlers?.logHandler?.log?.info("[BINANCE] startHandler. coinPairs: ", coinPairs);        
        this.coinPairs = [...coinPairs];
        if (this.coinPairs?.length === 0) {
            return;
        }
        let newCoinPairs: string[] = []
        this.coinPairs.forEach((coinPair: COIN_PAIR) => {
            newCoinPairs.push(coinPair.toString());
        })
        newCoinPairs.forEach((coinPair: any) => {
            this.coinInfos[coinPair] = {
                coinPair, symbol: getSymbolFromCoinPair(coinPair), exchange: EXCHANGE.BINANCE,  exchangeType: EXCHANGE_TYPE.OVERSEA, 
                price: -1, sellPrice: -1, sellQty: -1, buyPrice: -1, buyQty: -1, accountInfo: this.accountInfo, orderBook: {bid: [], ask: [], timestamp: 0}
            }
            if (this.listener) {
                this.listener(null);
            }
        })

        if (this.apiKey && this.secretKey) {
            await this.fetchBalance();
            this.handlers?.logHandler?.log?.info(`[BINANCE] first fetched balance. accountInfo: `, this.accountInfo)
        }
        if (this.balanceInterval) {
            clearInterval(this.balanceInterval);
            this.balanceInterval = null;
        }
        if (this.apiKey && this.secretKey) {
            this.balanceInterval = setInterval(() => {
                this.fetchBalance();
            }, FETCH_BALANCE_INTERVAL);
        }

        newCoinPairs.forEach((coinPair: any) => {
            // let lowerSymbol: string = symbol.toLowerCase();
            // let lowerSymbol: string = "btcusdt"
            this.binance?.futuresSubscribe(`${coinPair.toString().toLowerCase()}@depth10`, (data: any) => {
                try {
                    this.coinInfos[coinPair].orderBook.timestamp = data.T;
                    let ask: PriceQty[] = [];
                    let bid: PriceQty[] = [];
                    if (data?.a.length > 0) {
                        data.a?.forEach((item: any) => {
                            ask.push({price: parseFloat(item[0]), qty: parseFloat(item[1])});
                        });
                    }       
                    if (data?.b.length > 0) {
                        data.b?.forEach((item: any) => {
                            bid.push({price: parseFloat(item[0]), qty: parseFloat(item[1])});
                        });
                    }
                    this.coinInfos[coinPair].orderBook.ask = ask;
                    this.coinInfos[coinPair].orderBook.bid = bid;
                    this.coinInfos[coinPair].sellPrice = this.coinInfos[coinPair].orderBook.ask[0].price;
                    this.coinInfos[coinPair].sellQty = this.coinInfos[coinPair].orderBook.ask[0].qty;
                    this.coinInfos[coinPair].buyPrice = this.coinInfos[coinPair].orderBook.bid[0].price;
                    this.coinInfos[coinPair].buyQty = this.coinInfos[coinPair].orderBook.bid[0].qty;                    
                    
                    if (this.listener) {
                        this.listener(_.cloneDeep(this.coinInfos[coinPair]));
                    }
                } catch (err) {
                    this.handlers?.logHandler?.log?.error("[BINANCE] futuresSubscribe error. err: ", err);
                    if (this.listener) {
                        this.listener(null);
                    }
                }
            });    
        })
        
        this.binance?.futuresBookTickerStream(newCoinPairs.toString(), (data: any) => {
            try {
                if (!this.coinInfos) {
                    return;
                }
                const bestBidAsk: IBestBidAsk = {
                    coinPair: data.symbol,
                    receivedAt: Date.now(),
                    bestBid: data.bestBid,
                    bestAsk: data.bestAsk,
                    bestBidQty: data.bestBidQty,
                    bestAskQty: data.bestAskQty,
                }
            }
            catch (err) {
                this.handlers?.logHandler?.log?.error("[BINANCE] futuresBookTickerStream error. err: ", err);
            }
        });

        this.binance?.futuresAggTradeStream(newCoinPairs, (data: any)=> {
            try {
                if (!this.coinInfos) {
                    return;
                }
                const aggregateTrade: IBinanceAggTrade = {
                    coinPair: data.symbol,
                    timestamp: data.timestamp,
                    receivedAt: Date.now(),
                    isMaker: data.maker,
                    price: data.price,
                    amount: data.amount,
                }
                this.coinInfos[data.symbol].price = parseFloat(aggregateTrade.price);
                if (this.listener) {
                    this.listener(_.cloneDeep(this.coinInfos[data.symbol]));
                }
            }
            catch (err) {
                this.handlers?.logHandler?.log?.error("[BINANCE] futuresAggTradeStream error. err: ", err);
                if (this.listener) {
                    this.listener(null);
                }
            }
        });

        if (this.apiKey) {
            try {
                // userFutureData(margin_call_callback: _callback, account_update_callback: _callback, order_update_callback: _callback, subscribed_callback: _callback): any;
                this.binance?.websockets.userFutureData(
                    (data: any)=>{
                        this.handlers?.logHandler?.log?.info("[BINANCE] margin_call_callback")
                        // this.handlers?.logHandler?.log?.debug("margin_call_callback. data: ", JSON.stringify(data).toString());
                        this.fetchBalance();
                    },
                    (data: any)=>{
                        this.handlers?.logHandler?.log?.info("[BINANCE] account_update_callback")
                        // this.handlers?.logHandler?.log?.debug("account_update_callback. data: ", JSON.stringify(data).toString());
                        this.fetchBalance();
                    }, 
                    (data: any)=>{
                        this.handlers?.logHandler?.log?.info("[BINANCE] order_update_callback")
                        // this.handlers?.logHandler?.log?.debug("order_update_callback. data: ", JSON.stringify(data).toString());
                        this.fetchBalance();
                    }, 
                    (data: any)=>{
                        this.handlers?.logHandler?.log?.info("[BINANCE] subscribed_callback")
                        // this.handlers?.logHandler?.log?.debug("subscribed_callback. data: ", JSON.stringify(data).toString());
                    }, 
                );
            } catch (err: any) {
                this.handlers?.logHandler?.log?.error("[BINANCE] userFutureData. err: ", err);
            }
        }
    }
}