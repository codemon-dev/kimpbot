import _ from 'lodash';
import { ACCOUNT_INFO, CoinInfo, IAssetInfo } from "../../interface/IMarketInfo";
import { COMPLETE_TYPE, IJobWorker, IJobWorkerInfo, ITradeInfo, ITradeJobInfo } from "../../interface/ITradeInfo";
import Handlers from "../handler/Handlers";
import ExchangeHandler, { ExchangeHandlerConfig, IExchangeCoinInfo } from "../handler/exchangeHandler";
import { ICurrencyInfo } from '../../interface/ICurrency';
import { COIN_PAIR, COIN_SYMBOL, CURRENCY_TYPE, EXCHANGE, ORDER_BID_ASK } from '../../constants/enum';
import { calculatePrimium, calculateTether, convertExchangeOrederPrice, getAvgPriceFromOrderBook, getAvgPriceFromOrderBookByQty, getCurrencyTypeFromExchange, roundUpToDecimalPlaces, wrapNumber } from '../../util/tradeUtil';
import { PRICE_BUFFER_RATE } from '../../constants/constants';
import { AsyncLock } from '../../util/asyncLock';

interface ISubProcessRet {
    isSuccess: boolean,
    tradeInfo_1: ITradeInfo | null,
    tradeInfo_2: ITradeInfo | null,
    tradeInfo_cancel?: ITradeInfo | null,
}

interface IMinTradingInfo {
    minNotation: number,
    minQty: number,
    minAmount: number,
}

export default class TradeJobWorker {
    private isProcessWorking: boolean = false;
    private handlers: Handlers;
    private jobWorkerInfo: IJobWorker;

    private notifyJobWokerInfoCallback: any;
    
    private exchange1Handler: ExchangeHandler | undefined;
    private exchange2Handler: ExchangeHandler | undefined;

    private exchangeCoinInfo1: IExchangeCoinInfo | undefined;
    private exchangeCoinInfo2: IExchangeCoinInfo | undefined;

    private coinInfo1: CoinInfo | undefined | null;
    private coinInfo2: CoinInfo | undefined | null;

    private currencyInfo: ICurrencyInfo | undefined | null;
    private assetInfo: IAssetInfo;

    private isDisposed: boolean = true;
    private lock = new AsyncLock();
    private lock_processJobWoker = new AsyncLock();
    private isDone = false;

    private enterCnt = 0;
    private exitCnt = 0;
    private isOnlyOneTimeJob = false;
    private oneTimeJobCompleted = false;

    private stopJobWorkerCallback: any = null;

    constructor(handlers: Handlers, jobWorkerInfo: IJobWorker, notifyJobWokerInfoCallback: any, stopJobWorkerCallback: any) {
        handlers.logHandler?.log?.info("crate TradeJobWorker.")
        this.handlers = handlers;
        this.jobWorkerInfo = jobWorkerInfo;
        this.notifyJobWokerInfoCallback = notifyJobWokerInfoCallback;
        this.stopJobWorkerCallback = stopJobWorkerCallback;
        this.assetInfo = {
            jobWorkerId: jobWorkerInfo._id ?? "",
            currencyPrice: 0,
            symbol: jobWorkerInfo.symbol_1,            
            currencyType_1: getCurrencyTypeFromExchange(jobWorkerInfo.exchangeAccountInfo_1?.exchange ?? EXCHANGE.UPBIT),
            currencyType_2: getCurrencyTypeFromExchange(jobWorkerInfo.exchangeAccountInfo_2?.exchange ?? EXCHANGE.BINANCE),
            balance_1: 0,
            balance_2: 0,
            coinQty_1: 0,    
            coinQty_2: 0,    
            price_1: 0,
            price_2: 0,
            pnl_1: 0,
            pnl_2: 0,
            margin_1: 0,
            margin_2: 0,
        }
        this.isOnlyOneTimeJob = jobWorkerInfo.exitTargetPrimium <= jobWorkerInfo.enterTargetPrimium ? true: false;
        const interval = setInterval(() => {
            if (this.isDisposed === true) {
                this.handlers?.logHandler?.log?.info("[WATHDOG][TRADEJOB_WORKER] Job disposed. turn off watchdog. id: ", this.jobWorkerInfo._id);
                clearInterval(interval);
            }
            this.handlers?.logHandler?.log?.info("[WATHDOG][TRADEJOB_WORKER] I'm still alive. id: ", this.jobWorkerInfo._id);
        }, 60000)
    }

    public initialize = async () => {
        if (!this.jobWorkerInfo._id) {
            this.handlers?.logHandler?.log?.error("jobWorkerInfo._id should not be null");
            return;
        }
        this.handlers?.logHandler?.log?.info("[tradeJobWorker][initialize] jobWorkerInfo: ", this.jobWorkerInfo);
        this.initAllData();
        if (this.jobWorkerInfo.exchangeAccountInfo_1) {
            const exchange = this.jobWorkerInfo.exchangeAccountInfo_1;
            const config: ExchangeHandlerConfig = {
                exchange: exchange.exchange,
                coinPairs: [this.jobWorkerInfo.coinPair_1],
                symbols: [this.jobWorkerInfo.symbol_1],
                apiKey: exchange.apiKey,
                secretKey: exchange.secretKey,
                jobId: this.jobWorkerInfo._id,
                listener: this.listener_1,
                leverage: this.jobWorkerInfo.config.leverage,
            }
            this.exchange1Handler = new ExchangeHandler(this.handlers, config)
            this.exchange1Handler
        }
        if (this.jobWorkerInfo.exchangeAccountInfo_2) {
            const exchange = this.jobWorkerInfo.exchangeAccountInfo_2;
            const config: ExchangeHandlerConfig = {
                exchange: exchange.exchange,
                coinPairs: [this.jobWorkerInfo.coinPair_2],
                symbols: [this.jobWorkerInfo.symbol_2],
                apiKey: exchange.apiKey,
                secretKey: exchange.secretKey,
                jobId: this.jobWorkerInfo._id,
                listener: this.listener_2,
                leverage: this.jobWorkerInfo.config.leverage,
            }
            this.exchange2Handler = new ExchangeHandler(this.handlers, config)
        }
    }

    public getAssetInfo = () => {
        return this.assetInfo;
    }

    private getEnteredBalance = () => {
        let enteredBalance = 0;
        if (!this.jobWorkerInfo.tradeJobInfos || this.jobWorkerInfo.tradeJobInfos.length === 0) {
            return 0;
        }
        
        this.jobWorkerInfo.tradeJobInfos.forEach((tradeJobInfo: ITradeJobInfo) => {
            const enteredQty = tradeJobInfo.enterTradeStatus.totalQty_1 - tradeJobInfo.exitTradeStatus.totalQty_1;
            if (enteredQty > 0) {
                enteredBalance = enteredQty * tradeJobInfo.enterTradeStatus.avgPrice_1;
            }
        })
        return wrapNumber(enteredBalance);
    }

    private calculatePriceWithFee = (price: number, feeRate: number, additionalRate?: number) => {
        return wrapNumber(price * (additionalRate ?? 1) * (1.0 + feeRate));
    
    }

    private calculateMinTradingInfo = () => {
        let minTradingInfo: IMinTradingInfo = {
            minNotation: -1, minQty: -1, minAmount: -1
        }
        if (!this.exchangeCoinInfo1 || !this.exchangeCoinInfo2 || !this.coinInfo1 || !this.coinInfo2 || !this.currencyInfo) {
            return minTradingInfo;
        }
        
        const minNotation = wrapNumber(Math.max(this.exchangeCoinInfo1.minNotional, this.exchangeCoinInfo2.minNotional * this.currencyInfo.price));
        const minQty = wrapNumber(Math.max(this.exchangeCoinInfo1.minQty, this.exchangeCoinInfo2.minQty))
        const minNotationBuyAmount_1 = wrapNumber(this.calculatePriceWithFee(minNotation, this.exchangeCoinInfo1.takerFee, PRICE_BUFFER_RATE))
        const minNotationBuyAmount_2 = wrapNumber(this.calculatePriceWithFee(minNotation, this.exchangeCoinInfo2.takerFee, PRICE_BUFFER_RATE))
        const minQtyBuyAmount_1 = wrapNumber(this.calculatePriceWithFee(minQty * this.coinInfo1.sellPrice, this.exchangeCoinInfo1.takerFee, PRICE_BUFFER_RATE))
        const minQtyBuyAmount_2 = wrapNumber(this.calculatePriceWithFee(minQty * this.coinInfo2.buyPrice, this.exchangeCoinInfo2.takerFee, PRICE_BUFFER_RATE) * this.currencyInfo.price)
        const minAmount = wrapNumber(Math.max(minNotationBuyAmount_1, minNotationBuyAmount_2, minQtyBuyAmount_1, minQtyBuyAmount_2));
        minTradingInfo.minNotation = minNotation;
        minTradingInfo.minQty = minQty;
        minTradingInfo.minAmount = minAmount;
        // this.handlers?.logHandler?.log?.info(`[calculateMinTradingInfo] coinInfo1.sellPrice: ${this.coinInfo1.sellPrice} coinInfo2.buyPrice: ${this.coinInfo2.buyPrice}, currencyInfo: `, this.currencyInfo);
        // this.handlers?.logHandler?.log?.info(`[calculateMinTradingInfo] minTradingInfo: `, minTradingInfo);
        return minTradingInfo
    }
    

