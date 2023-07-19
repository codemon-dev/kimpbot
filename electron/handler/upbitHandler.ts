import _ from 'lodash';
import ReconnectingWebSocket from 'reconnecting-websocket';
import WS from "ws"
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import crypto from 'crypto';
import querystring from "querystring";
import request from 'request';

import Handlers from "./Handlers";
import { ACCOUNT_INFO, CoinInfo, CoinInfos, PriceQty } from "../../interface/IMarketInfo";
import { COIN_PAIR, COIN_SYMBOL, CURRENCY_TYPE, EXCHANGE, EXCHANGE_TYPE, FETCH_METHOD, ORDER_BID_ASK, UPBIT_ENDPOINT, UPBIT_ORDER_TYPE } from "../../constants/enum";
import { IUpbitAccount, IUpbitOrderResponse, IUpbitOrdersResponse, UpbitChanceResponse, UpbitSocketPayload, UpbitSocketSimpleResponse } from "../../interface/IUpbit";

import { IPC_CMD } from "../../constants/ipcCmd";
import { ExchangeHandlerConfig, IExchangeCoinInfo } from './exchangeHandler';
import { getSymbolFromCoinPair } from '../../util/tradeUtil';
import { resolve } from '../../webpack/main.webpack';
import { FEE_TYPE, ORDER_TYPE, IOrderInfo, ITradeInfo } from '../../interface/ITradeInfo';
import { FETCH_BALANCE_INTERVAL } from '../../constants/constants';

const UPBI_WS_ADDR = "wss://api.upbit.com/websocket/v1"
    
    
interface UPBIT_PONG_RESPONSE {
    status: string;
}

export default class UpbitHandler {
    private handlers: Handlers | undefined;
    private UUID = crypto.randomUUID()
    private tickerWS: ReconnectingWebSocket | undefined;
    private tradeWS: ReconnectingWebSocket | undefined;
    private orderBookWS: ReconnectingWebSocket | undefined;
    private apiKey: string | undefined;
    private secretKey: string | undefined;
    
    private exchnageCoinInfos: Map<COIN_PAIR, IExchangeCoinInfo>;
    private ticket: string;
    private coinPairs: COIN_PAIR[] = [];
    private accountInfo: ACCOUNT_INFO;

    private balanceInterval: any = null;

    private options = {
        WebSocket: WS,
        maxReconnectionDelay: 10000,
        minReconnectionDelay: 1000 + Math.random() * 4000,
        reconnectionDelayGrowFactor: 1.3,
        minUptime: 5000,
        connectionTimeout: 4000,
        maxRetries: Infinity,
        maxEnqueuedMessages: Infinity,
        startClosed: false,
        debug: false,
    };

    public coinInfos: CoinInfos = {};
    private listener: any = null;
    constructor(handlers: Handlers, ticket?: string) {
        handlers.logHandler?.log?.info(`create UpbitHandler`)
        this.handlers = handlers
        this.exchnageCoinInfos = new Map<COIN_PAIR, IExchangeCoinInfo>();
        this.ticket = this.UUID + (ticket? `-${ticket}`: "");
        this.accountInfo = {
            coinPair: COIN_PAIR.NONE,
            qty: 0,
            initialMargin: 0,
            avaliableBalance: 0,
            currencyType: CURRENCY_TYPE.USDT,
            pnl: 0,
            price: 0,
            leverage: 1,
            isolated: false,
        }

        // type Options = {
        //     WebSocket?: any; // WebSocket constructor, if none provided, defaults to global WebSocket
        //     maxReconnectionDelay?: number; // max delay in ms between reconnections
        //     minReconnectionDelay?: number; // min delay in ms between reconnections
        //     reconnectionDelayGrowFactor?: number; // how fast the reconnection delay grows
        //     minUptime?: number; // min time in ms to consider connection as stable
        //     connectionTimeout?: number; // retry connect if not connected after this time, in ms
        //     maxRetries?: number; // maximum number of retries
        //     maxEnqueuedMessages?: number; // maximum number of messages to buffer until reconnection
        //     startClosed?: boolean; // start websocket in CLOSED state, call `.reconnect()` to connect
        //     debug?: boolean; // enables debug output
        // };
    }

    public addListener = (listener: any) => {
        this.listener = listener;
    }
    
    public removeListener = () => {
        this.listener = null;
    }
    
