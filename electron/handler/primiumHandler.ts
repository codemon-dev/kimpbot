import _ from "lodash";

import Handlers from "./Handlers";
import { COIN_PAIR, COIN_SYMBOL, EXCHANGE } from "../../constants/enum";
import { ICurrencyInfo } from "../../interface/ICurrency";
import BinanceHander from "./binanceHandler";
import UpbitHandler from "./upbitHandler";
import { calculatePrimium } from "../../util/tradeUtil";
import { CoinInfo } from "../../interface/IMarketInfo";
import fs from "fs";
import { getPrimiumnFilePath } from "../../util/databaseUtil";
import { IPC_CMD } from "../../constants/ipcCmd";
import { IpcMainEvent } from "electron";
import { IPrimiumChartConfig, OCHL } from "../../interface/ITradeInfo";
import { convertLocalTime } from "../../util/timestamp";


export enum PRIMIUM_TYPE {
    ENTER,
    EXIT
}

export default class primiumHandler {
    private handlers: Handlers | undefined;    
    private binanceHandler: BinanceHander | undefined;
    private upbitHandler: UpbitHandler | undefined;
    private config: IPrimiumChartConfig = {
        exchange1: EXCHANGE.NONE,
        exchange2: EXCHANGE.NONE,
        coinPair1: COIN_PAIR.NONE,
        coinPair2: COIN_PAIR.NONE,
        coinSymbol: COIN_SYMBOL.NONE };
    private ochlMap_enter: Map<COIN_SYMBOL, OCHL[]> = new Map<COIN_SYMBOL, OCHL[]>();
    private ochlMap_exit: Map<COIN_SYMBOL, OCHL[]> = new Map<COIN_SYMBOL, OCHL[]>();
    private currencyInfo: ICurrencyInfo  | null = null;
    private coinInfo1: CoinInfo | null = null;
    private coinInfo2: CoinInfo | null = null;
    private defaultInterverTimeStamp: number = 1000 * 60 * 1;
    private start_enter: number = 0;
    private end_enter: number = 0;
    private start_exit: number = 0;
    private end_exit: number = 0;
    private path: string = `${getPrimiumnFilePath()}/chart/`;
    private isStarted: boolean = false;

    constructor(handlers: Handlers) {
        handlers.logHandler?.log?.info(`create primiumHandler`)
        this.handlers = handlers
        this.upbitHandler = new UpbitHandler(this.handlers);
        this.binanceHandler = new BinanceHander(this.handlers);
    }