    private processEnter = async (coinInfo1: CoinInfo, coinInfo2: CoinInfo, currencyInfo: ICurrencyInfo) => {
        if (this.enterCnt > 3) {
            return true;
        }
        if (!this.exchangeCoinInfo1 || !this.exchangeCoinInfo2 
            || !coinInfo1 || !coinInfo2 || !currencyInfo
            || !coinInfo1.accountInfo || !coinInfo2.accountInfo) {
                return true;
        }
        let enteredBalance = this.getEnteredBalance();
        let exchange2Balance = wrapNumber(coinInfo2.accountInfo.avaliableBalance * coinInfo2.accountInfo.leverage * currencyInfo.price);
        let avaliableBalance: number = wrapNumber(Math.min(coinInfo1.accountInfo.avaliableBalance, exchange2Balance));
        let maxBalance: number = wrapNumber(this.jobWorkerInfo.config.maxInputAmount - enteredBalance);
        avaliableBalance = wrapNumber(Math.min(avaliableBalance, maxBalance));

        const avgSellPrice1 = wrapNumber(getAvgPriceFromOrderBook(coinInfo1.orderBook.ask, avaliableBalance));
        const avgBuyPrice1 = wrapNumber(getAvgPriceFromOrderBook(coinInfo1.orderBook.bid, avaliableBalance));
        const avgSellPrice2 = wrapNumber(getAvgPriceFromOrderBook(coinInfo2.orderBook.ask, (avaliableBalance / currencyInfo.price)));
        const avgBuyPrice2 = wrapNumber(getAvgPriceFromOrderBook(coinInfo2.orderBook.bid, (avaliableBalance / currencyInfo.price)));

        if (avgSellPrice1 < 0 || avgBuyPrice1 < 0 || avgSellPrice2 < 0 || avgBuyPrice2 < 0) {
            return false;
        }
        const curEnterPrimium = wrapNumber(calculatePrimium(avgSellPrice1, avgBuyPrice2, currencyInfo.price));

        if (curEnterPrimium <= this.jobWorkerInfo.enterTargetPrimium) {            
            const minTradingInfo: IMinTradingInfo = this.calculateMinTradingInfo();
            if (minTradingInfo.minAmount < 0 || minTradingInfo.minQty < 0 || minTradingInfo.minAmount < 0) {
                this.handlers?.logHandler?.log?.error(`[processEnter] skip processEnter. minTradingInfo: `, minTradingInfo);
                return false;
            }
            if (avaliableBalance < (wrapNumber(minTradingInfo.minAmount * 2)) || this.jobWorkerInfo.config.maxInputAmount < (wrapNumber(minTradingInfo.minAmount * 2))) {
                return true;
            }
            this.handlers?.logHandler?.log?.info(`[processEnter] minTradingInfo: `, minTradingInfo);

            // 현재 balance와 계산하고 있는 balance가 다르면 5초동안은 jopProcess skip 함.  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            let promises: any = []
            promises.push(this.exchange1Handler?.fetchBalance())
            promises.push(this.exchange2Handler?.fetchBalance())
            let promiseRet = await Promise.all(promises)
            const curAccountInfo1: ACCOUNT_INFO = promiseRet[0];
            const curAccountInfo2: ACCOUNT_INFO= promiseRet[1];
            if (await this.isSameAccountInfo(coinInfo1.accountInfo, curAccountInfo1) === false) {
                this.handlers?.logHandler?.log?.error("AccountInfo1 is not same. skip process.")             
                return false;
            }
            // binance는 가겨에 따라 avaliableBalance가 계속 바뀌어서 사용 불가.            
            // if (await this.isSameAccountInfo(coinInfo2.accountInfo, curAccountInfo2) === false) {
            //     this.handlers?.logHandler?.log?.error("AccountInfo2 is not same. skip process.")
            //     return false;
            // }


            // 테스트 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // if (this.isDone === true) {
            //     return true;
            // }
            // this.isDone = true;
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


            // fake 거래로 거래 확인. ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////                
            // Disable FakeTrade. TODO. biance fail to cancle ETH order
            // // Fake Trade.
            // let exchane1FakeTradePrice = wrapNumber(Math.ceil(coinInfo1.price * 0.8));    // 20프로 아래 가격 매수
            // exchane1FakeTradePrice = convertExchangeOrederPrice(this.exchange1Handler?.exchange?? EXCHANGE.NONE, exchane1FakeTradePrice);
            // let exchane1FakeTradeQty = wrapNumber(Math.ceil((exchangeCoinInfo1.minNotional / exchane1FakeTradePrice) * 1000000) / 1000000);    // 50프로 아래 가격
            // // this.handlers?.logHandler?.log?.debug("exchane1FakeTradePrice: ", exchane1FakeTradePrice)
            // // this.handlers?.logHandler?.log?.debug("exchane1FakeTradeVolume: ", exchane1FakeTradeQty)

            // let exchane2FakeTradePrice = wrapNumber(Math.ceil(coinInfo2.price * 1.2));    // 20프로 위 가격 Shot
            // let exchane2FakeTradeQty = wrapNumber(Math.max(exchangeCoinInfo2.minQty, exchangeCoinInfo2.minNotional / exchane2FakeTradePrice));
            // if (this.exchangeCoinInfo2?.quantityPrecision && this.exchangeCoinInfo2?.quantityPrecision >= 0) {
            //     exchane2FakeTradeQty = roundUpToDecimalPlaces(exchane2FakeTradeQty, this.exchangeCoinInfo2?.quantityPrecision);
            // }
            
            // if (avaliableBalance <= wrapNumber(exchane1FakeTradePrice * (1.0 + (this.exchangeCoinInfo1?.takerFee ?? 0)) * exchane1FakeTradeQty)
            // || avaliableBalance <= wrapNumber(exchane2FakeTradePrice * (1.0 + (this.exchangeCoinInfo2?.takerFee ?? 0)) * exchane2FakeTradeQty)) {
            //     // this.handlers?.logHandler?.log?.debug(`555555555`)
            //     return true;
            // }

            // let promises: any = []
            //국내 거래소는 굳이 fake test할필요 없음(이후 먼저 거래해보기때문에 실패하면 거기서 error 처리)
            //promises.push(this.exchange1Handler?.checkFakeTrade(ORDER_BID_ASK.BID, exchane1FakeTradeQty, exchane1FakeTradePrice));
            // promises.push(this.exchange2Handler?.checkFakeTrade(ORDER_BID_ASK.ASK, exchane2FakeTradeQty, exchane2FakeTradePrice));
            // let promisesRet = await Promise.all(promises);
            // for (const item of promisesRet) {
            //     this.handlers?.logHandler?.log?.info(`checkFakeTrade. promisesRet: ${item}`)
            //     if (item === false) {
            //         this.handlers?.logHandler?.log?.error("fail fakeTrade. skip processJobWorker")
            //         return false;
            //     }
            // }
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            this.handlers?.logHandler?.log?.info("enterTargetPrimium is satisfied. enterPosition.");
            const ret = await this.enterPosition(avaliableBalance, minTradingInfo, curEnterPrimium);
            this.enterCnt++;
            if (!ret) {
                this.handlers?.logHandler?.log?.info("Fail TO enterPosition!!!!!!!!!. ret: ", ret);
                return false;
            } else {
                let tradeJobInfo: ITradeJobInfo = _.cloneDeep(ret);                
                const recordedTradeJobInfo: any = await this.handlers.databaseHandler?.tradeJobInfoDBApi?.addTradeJobInfo(tradeJobInfo);
                if (ret) {
                    this.jobWorkerInfo.tradeJobInfos.push(recordedTradeJobInfo);
                }
                await this.handlers.databaseHandler?.jobworkerDBApi?.updateJobWorker(this.jobWorkerInfo);
                if (this.notifyJobWokerInfoCallback) {
                    await this.notifyJobWokerInfoCallback();
                }
                if (ret.enterTradeStatus?.totalQty_fail > 0 || ret.enterTradeStatus?.totalQty_cancel > 0) {
                    this.handlers?.logHandler?.log?.info("Fail TO enterPosition!!!!!!!!!. ret: ", ret);
                    return false;
                } else {
                    this.handlers?.logHandler?.log?.info("SUCCESS TO enterPosition!!!!!!!!!");
                }
            }
        }
        return true;
    }