    public dispose = () => {
        this.handlers?.logHandler?.log?.info("dispose UpbitHandler");
        if (this.balanceInterval) {
            clearInterval(this.balanceInterval);
            this.balanceInterval = null;
        }
        this.removeListener();
        this.tickerWS?.close();
        this.tradeWS?.close();
        this.orderBookWS?.close();
        delete this.tickerWS;
        delete this.tradeWS;
        delete this.orderBookWS;
    }

    private urlProvider = async () => {
        return UPBI_WS_ADDR;
    };

    public setAPIKey(apiKey: string, secretKey: string) {    
        this.handlers?.logHandler?.log?.info(`[UPBIT] setAPIKey. apiKey: ${apiKey}, secretKey: ${secretKey}`);
        this.apiKey = apiKey;
        this.secretKey = secretKey;
    }

    public initialize = async (config: ExchangeHandlerConfig) => {
        this.coinPairs = [...config.coinPairs];
        this.coinPairs.forEach((coinPair: COIN_PAIR) => {
            this.coinInfos[coinPair] = {
                coinPair, symbol: getSymbolFromCoinPair(coinPair), exchange: EXCHANGE.UPBIT,  exchangeType: EXCHANGE_TYPE.DOMESTIC,  
                price: -1, sellPrice: -1, sellQty: -1, buyPrice: -1, buyQty: -1, accountInfo: this.accountInfo, orderBook: {bid: [], ask: [], timestamp: 0}
            }
        })
        this.handlers?.logHandler?.log?.info("[UPBIT] config: ", config)
        this.setAPIKey(config.apiKey, config.secretKey);
        return true;
    }

    public checkFakeTrade = async (order: ORDER_BID_ASK, volume: number, price: number) => {
        return new Promise(async (resolve) => {
            const orderRet: any = await this.order(this.coinPairs[0], order, UPBIT_ORDER_TYPE.LIMIT, volume, price);
            if (!orderRet || !(orderRet as IUpbitOrdersResponse)?.uuid) {
            //if (!orderRet || !(orderRet as IUpbitOrdersResponse)?.uuid || (orderRet as IUpbitOrdersResponse)?.state !== "wait") {
                this.handlers?.logHandler?.log?.error("[UPBIT] fail checkFakeTrade. orderRet: ", orderRet);
                resolve(false);
            }
            const cancleOrderRet = await this.CancleOrder((orderRet as IUpbitOrdersResponse)?.uuid)
            if (!cancleOrderRet) {
                this.handlers?.logHandler?.log?.error("[UPBIT] fail checkFakeTrade CancleOrder. orderRet: ", orderRet);
                resolve(false);
            }
            resolve(true);
        })
    }

    public orderMarketBuy = (volume: number, price: number, jobWorkerId?: string) => {
        let orderInfos: IOrderInfo[] = []
        return new Promise(async (resolve) => {
            this.handlers?.logHandler?.log?.info(`[UPBIT][ORDER][MARKET_BUY] volume: ${volume}, price: ${price}`);
            let orderRet: any;            
            if (volume > 0) {
                orderRet = await this.order(this.coinPairs[0], ORDER_BID_ASK.BID, UPBIT_ORDER_TYPE.LIMIT, volume, price);
            } else {
                orderRet = await this.order(this.coinPairs[0], ORDER_BID_ASK.BID, UPBIT_ORDER_TYPE.MARKET_BUY, -1, price);
            }
            const orderTimestamp = Date.now();
            
            if (!orderRet) {
                resolve(null);
            }
            let cnt = 50;
            const interval = setInterval(async () => {
                let response: any = await this.fetchOrder(orderRet.uuid)
                const orderRes: IUpbitOrderResponse = response;
                if (orderRes.state === "cancel" || orderRes.state === "done") {
                    clearInterval(interval);
                    let qty = 0.0;
                    let funds = 0.0;
                    if (orderRes.trades_count > 0 && orderRes.trades.length === orderRes.trades_count) {                        
                        orderRes.trades.forEach(trade => {
                            let orderInfo: IOrderInfo = {
                                price: parseFloat(trade.price),
                                qty: parseFloat(trade.volume),
                                timestamp: orderTimestamp,
                            }
                            orderInfos.push(orderInfo);
                            funds += parseFloat(trade.funds);
                            qty += parseFloat(trade.volume);
                        });
                    }
                    const accountInfo = await this.fetchBalance();
                    let tradeInfo: ITradeInfo = {
                        jobWrokerId: jobWorkerId ?? "",
                        exchange: EXCHANGE.UPBIT,
                        orderId: orderRet.uuid,                        
                        type: ORDER_TYPE.BUY,
                        avgPrice: funds / qty,
                        totalVolume: funds,
                        totalQty: qty,
                        totalFee: parseFloat(orderRes.paid_fee),
                        orderInfos: [...orderInfos],
                        remainedBalance: accountInfo?.avaliableBalance ?? 0,
                        createdAt: orderTimestamp,
                        updatedAt: orderTimestamp,
                    }
                    resolve(tradeInfo);
                }
                cnt--;
                if (cnt < 0) {
                    clearInterval(interval);
                    resolve(null);
                }
            }, 200)
        })
    }