    public registerIPCListeners = () => {
        if (!this.handlers?.ipcHandler) {
            this.handlers?.logHandler?.log?.error(`handlers?.ipcHandler is null. skip registerIPCListeners.`);
            return;
        }
        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.REQUEST_PRIMIUM_CHART_DATA, async (evt: IpcMainEvent) => {
            // this.handlers?.logHandler?.log?.debug(`[IPC][REQUEST_PRIMIUM_CHART_DATA]`)
            evt.reply(IPC_CMD.NOTIFY_PRIMIUM_CHART_DATA, {
                enter: this.ochlMap_enter.get(this.config.coinSymbol), 
                exit: this.ochlMap_exit.get(this.config.coinSymbol)
            });
        });
    }

    public writeData = async (type: PRIMIUM_TYPE) => {        
        const filename = type === PRIMIUM_TYPE.ENTER? `${this.config.coinSymbol}_enter_primium.txt`: `${this.config.coinSymbol}_exit_primium.txt`
        if (fs.existsSync(this.path) === false) {
            fs.mkdirSync(this.path, { recursive: true });
        }
        fs.writeFile(this.path + filename, JSON.stringify(type === PRIMIUM_TYPE.ENTER? this.ochlMap_enter.get(this.config.coinSymbol): this.ochlMap_exit.get(this.config.coinSymbol), null, 2), () => {});
    }

    public startHandler = async (config: IPrimiumChartConfig) => {
        if (this.isStarted === true) {
            return;
        }
        this.isStarted = true;        
        this.config = config;
        this.registerIPCListeners();

        let filePath = `${this.path}/${this.config.coinSymbol}_enter_primium.txt`;
        if (fs.existsSync(filePath)) {
            fs.readFile(filePath, {encoding: 'utf8'}, (err, data) => {
                const ochl: OCHL[] = JSON.parse(data);
                this.ochlMap_enter.set(this.config.coinSymbol, ochl);
            })
        }

        filePath = `${this.path}/${this.config.coinSymbol}_exit_primium.txt`;
        if (fs.existsSync(filePath)) {
            fs.readFile(filePath, {encoding: 'utf8'}, (err, data) => {
                const ochl: OCHL[] = JSON.parse(data);
                this.ochlMap_exit.set(this.config.coinSymbol, ochl);
            })
        }

        this.handlers?.currencyHandler?.addListener("primiumChart", this.currencyInfoListener);
        this.upbitHandler?.startHandler([config.coinPair1]);
        this.upbitHandler?.addListener(this.upbitCurrencyInfoListener)

        this.binanceHandler?.startHandler([config.coinPair2]);
        this.binanceHandler?.addListener(this.binanceCurrencyInfoListener)

        const interval = setInterval(async () => {
            const ret = await this.handlers?.currencyHandler?.fetchCurrencyWeebull();
            if (ret) {
                this.currencyInfo = ret as ICurrencyInfo;
                clearInterval(interval);
            }
        }, 1000);

        setInterval(async () => {
            this.writeData(PRIMIUM_TYPE.ENTER);
            this.writeData(PRIMIUM_TYPE.EXIT);
        }, 60 * 1000);
    }

    private upbitCurrencyInfoListener = async (coinInfo: CoinInfo | null) => {
        // this.handlers?.logHandler?.log?.debug("listner_1: ", coinInfo);
        this.coinInfo1 = _.cloneDeep(coinInfo);
        if (!this.config || !this.currencyInfo || !this.coinInfo2 || !coinInfo || !coinInfo?.orderBook) {            
            return;
        }
        const enter_primium = calculatePrimium(coinInfo?.sellPrice?? 0, this.coinInfo2.buyPrice, this.currencyInfo.price);
        const exit_primium = calculatePrimium(coinInfo?.buyPrice?? 0, this.coinInfo2.sellPrice, this.currencyInfo.price);
        if (enter_primium < -100 || exit_primium < -100) {
            return;
        }
        const timestamp = Date.now();
        if (this.start_enter === 0) {
            this.start_enter = timestamp - (timestamp % this.defaultInterverTimeStamp);
            this.end_enter = this.start_enter + this.defaultInterverTimeStamp;
        }        
        let ochlList: any = this.ochlMap_enter.get(this.config.coinSymbol);        
        if (!ochlList || ochlList.length === 0) {                        
            this.ochlMap_enter.set(this.config.coinSymbol, [{
                open: enter_primium,
                close: enter_primium,
                high: enter_primium,
                low: enter_primium,
                time: this.start_enter / 1000,
                timestamp: this.start_enter,
                localtime: convertLocalTime(this.start_enter),
            }]);
            this.writeData(PRIMIUM_TYPE.ENTER);
        } else {
            if (this.start_enter <= timestamp && this.end_enter > timestamp) {
                ochlList[ochlList.length - 1].close = enter_primium;
                if (ochlList[ochlList.length - 1].high < enter_primium) {
                    ochlList[ochlList.length - 1].high = enter_primium;
                }
                if (ochlList[ochlList.length - 1].low > enter_primium) {
                    ochlList[ochlList.length - 1].low = enter_primium;
                }
            } else {
                this.start_enter = timestamp - (timestamp % this.defaultInterverTimeStamp);
                this.end_enter = this.start_enter + this.defaultInterverTimeStamp;
                this.ochlMap_enter.set(this.config.coinSymbol, [...ochlList,{
                    open: enter_primium,
                    close: enter_primium,
                    high: enter_primium,
                    low: enter_primium,
                    time: this.end_enter / 1000,
                    timestamp: this.end_enter,
                    localtime: convertLocalTime(this.end_enter),
                }]);
                this.writeData(PRIMIUM_TYPE.ENTER);
            }
        }

        if (this.start_exit === 0) {
            this.start_exit = timestamp - (timestamp % this.defaultInterverTimeStamp);
            this.end_exit = this.start_exit + this.defaultInterverTimeStamp;
        }
        ochlList = this.ochlMap_exit.get(this.config.coinSymbol);        
        if (!ochlList || ochlList.length === 0) {                        
            this.ochlMap_exit.set(this.config.coinSymbol, [{
                open: exit_primium,
                close: exit_primium,
                high: exit_primium,
                low: exit_primium,
                time: this.start_exit / 1000,
                timestamp: this.start_exit,
                localtime: convertLocalTime(this.start_exit),
            }]);
            this.writeData(PRIMIUM_TYPE.EXIT);
        } else {
            if (this.start_exit <= timestamp && this.end_exit > timestamp) {
                ochlList[ochlList.length - 1].close = exit_primium;
                if (ochlList[ochlList.length - 1].high < exit_primium) {
                    ochlList[ochlList.length - 1].high = exit_primium;
                }
                if (ochlList[ochlList.length - 1].low > exit_primium) {
                    ochlList[ochlList.length - 1].low = exit_primium;
                }
            } else {
                this.start_exit = timestamp - (timestamp % this.defaultInterverTimeStamp);
                this.end_exit = this.start_exit + this.defaultInterverTimeStamp;
                this.ochlMap_exit.set(this.config.coinSymbol, [...ochlList,{
                    open: exit_primium,
                    close: exit_primium,
                    high: exit_primium,
                    low: exit_primium,
                    time: this.end_exit / 1000,
                }]);
                this.writeData(PRIMIUM_TYPE.EXIT);
            }
        }
        // this.handlers?.logHandler?.log?.debug(this.ochlMap.get(this.config.coinSymbol))
    }

    private binanceCurrencyInfoListener = async (coinInfo: CoinInfo | null) => {        
        // this.handlers?.logHandler?.log?.debug("binanceCurrencyInfoListener. ", currencyInfo);
        this.coinInfo2 = _.cloneDeep(coinInfo);
        if (!this.config || !this.currencyInfo || !this.coinInfo1 || !coinInfo || !coinInfo?.orderBook) {            
            return;
        }
        const enter_primium = calculatePrimium(this.coinInfo1.sellPrice, coinInfo.buyPrice, this.currencyInfo.price);
        const exit_primium = calculatePrimium(this.coinInfo1.buyPrice, coinInfo.sellPrice, this.currencyInfo.price);
        if (enter_primium < -100 || exit_primium < -100) {
            return;
        }
        const timestamp = Date.now();
        if (this.start_enter === 0) {
            this.start_enter = timestamp - (timestamp % this.defaultInterverTimeStamp);
            this.end_enter = this.start_enter + this.defaultInterverTimeStamp;
        }   
        let ochlList: any = this.ochlMap_enter.get(this.config.coinSymbol);        
        if (!ochlList || ochlList.length === 0) {                        
            this.ochlMap_enter.set(this.config.coinSymbol, [{
                open: enter_primium,
                close: enter_primium,
                high: enter_primium,
                low: enter_primium,
                time: this.start_enter / 1000,
                timestamp: this.start_enter,
                localtime: convertLocalTime(this.start_enter),
            }]);
            this.writeData(PRIMIUM_TYPE.ENTER);
        } else {
            if (this.start_enter <= timestamp && this.end_enter > timestamp) {
                ochlList[ochlList.length - 1].close = enter_primium;
                if (ochlList[ochlList.length - 1].high < enter_primium) {
                    ochlList[ochlList.length - 1].high = enter_primium;
                }
                if (ochlList[ochlList.length - 1].low > enter_primium) {
                    ochlList[ochlList.length - 1].low = enter_primium;
                }
            } else {
                this.start_enter = timestamp - (timestamp % this.defaultInterverTimeStamp);
                this.end_enter = this.start_enter + this.defaultInterverTimeStamp;
                this.ochlMap_enter.set(this.config.coinSymbol, [...ochlList,{
                    open: enter_primium,
                    close: enter_primium,
                    high: enter_primium,
                    low: enter_primium,
                    time: this.end_enter / 1000,
                    timestamp: this.end_enter,
                    localtime: convertLocalTime(this.end_enter),
                }]);
                this.writeData(PRIMIUM_TYPE.ENTER);
            }
        }      

        if (this.start_exit === 0) {
            this.start_exit = timestamp - (timestamp % this.defaultInterverTimeStamp);
            this.end_exit = this.start_exit + this.defaultInterverTimeStamp;
        }
        ochlList = this.ochlMap_exit.get(this.config.coinSymbol);        
        if (!ochlList || ochlList.length === 0) {                        
            this.ochlMap_exit.set(this.config.coinSymbol, [{
                open: exit_primium,
                close: exit_primium,
                high: exit_primium,
                low: exit_primium,
                time: this.start_exit / 1000,
                timestamp: this.start_exit,
                localtime: convertLocalTime(this.start_exit),
            }]);
            this.writeData(PRIMIUM_TYPE.EXIT);
        } else {
            if (this.start_exit <= timestamp && this.end_exit > timestamp) {
                ochlList[ochlList.length - 1].close = exit_primium;
                if (ochlList[ochlList.length - 1].high < exit_primium) {
                    ochlList[ochlList.length - 1].high = exit_primium;
                }
                if (ochlList[ochlList.length - 1].low > exit_primium) {
                    ochlList[ochlList.length - 1].low = exit_primium;
                }
            } else {
                this.start_exit = timestamp - (timestamp % this.defaultInterverTimeStamp);
                this.end_exit = this.start_exit + this.defaultInterverTimeStamp;
                this.ochlMap_exit.set(this.config.coinSymbol, [...ochlList,{
                    open: exit_primium,
                    close: exit_primium,
                    high: exit_primium,
                    low: exit_primium,
                    time: this.end_exit / 1000,
                    timestamp: this.end_exit,
                    localtime: convertLocalTime(this.end_exit),
                }]);
                this.writeData(PRIMIUM_TYPE.EXIT);
            }
        }     
        // this.handlers?.logHandler?.log?.debug(this.ochlMap.get(this.config.coinSymbol))
    }

    private currencyInfoListener = async (currencyInfo: ICurrencyInfo | null) => {
        // this.handlers?.logHandler?.log?.debug("currencyInfoListener. ", currencyInfo);        
        this.currencyInfo = currencyInfo? _.cloneDeep(currencyInfo): null;
    }
}