    private processExit = async () => {
        if (this.exitCnt > 3) {
            return true;
        }
        if (!this.exchangeCoinInfo1 || !this.exchangeCoinInfo2 
            || !this.coinInfo1 || !this.coinInfo2 || !this.currencyInfo
            || !this.coinInfo1.accountInfo || !this.coinInfo2.accountInfo) {
                return true;
        }
        
        // 탈출 가능한지 check.
        if (this.jobWorkerInfo.tradeJobInfos.length <= 0) {
            return true;
        }

        let ret = true;

        for (const tradeJobInfo of this.jobWorkerInfo.tradeJobInfos) {
            let coinInfo1 = _.cloneDeep(this.coinInfo1)
            let coinInfo2 = _.cloneDeep(this.coinInfo2)
            let currencyInfo = _.cloneDeep(this.currencyInfo)
            this.handlers?.logHandler?.log?.debug(`exitCompleteType: ${tradeJobInfo.exitCompleteType}, enterCompleteType: ${tradeJobInfo.enterCompleteType}`);
            if (tradeJobInfo.exitCompleteType !== COMPLETE_TYPE.NONE) {
                continue;
            }
            if (tradeJobInfo.enterCompleteType !== COMPLETE_TYPE.SUCCESS) {
                continue;
            }
            if (tradeJobInfo.enterTradeStatus.totalQty_1 <= 0 || tradeJobInfo.enterTradeStatus.totalQty_2 <= 0) {
                continue;
            }
            const avgSellPrice1 = getAvgPriceFromOrderBookByQty(coinInfo1.orderBook.ask, tradeJobInfo.enterTradeStatus.totalQty_1)
            const avgBuyPrice1 = getAvgPriceFromOrderBookByQty(coinInfo1.orderBook.bid, tradeJobInfo.enterTradeStatus.totalQty_1)
            const avgSellPrice2 = getAvgPriceFromOrderBookByQty(coinInfo2.orderBook.ask, tradeJobInfo.enterTradeStatus.totalQty_2)
            const avgBuyPrice2 = getAvgPriceFromOrderBookByQty(coinInfo2.orderBook.bid, tradeJobInfo.enterTradeStatus.totalQty_2)

            // this.handlers?.logHandler?.log?.debug(`avgSellPrice1: ${avgSellPrice1}, avgBuyPrice1: ${avgBuyPrice1}, avgSellPrice2: ${avgSellPrice2}, avgBuyPrice2: ${avgBuyPrice2}`);
            if (avgSellPrice1 < 0 || avgBuyPrice1 < 0 || avgSellPrice2 < 0 || avgBuyPrice2 < 0) {
                return false;
            }

            // let exchane1FakeTradePrice = wrapNumber(Math.ceil(coinInfo1.price * 1.2));    // 20프로 위 가격 매도
            // exchane1FakeTradePrice = convertExchangeOrederPrice(this.exchange1Handler?.exchange?? EXCHANGE.NONE, exchane1FakeTradePrice);
            // let exchane1FakeTradeQty = wrapNumber(Math.ceil((this.exchangeCoinInfo1.minNotional / exchane1FakeTradePrice) * 1000000) / 1000000);    //20프로 아래 가격
            // // this.handlers?.logHandler?.log?.debug("exchane1FakeTradePrice: ", exchane1FakeTradePrice)
            // // this.handlers?.logHandler?.log?.debug("exchane1FakeTradeVolume: ", exchane1FakeTradeQty)
            // let exchane2FakeTradePrice = wrapNumber(Math.ceil(coinInfo2.price * 0.8));    // 20프로 아래 가격 long
            // let exchane2FakeTradeQty = wrapNumber(Math.max(this.exchangeCoinInfo2.minQty, this.exchangeCoinInfo2.minNotional / exchane2FakeTradePrice))

            // // fake 거래로 거래 확인.                
            // let promises: any = []
            // //promises.push(this.exchange1Handler?.checkFakeTrade(ORDER_BID_ASK.ASK, exchane1FakeTradeQty, exchane1FakeTradePrice));
            // promises.push(this.exchange2Handler?.checkFakeTrade(ORDER_BID_ASK.BID, exchane2FakeTradeQty, exchane2FakeTradePrice));
            // let promisesRet = await Promise.all(promises);                
            // for (const item of promisesRet) {
            //     this.handlers?.logHandler?.log?.info(`checkFakeTrade. promisesRet: ${item}`)
            //     if (item === false) {
            //         this.handlers?.logHandler?.log?.error("fail fakeTrade. skip processJobWorker")
            //         return false;
            //     }
            // }

            // 현재 balance와 계산하고 있는 balance가 다르면 5초동안은 jopProcess skip 함.
            const curAccountInfo1: ACCOUNT_INFO = await this.exchange1Handler?.fetchBalance();                
            const curAccountInfo2: ACCOUNT_INFO = await this.exchange2Handler?.fetchBalance();

            if (!coinInfo1.accountInfo || await this.isSameAccountInfo(coinInfo1.accountInfo, curAccountInfo1) === false) {
                this.handlers?.logHandler?.log?.error("AccountInfo1 is not same. skip process.")                    
                return false;
            }
            // binance는 가겨에 따라 avaliableBalance가 계속 바뀌어서 사용 불가.            
            // if (await this.isSameAccountInfo(coinInfo2.accountInfo, curAccountInfo2) === false) {
            //     this.handlers?.logHandler?.log?.error("AccountInfo2 is not same. skip process.")
            //     return false;
            // }
            
            const curExitPrimium: number = calculatePrimium(avgBuyPrice1, avgSellPrice2, currencyInfo.price);
            const curThether: number = calculateTether(curExitPrimium, currencyInfo.price);
            
            if (tradeJobInfo.targetExitTheTher <= curThether) {                
                this.handlers?.logHandler?.log?.debug(`curExitPrimium: ${curExitPrimium}, curThether: ${curThether}`);                
                
                this.handlers?.logHandler?.log?.info("exitTargetPrimium is satisfied. start exitPosition.");
                const minTradingInfo: IMinTradingInfo = this.calculateMinTradingInfo();
                if (minTradingInfo.minAmount < 0 || minTradingInfo.minQty < 0 || minTradingInfo.minAmount < 0) {
                    this.handlers?.logHandler?.log?.error(`[processExit] skip processEnter. minTradingInfo: `, minTradingInfo);
                    return false;
                }
                const ret = await this.exitPosition(tradeJobInfo, minTradingInfo, curExitPrimium);
                this.exitCnt++;
                if (!ret) {
                    this.handlers?.logHandler?.log?.error("FAIL TO exitPosition!!!!!!!!!");
                    return false
                } else {
                    let newTadeJobInfo: ITradeJobInfo = _.cloneDeep(ret);
                    this.jobWorkerInfo.tradeJobInfos.push(newTadeJobInfo);
                    await this.handlers.databaseHandler?.tradeJobInfoDBApi?.updateTradeJobInfo(newTadeJobInfo);
                    await this.handlers.databaseHandler?.jobworkerDBApi?.updateJobWorker(this.jobWorkerInfo);
                    if (this.notifyJobWokerInfoCallback) {
                        await this.notifyJobWokerInfoCallback();
                    }
                    this.handlers?.logHandler?.log?.info("SUCCESS TO exitPosition!!!!!!!!!");
                }
            }
        }
        return true;
    }

    private isOneTimeJobCompleted = () => {
        if (this.isOnlyOneTimeJob === true && this.oneTimeJobCompleted === true) {
            return true;
        }
        return false;
    }