    public orderMarketSell = async (volume: number, jobWorkerId?: string) => {
        let orderInfos: IOrderInfo[] = []
        return new Promise(async (resolve) => {
            let orderRet: any;            
            orderRet = await this.order(this.coinPairs[0], ORDER_BID_ASK.ASK, UPBIT_ORDER_TYPE.MARKET_SELL, volume, -1);
            const orderTimestamp = Date.now();
            this.handlers?.logHandler?.log?.info(`[UPBIT][ORDER][MARKET_SELL] volume: ${volume}, ret: `, orderRet);
            if (!orderRet) {
                resolve(null);
            }
            let cnt = 50;
            const interval = setInterval(async () => {
                let response: any = await this.fetchOrder(orderRet.uuid)
                const orderRes: IUpbitOrderResponse = response;
                if (orderRes.state === "cancel" || orderRes.state === "done") {
                    clearInterval(interval);
                    let qty = 0.0;
                    let funds = 0.0;
                    if (orderRes.trades_count > 0 && orderRes.trades.length === orderRes.trades_count) {                        
                        orderRes.trades.forEach(trade => {
                            let orderInfo: IOrderInfo = {
                                price: parseFloat(trade.price),
                                qty: parseFloat(trade.volume),
                                timestamp: orderTimestamp,
                            }
                            orderInfos.push(orderInfo);
                            funds += parseFloat(trade.funds);
                            qty += parseFloat(trade.volume);
                        });
                    }
                    const accountInfo = await this.fetchBalance();
                    let tradeInfo: ITradeInfo = {
                        jobWrokerId: jobWorkerId ?? "",
                        exchange: EXCHANGE.UPBIT,
                        orderId: orderRet.uuid,                        
                        type: ORDER_TYPE.SELL,
                        avgPrice: funds / qty,
                        totalVolume: funds,
                        totalQty: qty,
                        totalFee: parseFloat(orderRes.paid_fee),
                        orderInfos: {...orderInfos},
                        remainedBalance: accountInfo?.avaliableBalance ?? 0,
                        createdAt: orderTimestamp,
                        updatedAt: orderTimestamp,
                    }
                    resolve(tradeInfo);
                }
                cnt--;
                if (cnt < 0) {
                    clearInterval(interval);
                    resolve(null);
                }
            }, 200)
        })
    }

    public order = async (coinPair: COIN_PAIR, order: ORDER_BID_ASK, orderType: UPBIT_ORDER_TYPE, volume: number, price: number, ) => {
        try {
            if (!this.apiKey || !this.secretKey) {
                return;
            }
            let body: any = {
                market: coinPair,
                side: order,
                ord_type: orderType,
            }
            if (orderType === UPBIT_ORDER_TYPE.LIMIT || orderType === UPBIT_ORDER_TYPE.MARKET_SELL) {
                if (volume <= 0) {
                    return;
                }
                body = {...body, volume: volume.toString()}
            }
            if (orderType === UPBIT_ORDER_TYPE.LIMIT || orderType === UPBIT_ORDER_TYPE.MARKET_BUY) {
                if (price <= 0) {
                    return;
                }
                body = {...body, price: price.toString()}
            }
            // this.handlers?.logHandler?.log?.debug("body: ", body)
            const response: any = await this.fetchUpbitApi(FETCH_METHOD.POST, UPBIT_ENDPOINT.ORDERS, body);
            if (!response) {
                return;
            }
            this.handlers?.logHandler?.log?.info("[UPBIT] order response: ", response);
            return response
        } catch (err) {
            this.handlers?.logHandler?.log?.error("[UPBIT] fail buy coin. err: ", err);
        }
        return;
    }

