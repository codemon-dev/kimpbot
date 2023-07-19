import { IpcMainEvent } from "electron";
import { IPC_CMD } from "../../constants/ipcCmd";
import Handlers from "./Handlers";
import { CoinInfo, IMarketInfo, IReqMarketInfo } from "../../interface/IMarketInfo";
import { ICurrencyInfo, ICurrencyInfos } from "../../interface/ICurrency";
import _ from "lodash";
import { COIN_PAIR } from "../../constants/enum";
export default class marketInfoHandler {
    private handlers: Handlers | undefined;
    private interval: any = null;
    public marketInfo: IMarketInfo = {
        currencyInfos: {},
        coinInfos: {}
    };
    constructor(handlers: Handlers) {
        handlers.logHandler?.log?.info(`create marketInfoHandler`)
        this.handlers = handlers;
    }

    private monitorOnOff = (onOff:boolean) => {
        if (onOff === true) {
            if (this.interval !== null) {
                this.handlers?.logHandler?.log?.info("marketInfoHandler monitor already on. skip set setMonitorOnOff. onOff: ", onOff);
            }
            this.checkAllData();
            this.interval = setInterval(() =>{
                this.checkAllData();
            }, 1000)
        } else {
            if (this.interval === null) {
                this.handlers?.logHandler?.log?.info("marketInfoHandler monitor already off. skip set setMonitorOnOff. onOff: ", onOff);
            }
            clearInterval(this.interval);
            this.interval  = null;
        }
    }

    private checkAllData = () => {
        if (this.handlers?.binanceHandler?.coinInfos[COIN_PAIR.BTCUSDT]) {
            // this.marketInfo.exchangeRateInfo = 
            this.marketInfo.coinInfos[COIN_PAIR.BTCUSDT] = _.cloneDeep(this.handlers?.binanceHandler?.coinInfos[COIN_PAIR.BTCUSDT])
        }
        if (this.handlers?.binanceHandler?.coinInfos[COIN_PAIR.ETHUSDT]) {
            // this.marketInfo.exchangeRateInfo = 
            this.marketInfo.coinInfos[COIN_PAIR.ETHUSDT] = _.cloneDeep(this.handlers?.binanceHandler?.coinInfos[COIN_PAIR.ETHUSDT])
        }
        if (this.handlers?.upbitHandler?.coinInfos[COIN_PAIR.BTCKRW]) {
            // this.marketInfo.exchangeRateInfo = 
            this.marketInfo.coinInfos[COIN_PAIR.BTCKRW] = _.cloneDeep(this.handlers?.upbitHandler?.coinInfos[COIN_PAIR.BTCKRW])
        }
        if (this.handlers?.upbitHandler?.coinInfos[COIN_PAIR.ETHKRW]) {
            // this.marketInfo.exchangeRateInfo = 
            this.marketInfo.coinInfos[COIN_PAIR.ETHKRW] = _.cloneDeep(this.handlers?.upbitHandler?.coinInfos[COIN_PAIR.ETHKRW])
        }
        if (this.handlers?.currencyHandler?.currencyInfos) {
            this.marketInfo.currencyInfos = _.cloneDeep(this.handlers?.currencyHandler?.currencyInfos);
        }
        // this.handlers?.logHandler?.log?.debug(this.marketInfo);
        this.handlers?.ipcHandler?.sendMessage(IPC_CMD.NOTIFY_MARKET_INFO, this.marketInfo);
    }

    public registerIPCListeners = () => {
        if (!this.handlers?.ipcHandler) {
            this.handlers?.logHandler?.log?.error(`handlers?.ipcHandler is null. skip registerIPCListeners.`);
            return;
        }
        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.REQUEST_MARKET_INFO, async (evt: IpcMainEvent, req: IReqMarketInfo) => {
            this.handlers?.logHandler?.log?.info(`[IPC][REQUEST_MARKET_INFO] req: `, req)
            this.monitorOnOff(req.onOff);
            evt.reply(IPC_CMD.NOTIFY_MARKET_INFO, this.marketInfo);
        });
    }

    public updateMarketInfo = (currencyInfos?: ICurrencyInfos, coinInfo?: CoinInfo) => {
        // this.handlers?.logHandler?.log?.info("updateMarketInfo")
        if (!this.marketInfo) {
            return; 
        } 
        if (currencyInfos) {
            this.marketInfo.currencyInfos = _.cloneDeep(currencyInfos);
        }
        if (coinInfo) {
            this.marketInfo.coinInfos[`${coinInfo?.exchange}_${coinInfo?.symbol}`] = {...coinInfo};
        }
    }
}