    private processJobWorker = async () => {        
        if (this.isDisposed === true || this.handlers.lockHandler?.tradeJobLock.isLocked === true || this.lock_processJobWoker.isLocked === true) {
            return;
        }

        if (this.isOneTimeJobCompleted() === true) {
            return;
        }

        try {
            await this.handlers.lockHandler?.tradeJobLock.acquire();
            await this.lock_processJobWoker?.acquire();
            await this.lock.acquire();
            const coinInfo1 = _.cloneDeep(this.coinInfo1)
            const coinInfo2 = _.cloneDeep(this.coinInfo2)
            const currencyInfo = _.cloneDeep(this.currencyInfo)
            const exchangeCoinInfo1 = _.cloneDeep(this.exchangeCoinInfo1)
            const exchangeCoinInfo2 = _.cloneDeep(this.exchangeCoinInfo2)
            this.lock.release();
            
            if (this.isOneTimeJobCompleted() === true) {
                this.handlers.lockHandler?.tradeJobLock.release();
                this.lock_processJobWoker?.release();
                return;
            }    
            
            if (!exchangeCoinInfo1 || !exchangeCoinInfo2 
                || exchangeCoinInfo1.status === false || exchangeCoinInfo2.status === false
                || !coinInfo1 || !coinInfo2 || !currencyInfo
                || !coinInfo1.accountInfo || !coinInfo2.accountInfo
                || !this.isVaildCoinInfo(coinInfo1) || !this.isVaildCoinInfo(coinInfo2) || !this.isVaildCurrency(currencyInfo)) {
                this.handlers?.logHandler?.log?.info("data is empty. skip worker process until few seconds.")
                if (!coinInfo1) { this.handlers?.logHandler?.log?.info("coinInfo1: ", coinInfo1); }
                if (!coinInfo2) { this.handlers?.logHandler?.log?.info("coinInfo2: ", coinInfo2); }
                if (!coinInfo1?.accountInfo) { this.handlers?.logHandler?.log?.info("coinInfo1.accountInfo: ", coinInfo1?.accountInfo); }
                if (!coinInfo2?.accountInfo) { this.handlers?.logHandler?.log?.info("coinInfo2.accountInfo: ", coinInfo2?.accountInfo); }
                if (!exchangeCoinInfo1) { this.handlers?.logHandler?.log?.info("exchangeCoinInfo1: ", exchangeCoinInfo1) };
                if (!exchangeCoinInfo2) { this.handlers?.logHandler?.log?.info("exchangeCoinInfo2: ", exchangeCoinInfo2) };
                if (!currencyInfo) { this.handlers?.logHandler?.log?.info("currencyInfo: ", currencyInfo) };
                this.isProcessWorking = false;
                this.handlers?.logHandler?.log?.info("wating run processJobWorker.")
                setTimeout(() => {
                    this.lock_processJobWoker?.release();
                }, 5000)
                this.handlers.lockHandler?.tradeJobLock.release();
                return;
            }
            if (this.isProcessWorking === false) {
                this.handlers?.logHandler?.log?.info("start run processJobWorker again.")
            }
            this.isProcessWorking = true;
            let ret1 = await this.processEnter(coinInfo1, coinInfo2, currencyInfo);
            if (ret1 === false) {
                setTimeout(() => {
                    this.lock_processJobWoker.release();
                }, 5000)    // 5초
                this.handlers.lockHandler?.tradeJobLock.release();
                return;
            }
            if (!this.exchange1Handler || !this.exchange2Handler || this.isDisposed) {
                this.handlers.lockHandler?.tradeJobLock.release();
                this.lock_processJobWoker?.release();
                return;
            }
            let ret2 = await this.processExit();
            if (ret2 === false) {
                setTimeout(() => {
                    this.lock_processJobWoker?.release();
                }, 5000)    // 5초
                this.handlers.lockHandler?.tradeJobLock.release();
                return;
            }
            if (ret1 === true || ret2 === true) {
                if (this.isOnlyOneTimeJob === true) {
                    this.oneTimeJobCompleted = true;
                }
            }
            this.handlers.lockHandler?.tradeJobLock.release();
            this.lock_processJobWoker?.release();
            if (ret1 === true || ret2 === true) {
                if (this.isOnlyOneTimeJob === true) {
                    this.handlers?.logHandler?.log?.error("isOnlyOneTimeJob is true. dispose jobwoekr");
                    this.stopJobWorkerCallback(this.jobWorkerInfo);
                }
            }
        } catch (err) {
            this.handlers.lockHandler?.tradeJobLock.release();
            this.lock_processJobWoker?.release();
            this.lock.release();
            this.handlers?.logHandler?.log?.error("processJobWorker error: ", err);
        }
    }

    private fetchExchangeCoinInfo = async () => {
        if (!this.exchange1Handler || !this.exchange2Handler) {
            return;
        }
        try {
            this.exchangeCoinInfo1 = _.cloneDeep(await this.exchange1Handler.getCoinInfos(this.jobWorkerInfo.coinPair_1));
            this.exchangeCoinInfo2 = _.cloneDeep(await this.exchange2Handler.getCoinInfos(this.jobWorkerInfo.coinPair_2));    
            // this.handlers?.logHandler?.log?.debug("exchangeCoinInfo1: ", this.exchangeCoinInfo1)
            // this.handlers?.logHandler?.log?.debug("exchangeCoinInfo2: ", this.exchangeCoinInfo2)
        }
        catch (err: any) {
            this.handlers?.logHandler?.log?.error("fetchExchangeCoinInfo. error: ", err);
        }
        
    }

    private isSameAccountInfo = async (accountInfo1: ACCOUNT_INFO, accountInfo2: ACCOUNT_INFO) => {
        if (!accountInfo1 || !accountInfo2) {
            return false;
        }
        if (accountInfo1.avaliableBalance != accountInfo2.avaliableBalance){
            this.handlers?.logHandler?.log?.info(`[isSameAccountInfo][err] avaliableBalance: ${accountInfo1.avaliableBalance}, ${accountInfo2.avaliableBalance}`);
        }
        if (accountInfo1.coinPair != accountInfo2.coinPair){
            this.handlers?.logHandler?.log?.info(`[isSameAccountInfo][err] coinPair: ${accountInfo1.coinPair}, ${accountInfo2.coinPair}`);
        }
        if (accountInfo1.currencyType != accountInfo2.currencyType){
            this.handlers?.logHandler?.log?.info(`[isSameAccountInfo][err] currencyType: ${accountInfo1.currencyType}, ${accountInfo2.currencyType}`);
        }
        if (accountInfo1.leverage != accountInfo2.leverage){
            this.handlers?.logHandler?.log?.info(`[isSameAccountInfo][err] leverage: ${accountInfo1.leverage}, ${accountInfo2.leverage}`);
        }
        if (accountInfo1.price != accountInfo2.price){
            this.handlers?.logHandler?.log?.info(`[isSameAccountInfo][err] price: ${accountInfo1.price}, ${accountInfo2.price}`);
        }
        if (accountInfo1.qty != accountInfo2.qty){
            this.handlers?.logHandler?.log?.info(`[isSameAccountInfo][err] qty: ${accountInfo1.qty}, ${accountInfo2.qty}`);
        }

        if (!accountInfo1 || !accountInfo2) {
            return false;
        }

        // pnl 은 다를수 있음.
        if (accountInfo1.avaliableBalance != accountInfo2.avaliableBalance
            || accountInfo1.coinPair != accountInfo2.coinPair
            || accountInfo1.currencyType != accountInfo2.currencyType
            || accountInfo1.leverage != accountInfo2.leverage
            || accountInfo1.price != accountInfo2.price
            || accountInfo1.qty != accountInfo2.qty) {
                return false;
        }
        return true;
    }