    public fetchOrder = async (uuid: string) => {
        try {
            if (!this.apiKey || !this.secretKey) {
                return;
            }
            let body: any = { uuid };
            const response: any = await this.fetchUpbitApi(FETCH_METHOD.GET, UPBIT_ENDPOINT.ORDER, body);
            if (!response) {
                return;
            }
            this.handlers?.logHandler?.log?.info("[UPBIT] fetchOrder response: ", response);
            return response
        } catch (err) {
            this.handlers?.logHandler?.log?.error("[UPBIT] fail fetchOrder. err: ", err);
        }
        return null;
    }

    public CancleOrder = async (uuid: string) => {
        try {
            if (!this.apiKey || !this.secretKey) {
                return;
            }
            let body: any = { uuid };
            const response:any = await this.fetchUpbitApi(FETCH_METHOD.DELETE, UPBIT_ENDPOINT.ORDER, body);
            if (!response) {
                return;
            }
            this.handlers?.logHandler?.log?.info("[UPBIT] CancleOrder response: ", response);
            return response
        } catch (err) {
            this.handlers?.logHandler?.log?.error("[UPBIT] fail CancleOrder. err: ", err);
        }
        return;
    }

    public fetchBalance = async (symbols: COIN_SYMBOL[] = [COIN_SYMBOL.KRW]): Promise<any> => {        
        try {
            if (!this.apiKey || !this.secretKey) {
                this.handlers?.logHandler?.log?.error(`[UPBIT] skip fetchBalance. apiKey: ${this.apiKey}, secretKey: ${this.secretKey}`)
                return;
            }
            
            const upbitAccounts: any = await this.fetchUpbitAccounts();
            if (!upbitAccounts || upbitAccounts.length === 0) {
                this.handlers?.logHandler?.log?.error(`[UPBIT] fail fetchUpbitAccounts. upbitAccounts: ${upbitAccounts}`)
                return;
            }
            let coinAccount: IUpbitAccount | undefined;
            let currencyAccount: IUpbitAccount | undefined;
            
            for (const account of JSON.parse(upbitAccounts)) {  
                if (account.unit_currency !== COIN_SYMBOL.KRW) {
                    continue;
                }
                if (account.currency === COIN_SYMBOL.KRW) {
                    currencyAccount =  {
                        currency: account.currency,
                        balance: parseFloat(account.balance),
                        locked: parseFloat(account.locked),
                        avg_buy_price: parseFloat(account.avg_buy_price),
                        avg_buy_price_modified: account.avg_buy_price_modified,
                        unit_currency: account.unit_currency
                    }
                } else if (this.coinPairs[0]?.split("-")[0] === "KRW" && this.coinPairs[0]?.split("-")[1] === account.currency) {
                    coinAccount =  {
                        currency: account.currency,
                        balance: parseFloat(account.balance),
                        locked: parseFloat(account.locked),
                        avg_buy_price: parseFloat(account.avg_buy_price),
                        avg_buy_price_modified: account.avg_buy_price_modified,
                        unit_currency: account.unit_currency
                    };
                }
                if (currencyAccount && coinAccount) {
                    break;
                }
            }

            // this.handlers?.logHandler?.log?.debug("coinAccount: ", coinAccount);
            // this.handlers?.logHandler?.log?.debug("currencyAccount: ", currencyAccount);

            let bal = currencyAccount?.balance ?? 0;
            let lockedBal = currencyAccount?.locked ?? 0;
            let avaliableBalance = bal;
            let pnl = (!this.coinInfos[this.coinPairs[0]] || this.coinInfos[this.coinPairs[0]]?.price === 0) ? 0 :((this.coinInfos[this.coinPairs[0]].price) - (coinAccount?.avg_buy_price ?? 0)) * (coinAccount?.balance ?? 0);
            this.accountInfo = {
                coinPair: this.coinPairs[0],
                initialMargin: 0,
                qty: coinAccount?.balance ?? 0,
                avaliableBalance: avaliableBalance,
                currencyType: CURRENCY_TYPE.KRW,
                pnl: (pnl <= 0) ? 0: pnl,
                price: coinAccount?.avg_buy_price ?? 0,
                leverage: 0,
                isolated: false,
            }
            // this.handlers?.logHandler?.log?.debug("accountInfo: ", this.accountInfo)
            if (this.coinPairs?.length > 0) {
                this.coinInfos[this.coinPairs[0]].accountInfo = {...this.accountInfo}
            }
        } catch (err: any) {
            this.handlers?.logHandler?.log?.error("[UPBIT] fetchBalance error: ", err);
            this.accountInfo = {
                coinPair: COIN_PAIR.NONE,
                qty: 0,
                initialMargin: 0,
                avaliableBalance: 0,
                currencyType: CURRENCY_TYPE.KRW,
                pnl: 0,
                price: 0,
                leverage: 0,
                isolated: false,
            }
            if (this.coinPairs?.length > 0) {
                this.coinInfos[this.coinPairs[0]].accountInfo = {...this.accountInfo}
            }
        } finally {
            // this.handlers?.logHandler?.log?.debug("[UPBIT] this.accountInfo: ", this.accountInfo)
            return this.accountInfo;
        }
    }

    
    public getExchangeCoinInfos = async (coinPairs: COIN_PAIR[]) => {        
        try {
            const chanceResponses: UpbitChanceResponse[] = await this.fetchUpbitchanceInfos(coinPairs);        
            chanceResponses.forEach((res: any) => {
                if (res) {
                    let exchangeCoinInfo: IExchangeCoinInfo = {
                        coinPair: res.market.id,
                        status: res.market.state === "active"? true: false,
                        liquidationFee: 0,
                        takerFee: parseFloat(res.maker_ask_fee),
                        makerFee: parseFloat(res.maker_ask_fee),
                        minPrice: 0,
                        maxPrice: parseFloat(res.market.max_total),
                        tickSize: 0,
                        stepSize: 0,
                        minQty: 0,
                        maxQty: 0,
                        minNotional: parseFloat(res.market.bid.min_total),
                    }
                    this.handlers?.logHandler?.log?.info(exchangeCoinInfo);
                    this.exchnageCoinInfos.set(exchangeCoinInfo.coinPair, exchangeCoinInfo);
                }
            });
        } catch (err) {
            this.handlers?.logHandler?.log?.error("[UPBIT] getExchangeCoinInfos error: ", err);
            this.exchnageCoinInfos.clear();
        }
        return this.exchnageCoinInfos
    }