    private enterPosition = async (amount: number, minTradingInfo: IMinTradingInfo, enterStartPrimium: number) => {
        let coinInfo1 = _.cloneDeep(this.coinInfo1)
        let coinInfo2 = _.cloneDeep(this.coinInfo2)
        let currencyInfo = _.cloneDeep(this.currencyInfo)
        if (!this.exchangeCoinInfo1 || !this.exchangeCoinInfo2 || !coinInfo1 || !coinInfo2 || !coinInfo1.accountInfo || !coinInfo2.accountInfo || !currencyInfo || currencyInfo.price <= 0) {
            this.handlers?.logHandler?.log?.error(`skip enterPosition. exchangeCoinInfo1: `, this.exchangeCoinInfo1);
            this.handlers?.logHandler?.log?.error(`skip enterPosition. exchangeCoinInfo2: `, this.exchangeCoinInfo2);
            this.handlers?.logHandler?.log?.error(`skip enterPosition. currencyInfo: `, currencyInfo);
            this.handlers?.logHandler?.log?.error(`skip enterPosition. coinInfo1: `, coinInfo1);
            this.handlers?.logHandler?.log?.error(`skip enterPosition. coinInfo2: `, coinInfo2);
            return;
        }
        this.handlers?.logHandler?.log?.info(`start enterPosition. amount: ${amount}, minAmount: ${minTradingInfo.minAmount}, minQty: ${minTradingInfo.minQty}`)
        this.handlers?.logHandler?.log?.info("start enterPosition. enterStartPrimium: ", enterStartPrimium)
        this.handlers?.logHandler?.log?.info("start enterPosition. exchangeCoinInfo1: ", this.exchangeCoinInfo1)
        this.handlers?.logHandler?.log?.info("start enterPosition. exchangeCoinInfo2: ", this.exchangeCoinInfo2)

        let spiltAmount = wrapNumber(amount / this.jobWorkerInfo.config.numOfSplitTrade);
        
        if (spiltAmount < minTradingInfo.minAmount) {
            spiltAmount = minTradingInfo.minAmount;
        }
        let remainedAmount = amount;
        let remainedBalance_1 = coinInfo1.accountInfo?.avaliableBalance;
        let remainedBalance_2 = wrapNumber(coinInfo2.accountInfo.avaliableBalance * coinInfo2.accountInfo.leverage);
        let isLastOrder = false;

        const enterStartThether = calculateTether(enterStartPrimium, currencyInfo.price)
 
        let tradeJobInfo: ITradeJobInfo = {
            userUID: this.jobWorkerInfo.userUID,
            jobWrokerId: this.jobWorkerInfo._id ?? "",
            coinPair_1: this.jobWorkerInfo.coinPair_1,
            coinPair_2: this.jobWorkerInfo.coinPair_2,
            symbol_1: this.jobWorkerInfo.symbol_1,
            symbol_2: this.jobWorkerInfo.symbol_2,
            leverage_1: 1,
            leverage_2: coinInfo2.accountInfo.leverage ?? 1,
            profit_1: 0,
            profit_2: 0,
            totalProfit: 0,
            fee_1: 0,
            fee_2: 0,
            totalFee: 0,
            totalProfitIncludeFee: 0,
            profitRate: 0,
            profitRateIncludeFee: 0,

            enterTradeStatus: {
                avgPrice_1: 0,
                totalVolume_1: 0,
                totalQty_1: 0,
                totalFee_1: 0,

                avgPrice_2: 0,
                totalVolume_2: 0,
                totalQty_2: 0,
                totalFee_2: 0,

                avgPrice_fail: 0,
                totalVolume_fail: 0,
                totalQty_fail: 0,
                totalFee_fail: 0,

                avgPrice_cancel: 0,
                totalVolume_cancel: 0,
                totalQty_cancel: 0,
                totalFee_cancel: 0,

                timestamp: 0,
            },
            exitTradeStatus: {
                avgPrice_1: 0,
                totalVolume_1: 0,
                totalQty_1: 0,
                totalFee_1: 0,

                avgPrice_2: 0,
                totalVolume_2: 0,
                totalQty_2: 0,
                totalFee_2: 0,                

                avgPrice_fail: 0,
                totalVolume_fail: 0,
                totalQty_fail: 0,
                totalFee_fail: 0,

                avgPrice_cancel: 0,
                totalVolume_cancel: 0,
                totalQty_cancel: 0,
                totalFee_cancel: 0,

                timestamp: 0,
            },
        
            enterTradeInfo_1: [],
            exitTradeInfo_1: [],
            enterTradeInfo_2: [],
            exitTradeInfo_2: [],
            cancelEnterTradeInfo: [],
            cancelExitTradeInfo: [],
        
            targetEnterPrimium: this.jobWorkerInfo.enterTargetPrimium,
            targetExitPrimium: this.jobWorkerInfo.exitTargetPrimium,
            targetExitTheTher: 0,

            enterStartPrimium: enterStartPrimium,
            exitStartPrimium: 0,
        
            enteredPrimium: 0,
            exitedPrimium: 0,
        
            enterStartThether: enterStartThether,
            exitStartThether: 0, 

            enteredThether: 0,
            exitedThether: 0,

            enteredCurrencyPrice:  currencyInfo.price,
            exitedCurrencyPrice: 0,

            enterCompleteType: COMPLETE_TYPE.NONE,
            exitCompleteType: COMPLETE_TYPE.NONE,
        
            createdAt: 0,
            updatedAt: 0,
        }

        let index = 0;
        while(true) {            
            // 최소구매금액 보다 작으면 break;            
            this.handlers?.logHandler?.log?.info(`[enterPosition][spiltOrderIndex: ${index}] remainedAmount: ${remainedAmount} spiltAmount: ${spiltAmount}`);
            this.handlers?.logHandler?.log?.info(`[enterPosition][spiltOrderIndex: ${index}] remainedBalance_1: ${remainedBalance_1}, remainedBalance_2: ${remainedBalance_2}`);
            if (!this.currencyInfo || !this.coinInfo1 || !this.coinInfo2) {
                break;
            }            

            if (remainedBalance_1 < spiltAmount || wrapNumber(remainedBalance_2 * this.currencyInfo.price) < wrapNumber(spiltAmount)) {
                break;
            }            
            
            let orderAmount = 0;
            if (remainedAmount < wrapNumber(spiltAmount + (minTradingInfo.minAmount * 2))) {
                orderAmount = wrapNumber(remainedAmount);
                isLastOrder = true;
            } else {
                orderAmount = wrapNumber(spiltAmount);
                isLastOrder = false;
            }
            this.handlers?.logHandler?.log?.info(`[enterPosition][spiltOrderIndex: ${index}] orderAmount: ${orderAmount}, isLastOrder: ${isLastOrder}`);
            const minNotaion_1 = wrapNumber(Math.max(
                this.calculatePriceWithFee(this.coinInfo1.sellPrice * minTradingInfo.minQty, this.exchangeCoinInfo1.takerFee, PRICE_BUFFER_RATE), 
                this.calculatePriceWithFee(this.exchangeCoinInfo1.minNotional, this.exchangeCoinInfo1.takerFee, PRICE_BUFFER_RATE)));
            const minNotaion_2 = wrapNumber(Math.max(
                this.calculatePriceWithFee(this.coinInfo2.buyPrice * minTradingInfo.minQty, this.exchangeCoinInfo2.takerFee, PRICE_BUFFER_RATE), 
                this.calculatePriceWithFee(this.exchangeCoinInfo2.minNotional, this.exchangeCoinInfo2.takerFee, PRICE_BUFFER_RATE)) * this.currencyInfo.price);
            if (orderAmount < minTradingInfo.minAmount || orderAmount < minNotaion_1 || orderAmount < minNotaion_2) {
                this.handlers?.logHandler?.log?.error(`[enterPosition][spiltOrderIndex: ${index}] stop enterPosition. this.currencyInfo.price: ${this.currencyInfo.price}, coinInfo1.sellPrice: ${coinInfo1.sellPrice}, coinInfo2.buyPrice: ${coinInfo2.buyPrice}`);
                this.handlers?.logHandler?.log?.error(`[enterPosition][spiltOrderIndex: ${index}] stop enterPosition. orderAmount: ${orderAmount}, minAmount: ${minTradingInfo.minAmount}, minNotaion_1: ${minNotaion_1}, minNotaion_2: ${minNotaion_2}`);
                break;
            }
            let ret: any = await this.enterSubProcess(orderAmount, minTradingInfo.minQty, index);
            const subProcessRet: ISubProcessRet | any = ret;
            if (ret) {
                this.handlers?.logHandler?.log?.info("isSuccess: ", subProcessRet.isSuccess);
                this.handlers?.logHandler?.log?.info("tradeInfo_1: ", subProcessRet.tradeInfo_1);
                this.handlers?.logHandler?.log?.info("tradeInfo_2: ", subProcessRet.tradeInfo_2);
                this.handlers?.logHandler?.log?.info("cancel_tradeInfo: ", subProcessRet.cancel_tradeInfo);
                tradeJobInfo.enterTradeStatus.timestamp = Date.now();                
                if (subProcessRet.isSuccess === true) {
                    tradeJobInfo.enterTradeStatus.totalVolume_1 = wrapNumber(tradeJobInfo.enterTradeStatus.totalVolume_1 + subProcessRet.tradeInfo_1?.totalVolume ?? 0);
                    tradeJobInfo.enterTradeStatus.totalQty_1 = wrapNumber(tradeJobInfo.enterTradeStatus.totalQty_1 + subProcessRet.tradeInfo_1?.totalQty ?? 0);
                    tradeJobInfo.enterTradeStatus.totalFee_1 = wrapNumber(tradeJobInfo.enterTradeStatus.totalFee_1 +subProcessRet.tradeInfo_1?.totalFee ?? 0);
                    tradeJobInfo.enterTradeStatus.avgPrice_1 = wrapNumber(tradeJobInfo.enterTradeStatus.totalVolume_1 / tradeJobInfo.enterTradeStatus.totalQty_1);
        
                    tradeJobInfo.enterTradeStatus.totalVolume_2 = wrapNumber(tradeJobInfo.enterTradeStatus.totalVolume_2 + subProcessRet.tradeInfo_2?.totalVolume ?? 0);
                    tradeJobInfo.enterTradeStatus.totalQty_2 = wrapNumber(tradeJobInfo.enterTradeStatus.totalQty_2 +subProcessRet.tradeInfo_2?.totalQty ?? 0);
                    tradeJobInfo.enterTradeStatus.totalFee_2 = wrapNumber(tradeJobInfo.enterTradeStatus.totalFee_2 + subProcessRet.tradeInfo_2?.totalFee ?? 0);
                    tradeJobInfo.enterTradeStatus.avgPrice_2 = wrapNumber(tradeJobInfo.enterTradeStatus.totalVolume_2 / tradeJobInfo.enterTradeStatus.totalQty_2);
                } else {
                    tradeJobInfo.enterTradeStatus.totalVolume_fail = wrapNumber(tradeJobInfo.enterTradeStatus.totalVolume_fail +subProcessRet.tradeInfo_1?.totalVolume);
                    tradeJobInfo.enterTradeStatus.totalQty_fail = wrapNumber(tradeJobInfo.enterTradeStatus.totalQty_fail + subProcessRet.tradeInfo_1?.totalQty ?? 0);
                    tradeJobInfo.enterTradeStatus.totalFee_fail = wrapNumber(tradeJobInfo.enterTradeStatus.totalFee_fail + (subProcessRet.tradeInfo_1?.totalFee ?? 0) + (subProcessRet.tradeInfo_cancel?.totalFee ?? 0));
                    tradeJobInfo.enterTradeStatus.avgPrice_fail = wrapNumber(tradeJobInfo.enterTradeStatus.totalVolume_fail / tradeJobInfo.enterTradeStatus.totalQty_fail);

                    tradeJobInfo.enterTradeStatus.totalVolume_cancel = wrapNumber(tradeJobInfo.enterTradeStatus.totalVolume_cancel + subProcessRet.tradeInfo_cancel?.totalVolume ?? 0);
                    tradeJobInfo.enterTradeStatus.totalQty_cancel = wrapNumber(tradeJobInfo.enterTradeStatus.totalQty_cancel + subProcessRet.tradeInfo_cancel?.totalQty ?? 0);
                    tradeJobInfo.enterTradeStatus.totalFee_cancel = wrapNumber(tradeJobInfo.enterTradeStatus.totalFee_cancel + subProcessRet.tradeInfo_cancel?.totalFee ?? 0);
                    tradeJobInfo.enterTradeStatus.avgPrice_cancel = wrapNumber(tradeJobInfo.enterTradeStatus.totalVolume_cancel / tradeJobInfo.enterTradeStatus.totalQty_cancel);
                }                
    
                if (subProcessRet.tradeInfo_1) {
                    tradeJobInfo.enterTradeInfo_1.push(subProcessRet.tradeInfo_1);
                }
                if (subProcessRet.tradeInfo_2) {
                    tradeJobInfo.enterTradeInfo_2.push(subProcessRet.tradeInfo_2);
                }
                if (subProcessRet.cancel_tradeInfo) {
                    tradeJobInfo.cancelEnterTradeInfo.push(subProcessRet.cancel_tradeInfo);
                }                
            } else {
                this.handlers?.logHandler?.log?.error(`[enterPosition][spiltOrderIndex: ${index}] FAIL TO enterSubProcess.`);
                break;
            }

            if (isLastOrder === true || subProcessRet?.isSuccess === false) {
                break;
            }
            remainedAmount = wrapNumber(remainedAmount - ((subProcessRet.tradeInfo_1?.totalVolume ?? 0) + (subProcessRet.tradeInfo_1?.totalFee ?? 0)));
            remainedBalance_1 = wrapNumber(subProcessRet.tradeInfo_1?.avaliableBalance ?? 0);
            remainedBalance_2 = wrapNumber((subProcessRet.tradeInfo_2?.avaliableBalance ?? 0) * coinInfo2.accountInfo.leverage);
            if (amount <= wrapNumber(tradeJobInfo.enterTradeStatus.totalVolume_1 + tradeJobInfo.enterTradeStatus.totalFee_1)) {
                this.handlers?.logHandler?.log?.error(`[enterPosition][spiltOrderIndex: ${index}] force stop enterPosition. amount: ${amount}, tradeJobInfo.enterTradeStatus.totalVolume_1 + tradeJobInfo.enterTradeStatus.totalFee_1: ${wrapNumber(tradeJobInfo.enterTradeStatus.totalVolume_1 + tradeJobInfo.enterTradeStatus.totalFee_1)}`);
                break;
            }
            index++;
        }

        tradeJobInfo.enteredPrimium = (tradeJobInfo.enterTradeStatus.avgPrice_1 === 0 || tradeJobInfo.enterTradeStatus.avgPrice_2 === 0)? 0: calculatePrimium(tradeJobInfo.enterTradeStatus.avgPrice_1, tradeJobInfo.enterTradeStatus.avgPrice_2, currencyInfo.price);
        tradeJobInfo.enteredThether = tradeJobInfo.enteredPrimium === 0 ? 0: calculateTether(tradeJobInfo.enteredPrimium, currencyInfo.price);

        if (tradeJobInfo.enterTradeStatus.totalQty_1 === 0 && tradeJobInfo.enterTradeStatus.totalQty_2 === 0
            && tradeJobInfo.enterTradeStatus.totalQty_fail === 0 && tradeJobInfo.enterTradeStatus.totalQty_cancel === 0) {
                this.handlers?.logHandler?.log?.error(`[enterPosition][spiltOrderIndex: ${index}] there was no trade`);
                return null;
        }
        
        if ((tradeJobInfo.enterTradeStatus.totalQty_fail === 0 && tradeJobInfo.enterTradeStatus.totalQty_cancel === 0)
            || tradeJobInfo.enterTradeStatus.totalQty_fail > 0 && tradeJobInfo.enterTradeStatus.totalQty_fail === tradeJobInfo.enterTradeStatus.totalQty_cancel) {
            tradeJobInfo.enterCompleteType = COMPLETE_TYPE.SUCCESS;
            tradeJobInfo.targetExitTheTher = wrapNumber(tradeJobInfo.enteredThether * (1.0 + (tradeJobInfo.targetExitPrimium * 0.01)) / (1.0 + (tradeJobInfo.enteredPrimium * 0.01)));
        } else {
            tradeJobInfo.enterCompleteType = COMPLETE_TYPE.FAIL;
        }

        this.handlers?.logHandler?.log?.info("complete enterPosition. tradeJobInfo: ", tradeJobInfo)
        return tradeJobInfo;
    }

    private calculateAmountWithoutFee = (amount: number, fee: number) => {
        return wrapNumber(amount / (1.0 + fee));
    }

    private enterSubProcess = (amount: number, minQty: number, index: number) => {
        this.handlers?.logHandler?.log?.info(`[enterSubProcess][spiltOrderIndex: ${index}] start enterSubProcess. amount: ${amount}, minQty: ${minQty}`);        
        return new Promise(async (resolve) => {
            if (!this.exchangeCoinInfo1 || !this.exchangeCoinInfo2 || !this.coinInfo1 || !this.coinInfo2 || !this.currencyInfo) {
                this.handlers?.logHandler?.log?.error(`[enterSubProcess][spiltOrderIndex: ${index}] skip enterSubProcess.`);
                this.handlers?.logHandler?.log?.error(`[enterSubProcess][spiltOrderIndex: ${index}] exchangeCoinInfo1: `, this.exchangeCoinInfo1);
                this.handlers?.logHandler?.log?.error(`[enterSubProcess][spiltOrderIndex: ${index}] exchangeCoinInfo2: `, this.exchangeCoinInfo2);
                this.handlers?.logHandler?.log?.error(`[enterSubProcess][spiltOrderIndex: ${index}] coinInfo1: `, this.coinInfo1);
                this.handlers?.logHandler?.log?.error(`[enterSubProcess][spiltOrderIndex: ${index}] coinInfo2: `, this.coinInfo2);
                this.handlers?.logHandler?.log?.error(`[enterSubProcess][spiltOrderIndex: ${index}] currencyInfo: `, this.currencyInfo);
                resolve(null)
                return;
            }
            let ret: ISubProcessRet = {
                isSuccess: false,
                tradeInfo_1: null, 
                tradeInfo_2: null,
                tradeInfo_cancel: null,
            }

            const coinInfo1 = _.cloneDeep(this.coinInfo1);
            let amountWithoutFee = this.calculateAmountWithoutFee(amount, this.exchangeCoinInfo1.takerFee)
            let orderPirce = convertExchangeOrederPrice(this.exchange1Handler?.exchange ?? EXCHANGE.NONE, coinInfo1.sellPrice * PRICE_BUFFER_RATE)            
            let volume = wrapNumber(amountWithoutFee / (coinInfo1.sellPrice * PRICE_BUFFER_RATE));
            volume = wrapNumber(minQty * Math.floor(volume / minQty))
            if (volume === 0) {
                this.handlers?.logHandler?.log?.error(`[enterSubProcess][spiltOrderIndex: ${index}] skip enterSubProcess. volume is 0`)
                resolve(null);
                return;
            }
            let res_1 = await this.exchange1Handler?.orderMarketBuy(volume, orderPirce, this.jobWorkerInfo._id);
            if (!res_1) {
                this.handlers?.logHandler?.log?.error(`[enterSubProcess][spiltOrderIndex: ${index}] Fail to exchange_1 orderMarketBuy.`)
                resolve(null);
                return;
            }
            let tradeInfo_1: ITradeInfo = res_1 as ITradeInfo;
            this.handlers?.logHandler?.log?.info(`[enterSubProcess][spiltOrderIndex: ${index}] tradeInfo_1: `, tradeInfo_1);
            const res_2 = await this.exchange2Handler?.orderMarketSell(volume, this.jobWorkerInfo._id);
            if (!res_2) {
                this.handlers?.logHandler?.log?.error(`[enterSubProcess][spiltOrderIndex: ${index}] Fail to exchange_2 orderMarketSell`);
                const res_cancle = await this.exchange1Handler?.orderMarketSell(volume, this.jobWorkerInfo._id);
                if (!res_cancle) {
                    this.handlers?.logHandler?.log?.error("[enterSubProcess][spiltOrderIndex: ${index}] Fail to cancle exchange_1 orderMarketSell.")
                    ret = {
                        isSuccess: false,
                        tradeInfo_1, 
                        tradeInfo_2: null,
                        tradeInfo_cancel: null,
                    }
                } else {
                    ret = {
                        isSuccess: false,
                        tradeInfo_1, 
                        tradeInfo_2: null,
                        tradeInfo_cancel: res_cancle as ITradeInfo,
                    }
                }
                resolve(ret)
                return;
            }
            let tradeInfo_2: ITradeInfo = res_2 as ITradeInfo;
            this.handlers?.logHandler?.log?.info(`[enterSubProcess][spiltOrderIndex: ${index}] tradeInfo_2: `, tradeInfo_2);
            ret = {
                isSuccess: true,
                tradeInfo_1, 
                tradeInfo_2,
                tradeInfo_cancel: null,
            }
            resolve(ret)
        });
    }