    public startHandler = async (coinPairs: COIN_PAIR[]) => {
        this.handlers?.logHandler?.log?.info("[UPBIT] startHandler. coinPairs: ", coinPairs);
        this.coinPairs = [...coinPairs];
        // await this.getExchangeCoinInfos(coinPairs);
        if (this.coinPairs.length === 0) {
            return;
        }
        let newCoinPairs: string[] = []
        this.coinPairs.forEach((coinPair: COIN_PAIR) => {
            newCoinPairs.push(coinPair.toString());
        })

        newCoinPairs.forEach((coinPair: any) => {
            this.coinInfos[coinPair] = {
                coinPair, symbol: getSymbolFromCoinPair(coinPair), exchange: EXCHANGE.UPBIT,  exchangeType: EXCHANGE_TYPE.DOMESTIC,  
                price: -1, sellPrice: -1, sellQty: -1, buyPrice: -1, buyQty: -1, accountInfo: this.accountInfo, orderBook: {bid: [], ask: [], timestamp: 0}
            }
        })
        if (this.apiKey && this.secretKey) {
            await this.fetchBalance();
            this.handlers?.logHandler?.log?.info(`[UPBIT] first fetched balance. accountInfo: `, this.accountInfo)
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
        
        if (this.listener) {
            this.listener(null);
        }

        // this.startTikerWebsocket(coinPairs);
        this.startTradeWebsocket(this.coinPairs);
        this.startOrderBookWebsocket(this.coinPairs);
        setInterval(() => {
            try {
                this.tickerWS?.send("PING");
                this.tradeWS?.send("PING");
                this.orderBookWS?.send("PING")
            } catch (err: any) {
                this.handlers?.logHandler?.log?.error("[UPBIT] Ping error. err: ", err);
            }
        }, 60000);
    }

    private fetchUpbitAccounts = async () => {
        return await this.fetchUpbitApi(FETCH_METHOD.GET, UPBIT_ENDPOINT.ACCOUNTS);
    }

    private fetchUpbitchanceInfos = async (coinPairs: COIN_PAIR[]) => {
        let promises: any = []
        coinPairs.forEach((coinPair: any) => {
            promises.push(this.fetchUpbitApi(FETCH_METHOD.GET, UPBIT_ENDPOINT.CHANCE, {market: coinPair}))
        })
        return await Promise.all(promises);
    }

    private fetchUpbitApi = (method: FETCH_METHOD, endpoint: string, body?: any) => {
        // this.handlers?.logHandler?.log?.debug("fetchUpbitApi. endpoint: ", endpoint);
        let query = body? querystring.encode(body): null
        let authorizationToken = body? this.getAuthorizationToken(query): this.getAuthorizationToken();
        if (!authorizationToken) {
            this.handlers?.logHandler?.log?.error("[UPBIT] fail to get getAuthorizationToken. skip to fetchUpbitApi")
            return null;
        }
        let options = {
            method: method,
            url: query? `${endpoint}?${query}`: endpoint,
            headers: {Authorization: authorizationToken},
        }
        if (body) {
            options = {...options, ...{json: body}}
        }
        // this.handlers?.logHandler?.log?.debug("fetchUpbitApi options: ", options)
        return new Promise((resolve: any, reject: any) => {            
            try {
                request(options, (error: any, response: any, body: any) => {
                    if (error) { 
                        this.handlers?.logHandler?.log?.error("[UPBIT] fetchUpbitApi endpoint: ", endpoint);
                        this.handlers?.logHandler?.log?.error("[UPBIT] fetchUpbitApi error: ", error);
                        resolve(null) 
                    }
                    // this.handlers?.logHandler?.log?.debug("response: ", response)
                    // this.handlers?.logHandler?.log?.debug("body: ", body);
                    try {
                        if (body?.error) {
                            this.handlers?.logHandler?.log?.error("[UPBIT] [error return] fetchUpbitApi endpoint: ", endpoint);
                            this.handlers?.logHandler?.log?.error("[UPBIT] [error return] fetchBalance error message: ", body?.error?.message)
                            this.handlers?.logHandler?.log?.error("[UPBIT] [error return] fetchBalance error name: ", body?.error?.name)
                            resolve(null);
                        }
                        const jsonData = JSON.parse(body)?.error;
                        if (jsonData) {
                            this.handlers?.logHandler?.log?.error("[UPBIT] [error return] fetchUpbitApi endpoint: ", endpoint);
                            this.handlers?.logHandler?.log?.error("[UPBIT] [error return] fetchBalance error message: ", jsonData.error?.message)
                            this.handlers?.logHandler?.log?.error("[UPBIT] [error return] fetchBalance error name: ", jsonData.error?.name)
                            resolve(null);
                        }
                    } catch (err) {
                        // 오류 아님. 위에서 parsing하는건 error json 파싱위해 하는것임.
                    }
                    resolve(body)
                })
            } catch (err: any) {
                this.handlers?.logHandler?.log?.error("[UPBIT] fetchUpbitApi err: ", err);
                resolve(null);
            }
        })
    }

    private getAuthorizationToken = (query?: any) => {
        if (!this.apiKey || !this.secretKey) {
            this.handlers?.logHandler?.log?.error("[UPBIT] apikey is empty. skip getTokern.")
            return null;
        }
        let payload = {
            access_key: this.apiKey,
            nonce: uuidv4(),
        };

        if (query) {
            const hash = crypto.createHash('sha512');
            const queryHash = hash.update(query, 'utf-8').digest('hex');
            payload = {...payload, ...{query_hash: queryHash, query_hash_alg: 'SHA512'}}
        }
        const jwtToken = jwt.sign(payload, this.secretKey);
        const authorizationToken = `Bearer ${jwtToken}`;
        return authorizationToken;
    }

    private startTikerWebsocket = (coinPairs: string[]) => {
        const format = 'SIMPLE';
        let payload: UpbitSocketPayload = {
            type: 'ticker',
            codes: coinPairs, // ["KRW-BTC", "KRW-ETH"],
            isOnlySnapshot: false,
            isOnlyRealtime: false,
        }
        this.tickerWS?.close();
        this.tickerWS = new ReconnectingWebSocket(this.urlProvider, [], this.options);
        // this.tickerWS.send(`${JSON.stringify([{ ticket: this.ticket }, { ...payload }, { format }])}`)
        this.tickerWS.addEventListener('message', (payload) => {
            const response: UpbitSocketSimpleResponse | UPBIT_PONG_RESPONSE = {...(JSON.parse(payload.data.toString('utf-8')))};
            if (this.isPongResponse(response) === true) {
                //this.handlers?.logHandler?.log?.debug("pong. ", response);
            } else {
                const res: UpbitSocketSimpleResponse = {...response as UpbitSocketSimpleResponse};
            }
        })
        this.tickerWS.onopen = (event) => {
            this.tickerWS?.send(`${JSON.stringify([{ ticket: this.ticket }, { ...payload }, { format }])}`)
            this.handlers?.ipcHandler?.sendMessage(IPC_CMD.DEBUG_MSG, `[UPBIT][${Date.now().toLocaleString()}] this.tickerWS.onopen! $${JSON.stringify([{ ticket: this.ticket }, { ...payload }, { format }])}`);
        };
        this.tickerWS.onerror = (event) => {
            this.handlers?.ipcHandler?.sendMessage(IPC_CMD.DEBUG_MSG, `[UPBIT][${Date.now().toLocaleString()}] this.tickerWS.onerror! ${JSON.stringify(event)}`);
        };
        this.tickerWS.onclose = (event) => {
            this.handlers?.ipcHandler?.sendMessage(IPC_CMD.DEBUG_MSG, `[UPBIT][${Date.now().toLocaleString()}] this.tickerWS.onclose! ${JSON.stringify(event)}`);
        };
    }

    private startTradeWebsocket = (coinPairs: string[]) => {
        const format = 'SIMPLE'
        let payload: UpbitSocketPayload = {
            type: 'trade',
            codes: coinPairs, // ["KRW-BTC", "KRW-ETH"],
            isOnlySnapshot: false,
            isOnlyRealtime: false,
        }
        this.tradeWS?.close();
        this.tradeWS = new ReconnectingWebSocket(this.urlProvider, [], this.options);
        // this.tradeWS.send(`${JSON.stringify([{ ticket: this.ticket }, { ...payload }, { format }])}`)
        this.tradeWS.addEventListener('message', (payload) => {
            try {   
                const response: UpbitSocketSimpleResponse | UPBIT_PONG_RESPONSE = {...(JSON.parse(payload.data.toString('utf-8')))};
                if (this.isPongResponse(response) === true) {
                    //this.handlers?.logHandler?.log?.debug("pong. ", response);
                } else {
                    const res: UpbitSocketSimpleResponse = {...response as UpbitSocketSimpleResponse};
                    this.coinInfos[res.cd].price = res.tp;
                    if (this.listener) {
                        this.listener(_.cloneDeep(this.coinInfos[res.cd]))
                    }
                }
            } catch(err) {}
        })
        this.tradeWS.onopen = (event) => {
            try {
                this.tradeWS?.send(`${JSON.stringify([{ ticket: this.ticket }, { ...payload }, { format }])}`)
                this.handlers?.ipcHandler?.sendMessage(IPC_CMD.DEBUG_MSG, `[UPBIT][${Date.now().toLocaleString()}] this.tradeWS.onopen! $${JSON.stringify([{ ticket: this.ticket }, { ...payload }, { format }])}`);
                if (this.listener) {
                    this.listener(null);
                }
            } catch (err: any) {
                this.handlers?.logHandler?.log?.error("[UPBIT] tradeWS.onopen err: ", err)
            }
        };
        this.tradeWS.onerror = (event) => {
            try {
                this.handlers?.ipcHandler?.sendMessage(IPC_CMD.DEBUG_MSG, `[UPBIT][${Date.now().toLocaleString()}] this.tradeWS.onerror! ${JSON.stringify(event)}`);
                if (this.listener) {
                    this.listener(null);
                }    
            } catch (err: any) {
                this.handlers?.logHandler?.log?.error("[UPBIT] tradeWS.onerror err: ", err)
            }
            
        };
        this.tradeWS.onclose = (event) => {
            try {
                this.handlers?.ipcHandler?.sendMessage(IPC_CMD.DEBUG_MSG, `[UPBIT][${Date.now().toLocaleString()}] this.tradeWS.onclose! ${JSON.stringify(event)}`);
                if (this.listener) {
                    this.listener(null);
                }
            } catch (err: any) {
                this.handlers?.logHandler?.log?.error("[UPBIT] tradeWS.onclose err: ", err)
            }
        };
    }

    private startOrderBookWebsocket = (coinPairs: string[], numOfOderbook: number = 10) => {     
        const format = 'SIMPLE';
        if (coinPairs.length <= 0) {
            return;
        }
        let newCoinPairs: string[] = []
        coinPairs.forEach((coinPair: string) =>{
            newCoinPairs.push(`${coinPair}.${numOfOderbook}`)
        });
        let payload: UpbitSocketPayload = {
            type: 'orderbook',
            codes: newCoinPairs, // ["KRW-BTC", "KRW-ETH"],
            isOnlySnapshot: false,
            isOnlyRealtime: false,
        }
        this.orderBookWS?.close();
        this.orderBookWS = new ReconnectingWebSocket(this.urlProvider, [], this.options);
        // this.orderBookWS.send(`${JSON.stringify([{ ticket: this.ticket }, { ...payload }, { format }])}`)
        this.orderBookWS.addEventListener('message', (payload) => {
            try {
                const response: UpbitSocketSimpleResponse | UPBIT_PONG_RESPONSE = {...(JSON.parse(payload.data.toString('utf-8')))};
                if (this.isPongResponse(response) === true) {
                    //this.handlers?.logHandler?.log?.debug("pong. ", response);
                } else {
                    const res: UpbitSocketSimpleResponse = {...response as UpbitSocketSimpleResponse};
                    if (res.obu.length > 0) {
                        this.coinInfos[res.cd].orderBook.timestamp = res.tms;
                        if (res.obu?.length > 0) {
                            const ask: PriceQty[] = [];
                            const bid: PriceQty[] = [];
                            res.obu?.forEach((item: any) => {
                                ask.push({price: item.ap, qty: item.as});
                                bid.push({price: item.bp, qty: item.bs});
                                
                            });
                            this.coinInfos[res.cd].orderBook.ask = ask;
                            this.coinInfos[res.cd].orderBook.bid = bid;
                        }

                        this.coinInfos[res.cd].sellPrice = res.obu[0].ap;
                        this.coinInfos[res.cd].sellQty = res.obu[0].as;
                        this.coinInfos[res.cd].buyPrice = res.obu[0].bp;
                        this.coinInfos[res.cd].buyQty = res.obu[0].bs;
                        if (this.listener) {
                            this.listener(_.cloneDeep(this.coinInfos[res.cd]))
                        }
                    }
                }
            } catch (err: any) {
                this.handlers?.logHandler?.log?.error("[UPBIT] erderBookWs err: ", err);
                this.handlers?.logHandler?.log?.error("[UPBIT] erderBookWs payload: ", payload);
            }
        })
        this.orderBookWS.onopen = (event) => {
            try {
                this.orderBookWS?.send(`${JSON.stringify([{ ticket: this.ticket }, { ...payload }, { format }])}`)
                this.handlers?.ipcHandler?.sendMessage(IPC_CMD.DEBUG_MSG, `[UPBIT][${Date.now()}] this.orderBookWS.onopen! $${JSON.stringify([{ ticket: this.ticket }, { ...payload }, { format }])}`);
                if (this.listener) {
                    this.listener(null);
                }
            } catch (err) {
                this.handlers?.logHandler?.log?.error("[UPBIT] orderBookWS.onopen er:", err)
            }
        };
        this.orderBookWS.onerror = (event) => {
            try {
                this.handlers?.ipcHandler?.sendMessage(IPC_CMD.DEBUG_MSG, `[UPBIT][${Date.now()}] this.orderBookWS.onerror! ${JSON.stringify(event)}`);
                if (this.listener) {
                    this.listener(null);
                }
            } catch (err) {
                this.handlers?.logHandler?.log?.error("[UPBIT] orderBookWS.onerror er:", err)
            }
        };
        this.orderBookWS.onclose = (event) => {
            try {
                this.handlers?.ipcHandler?.sendMessage(IPC_CMD.DEBUG_MSG, `[UPBIT][${Date.now()}] this.orderBookWS.onclose! ${JSON.stringify(event)}`);
                if (this.listener) {
                    this.listener(null);
                }
            } catch (err) {
                this.handlers?.logHandler?.log?.error("[UPBIT] orderBookWS.onclose er:", err)
            }
        };
    }    
    private isPongResponse(object: any): object is UPBIT_PONG_RESPONSE {
        return 'status' in object;
    }
}