    private exitPosition = async (tradeJobInfo: ITradeJobInfo, minTradingInfo: IMinTradingInfo, exitStartPrimium: number) => {
        this.handlers?.logHandler?.log?.info("start exitPosition. tradeJobInfo: ", tradeJobInfo)
        this.handlers?.logHandler?.log?.info("start exitPosition. exitStartPrimium: ", exitStartPrimium)
        this.handlers?.logHandler?.log?.info("start exitPosition. this.coinInfo1: ", this.coinInfo1)
        this.handlers?.logHandler?.log?.info("start exitPosition. this.coinInfo2: ", this.coinInfo2)
        this.handlers?.logHandler?.log?.info("start exitPosition. this.currencyInfo: ", this.currencyInfo)

        if (!this.exchangeCoinInfo1 || !this.exchangeCoinInfo2 || !this.coinInfo1 || !this.coinInfo2 || !this.currencyInfo || this.currencyInfo.price <= 0) {
            this.handlers?.logHandler?.log?.error(`skip enterPosition. exchangeCoinInfo1: `, this.exchangeCoinInfo1);
            this.handlers?.logHandler?.log?.error(`skip enterPosition. exchangeCoinInfo2: `, this.exchangeCoinInfo2);
            this.handlers?.logHandler?.log?.error(`skip enterPosition. currencyInfo: `, this.currencyInfo);
            this.handlers?.logHandler?.log?.error(`skip enterPosition. coinInfo1: `, this.coinInfo1);
            this.handlers?.logHandler?.log?.error(`skip enterPosition. coinInfo2: `, this.coinInfo2);
            return;
        }

        const currencyPrice = this.currencyInfo.price;
        let remainedQty_1 = tradeJobInfo.enterTradeStatus.totalQty_1;
        let remainedQty_2 = tradeJobInfo.enterTradeStatus.totalQty_2;        
        const minQty_1 = wrapNumber(minTradingInfo.minAmount / this.coinInfo1.buyPrice);
        const minQty_2 = wrapNumber(minTradingInfo.minAmount / (this.coinInfo2.sellPrice * this.currencyInfo.price));
        let minQty = wrapNumber(Math.max(minQty_1, minQty_2));
        minQty = wrapNumber((1 + Math.floor(minQty / minTradingInfo.minQty)) * minTradingInfo.minQty)
        this.handlers?.logHandler?.log?.info(`minQty: ${minQty}, minQty_1: ${minQty_1}, minQty_2: ${minQty_2}`);
        if (minQty === 0 || remainedQty_1 < minQty || remainedQty_2 < minQty) {
            this.handlers?.logHandler?.log?.error(`exitPosition is something wrong: minQty: ${minQty}, remainedQty_1: ${remainedQty_1}, remainedQty_2: ${remainedQty_2}`);
            return;
        }
        let index = 0;
        let spiltQty_1 = wrapNumber(Math.max(remainedQty_1 / this.jobWorkerInfo.config.numOfSplitTrade, minQty));
        let spiltQty_2 = wrapNumber(Math.max(remainedQty_2 / this.jobWorkerInfo.config.numOfSplitTrade, minQty));
        spiltQty_1 = wrapNumber(Math.floor(spiltQty_1 / minQty) * minQty);
        spiltQty_2 = wrapNumber(Math.floor(spiltQty_2 / minQty) * minQty);
        this.handlers?.logHandler?.log?.info(`minQty: ${minQty}, remainedQty_1: ${remainedQty_1}, remainedQty_2: ${remainedQty_1}, spiltQty_1: ${spiltQty_1}, spiltQty_2: ${spiltQty_2}`);
        if (spiltQty_1 === 0 || spiltQty_1 === 0) {
            this.handlers?.logHandler?.log?.error(`exitPosition is something wrong: minQty: ${minQty}, remainedQty_1: ${remainedQty_1}, remainedQty_2: ${remainedQty_1}, spiltQty_1: ${spiltQty_1}, spiltQty_2: ${spiltQty_2}`);
            return;
        }
        while(true) {
            let qty_1= spiltQty_1;
            let qty_2= spiltQty_2;
            if (remainedQty_1 < wrapNumber(spiltQty_1 + (minQty * 2))) {
                qty_1 = remainedQty_1   
            }
            if (remainedQty_2 < wrapNumber(spiltQty_2 + (minQty * 2))) {
                qty_2 = remainedQty_2
            }
            let ret: any = await this.exitSubProcess(qty_1, qty_2, index)
            const subProcessRet: ISubProcessRet | any = ret;
            if (ret) {
                this.handlers?.logHandler?.log?.info("isSuccess: ", subProcessRet.isSuccess);
                this.handlers?.logHandler?.log?.info("tradeInfo_1: ", subProcessRet.tradeInfo_1);
                this.handlers?.logHandler?.log?.info("tradeInfo_2: ", subProcessRet.tradeInfo_2);
                tradeJobInfo.exitTradeStatus.timestamp = Date.now();
                tradeJobInfo.exitTradeStatus.totalVolume_1 = wrapNumber(tradeJobInfo.exitTradeStatus.totalVolume_1 + (subProcessRet.tradeInfo_1?.totalVolume ?? 0));
                tradeJobInfo.exitTradeStatus.totalQty_1 = wrapNumber(tradeJobInfo.exitTradeStatus.totalQty_1 + (subProcessRet.tradeInfo_1?.totalQty ?? 0));
                tradeJobInfo.exitTradeStatus.totalFee_1 = wrapNumber(tradeJobInfo.exitTradeStatus.totalFee_1 + (subProcessRet.tradeInfo_1?.totalFee ?? 0));
                tradeJobInfo.exitTradeStatus.avgPrice_1 = wrapNumber(tradeJobInfo.exitTradeStatus.totalVolume_1 / tradeJobInfo.exitTradeStatus.totalQty_1);

                tradeJobInfo.exitTradeStatus.totalVolume_2 = wrapNumber(tradeJobInfo.exitTradeStatus.totalVolume_2 + (subProcessRet.tradeInfo_2?.totalVolume ?? 0))
                tradeJobInfo.exitTradeStatus.totalQty_2 = wrapNumber(tradeJobInfo.exitTradeStatus.totalQty_2 + (subProcessRet.tradeInfo_2?.totalQty ?? 0))
                tradeJobInfo.exitTradeStatus.totalFee_2 = wrapNumber(tradeJobInfo.exitTradeStatus.totalFee_2 + (subProcessRet.tradeInfo_2?.totalFee ?? 0))
                tradeJobInfo.exitTradeStatus.avgPrice_2 = wrapNumber(tradeJobInfo.exitTradeStatus.totalVolume_2 / tradeJobInfo.exitTradeStatus.totalQty_2);

                if (subProcessRet.tradeInfo_1) {
                    tradeJobInfo.exitTradeInfo_1.push(subProcessRet.tradeInfo_1);
                }
                if (subProcessRet.tradeInfo_2) {
                    tradeJobInfo.exitTradeInfo_2.push(subProcessRet.tradeInfo_2);
                }
                if (subProcessRet.isSuccess === false) {
                    tradeJobInfo.exitCompleteType = COMPLETE_TYPE.FAIL;
                    break;
                }
            } else {
                this.handlers?.logHandler?.log?.info("FAIL TO exitSubProcess");
                break;
            }
            remainedQty_1 = wrapNumber(remainedQty_1 - qty_1);
            remainedQty_2 = wrapNumber(remainedQty_2 - qty_2);
            if (remainedQty_1 < minQty || remainedQty_2 < minQty) {
                break;
            }
        }
        tradeJobInfo.exitCompleteType = tradeJobInfo.exitCompleteType === COMPLETE_TYPE.FAIL? COMPLETE_TYPE.FAIL: COMPLETE_TYPE.SUCCESS;        
        if (tradeJobInfo.exitCompleteType === COMPLETE_TYPE.SUCCESS) {
            tradeJobInfo.exitedCurrencyPrice = currencyPrice;
            tradeJobInfo.exitStartPrimium = exitStartPrimium;
            tradeJobInfo.exitedPrimium = calculatePrimium(tradeJobInfo.exitTradeStatus.avgPrice_1, tradeJobInfo.exitTradeStatus.avgPrice_2, currencyPrice);
            tradeJobInfo.exitStartThether = calculateTether(tradeJobInfo.exitStartPrimium, currencyPrice);
            tradeJobInfo.exitedThether = calculateTether(tradeJobInfo.exitedPrimium, currencyPrice);
            tradeJobInfo.fee_1 = wrapNumber((tradeJobInfo.enterTradeStatus.totalFee_1 + tradeJobInfo.enterTradeStatus.totalFee_cancel + tradeJobInfo.enterTradeStatus.totalFee_fail) + (tradeJobInfo.exitTradeStatus.totalFee_1 + tradeJobInfo.exitTradeStatus.totalFee_cancel + tradeJobInfo.exitTradeStatus.totalFee_fail));
            tradeJobInfo.fee_2 = wrapNumber((tradeJobInfo.enterTradeStatus.totalFee_2 + tradeJobInfo.exitTradeStatus.totalFee_2) * tradeJobInfo.exitedThether);
            tradeJobInfo.totalFee = wrapNumber(tradeJobInfo.fee_1 + tradeJobInfo.fee_2);
            tradeJobInfo.profit_1 = wrapNumber(tradeJobInfo.exitTradeStatus.totalVolume_1 - tradeJobInfo.enterTradeStatus.totalVolume_1);
            tradeJobInfo.profit_2 = wrapNumber(((((tradeJobInfo.enterTradeStatus.avgPrice_2 / tradeJobInfo.leverage_2) + (tradeJobInfo.enterTradeStatus.avgPrice_2 - tradeJobInfo.exitTradeStatus.avgPrice_2)) * tradeJobInfo.exitedThether) - ((tradeJobInfo.enterTradeStatus.avgPrice_2 / tradeJobInfo.leverage_2) * tradeJobInfo.enteredThether)) * tradeJobInfo.exitTradeStatus.totalQty_1);
            tradeJobInfo.totalProfit = wrapNumber(tradeJobInfo.profit_1 + tradeJobInfo.profit_2);
            tradeJobInfo.totalProfitIncludeFee = wrapNumber(tradeJobInfo.totalProfit - tradeJobInfo.totalFee);
            tradeJobInfo.profitRate = wrapNumber(tradeJobInfo.totalProfit / (tradeJobInfo.enterTradeStatus.totalVolume_1 + (tradeJobInfo.enterTradeStatus.totalVolume_2 * tradeJobInfo.exitedThether)) * 100);
            tradeJobInfo.profitRateIncludeFee = wrapNumber(tradeJobInfo.totalProfitIncludeFee / (tradeJobInfo.enterTradeStatus.totalVolume_1 + (tradeJobInfo.enterTradeStatus.totalVolume_2 * tradeJobInfo.exitedThether)) * 100);
        }
        this.handlers?.logHandler?.log?.info("complete exitPosition. tradeJobInfo: ", tradeJobInfo);
        return tradeJobInfo;
    }

    private exitSubProcess = (qty_1: number, qty_2: number, index: number) => {
        return new Promise(async (resolve) => {
            this.handlers?.logHandler?.log?.info(`[exitSubProcess][exitSubProcess index: ${index}] exitPosition. qty_1: ${qty_1}, qty_2: ${qty_2}`)
            
            let ret: ISubProcessRet = {
                isSuccess: false,
                tradeInfo_1: null, 
                tradeInfo_2: null,
            }
            let res_1 = await this.exchange1Handler?.orderMarketSell(qty_1, this.jobWorkerInfo._id);
            if (!res_1) {
                this.handlers?.logHandler?.log?.error(`[exitSubProcess][exitSubProcess index: ${index}]Fail to exchange_1 orderMarketSell.`)
                resolve(null);
                return;
            }
            let tradeInfo_1: ITradeInfo = res_1 as ITradeInfo;
            this.handlers?.logHandler?.log?.info(`[exitSubProcess][exitSubProcess index: ${index}]tradeInfo_1: `, tradeInfo_1);            
            let res_2 = await this.exchange2Handler?.orderMarketBuy(qty_2, -1, this.jobWorkerInfo._id);
            if (!res_2) {
                this.handlers?.logHandler?.log?.error(`[exitSubProcess][exitSubProcess index: ${index}] Fail to exchange_2 orderMarketBuy.`)
                ret = {
                    isSuccess: false,
                    tradeInfo_1, 
                    tradeInfo_2: null,
                }
                resolve(ret);
                return;
            }
            let tradeInfo_2: ITradeInfo = res_2 as ITradeInfo;
            this.handlers?.logHandler?.log?.info(`[exitSubProcess][exitSubProcess index: ${index}]tradeInfo_2: `, tradeInfo_2);
            ret = {
                isSuccess: res_1 && res_2? true: false,
                tradeInfo_1, 
                tradeInfo_2,
            }
            resolve(ret);
            return;
        })
    }

    private initAllData = () => {
        this.isDisposed = true;
        this.coinInfo1 = null;
        this.coinInfo2 = null;
        this.currencyInfo = null;
        this.isProcessWorking = false;
    }

    private listener_1 = async (coinInfo: CoinInfo | null) => {
        if (this.isDisposed === true || this.lock.isLocked === true) {
            return;
        }
        // this.handlers?.logHandler?.log?.debug("listner_1: ", coinInfo);
        this.coinInfo1 = coinInfo? _.cloneDeep(coinInfo): null;        
        if (this.coinInfo1 && this.coinInfo1.accountInfo) {
            this.assetInfo.balance_1 = this.coinInfo1.accountInfo.avaliableBalance;
            this.assetInfo.coinQty_1 = this.coinInfo1.accountInfo.qty;                
            this.assetInfo.price_1 = this.coinInfo1.price;                
            this.assetInfo.margin_1 = this.coinInfo1.accountInfo.initialMargin;                
            this.assetInfo.pnl_1 = this.coinInfo1.accountInfo.pnl;                
        }
        await this.processJobWorker();
    }

    private listener_2 = async (coinInfo: CoinInfo | null) => {
        if (this.isDisposed === true || this.lock.isLocked === true) {
            return;
        }
        // this.handlers?.logHandler?.log?.debug("listner_2: ", coinInfo);
        this.coinInfo2 = coinInfo? _.cloneDeep(coinInfo): null;
        if (this.coinInfo2 && this.coinInfo2.accountInfo) {
            this.assetInfo.balance_2 = this.coinInfo2.accountInfo.avaliableBalance;                
            this.assetInfo.coinQty_2 = this.coinInfo2.accountInfo.qty;                
            this.assetInfo.price_2 = this.coinInfo2.price;                
            this.assetInfo.margin_2 = this.coinInfo2.accountInfo.initialMargin;                
            this.assetInfo.pnl_2 = this.coinInfo2.accountInfo.pnl;                
        }
        await this.processJobWorker();
    }

    private currencyInfoListener = async (currencyInfo: ICurrencyInfo | null) => {
        if (this.isDisposed === true || this.lock.isLocked === true) {
            return;
        }
        // this.handlers?.logHandler?.log?.debug("currencyInfoListener. ", currencyInfo);
        this.currencyInfo = currencyInfo? _.cloneDeep(currencyInfo): null;
        if (currencyInfo) {
            this.assetInfo.currencyPrice = currencyInfo.price;
        }
        await this.processJobWorker();
    }

    
    private isVaildCoinInfo = (coinInfo: CoinInfo) => {
        if (!coinInfo || coinInfo.coinPair === COIN_PAIR.NONE || coinInfo.symbol === COIN_SYMBOL.NONE
             || coinInfo.price < 0 || coinInfo.buyPrice < 0 || coinInfo.sellPrice < 0 
             || coinInfo.buyQty < 0 || coinInfo.sellQty < 0
             || !coinInfo.accountInfo || coinInfo.accountInfo.currencyType === CURRENCY_TYPE.NONE
             || coinInfo.accountInfo.avaliableBalance < 0) {
                this.handlers?.logHandler?.log?.error(coinInfo);
            return false;
        }
        return true;
    }

    private isVaildCurrency = (currency: ICurrencyInfo) => {
        if (!currency || currency.price < 0) {
            this.handlers?.logHandler?.log?.error("isVaildCurrency: ", currency)
            return false;
        }
        return true;
    }

    public start = async () => {
        if (!this.jobWorkerInfo._id) {
            this.handlers?.logHandler?.log?.error("this.jobWorkerInfo is null. skip start");
            return false;
        }
        this.handlers?.logHandler?.log?.info("start TradeJobWorker. id: ", this.jobWorkerInfo._id);

        let ret = await this.exchange1Handler?.initialize();
        if (ret === false) {
            this.handlers?.logHandler?.log?.error("fail initialize exchange1Handler");
            return false;
        }
        ret = await this.exchange2Handler?.initialize();
        if (ret === false) {
            this.handlers?.logHandler?.log?.error("fail initialize exchange2Handler");
            return false;
        }

        this.isDisposed = false;
        await this.fetchExchangeCoinInfo();
        this.handlers.currencyHandler?.addListener(this.jobWorkerInfo._id, this.currencyInfoListener);

        this.exchange1Handler?.startHandler([this.jobWorkerInfo.coinPair_1]);
        this.exchange2Handler?.startHandler([this.jobWorkerInfo.coinPair_2]);
        return true;
    }

    public dispose = () => {
        this.handlers?.logHandler?.log?.info("dispose TradeJobWorker");
        this.lock_processJobWoker?.acquire();
        this.handlers?.logHandler?.log?.info("start dispose TradeJobWorker. id: ", this.jobWorkerInfo._id);
        this.initAllData();
        if (this.jobWorkerInfo._id) {
            this.handlers.currencyHandler?.removeListener(this.jobWorkerInfo._id);
        }
        this.exchange1Handler?.dispose();
        this.exchange2Handler?.dispose();
        delete this.exchange1Handler;
        delete this.exchange2Handler;
        this.exchange1Handler = undefined;
        this.exchange2Handler = undefined;
        this.lock_processJobWoker?.release();
    }
}
