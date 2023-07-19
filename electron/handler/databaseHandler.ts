import { EXCHANGE } from "../../constants/enum";
import { IPC_CMD } from "../../constants/ipcCmd";
import ExchangeAccountInfoDBApi from "../../db/api/ExchangeAccountInfoDBApi";
import JobWokerDBApi from "../../db/api/JobWokerDBApi";
import TradeJobInfoDBApi from "../../db/api/TradeJobInfoDBApi";
import { ExchangeAccountInfo } from "../../db/schemas/ExchangeAccountInfo";
import { IUserInfo } from "../../interface/IUserInfo";
import Handlers from "./Handlers";

export interface IReqExchageAccountInfo {
    email?: string | undefined;
    exchange?: EXCHANGE | undefined;
    id?: string | undefined;
}

export default class DatabaseHandler {
    handlers: Handlers | undefined;
    exchangeAccountInfoDBApi: ExchangeAccountInfoDBApi | undefined;
    jobworkerDBApi: JobWokerDBApi | undefined | null;
    tradeJobInfoDBApi: TradeJobInfoDBApi | undefined | null;
    interval: NodeJS.Timer | undefined;
    userInfo: IUserInfo | undefined | null;
    
    constructor(handlers: Handlers) {
        handlers.logHandler?.log.info(`create DatabaseHandler.`);
        this.handlers = handlers;
    }

    public initialize = async () => {
        return new Promise((resolve: any, reject: any) => {
            this.exchangeAccountInfoDBApi = new ExchangeAccountInfoDBApi(this.handlers, () => { this.handlers?.logHandler?.log?.info("create ExchangeAccountInfoDBApi done.") });
            this.jobworkerDBApi = new JobWokerDBApi(this.handlers, () => {this.handlers?.logHandler?.log?.info("create JobWokerDBApi done.") });
            this.tradeJobInfoDBApi = new TradeJobInfoDBApi(this.handlers, () => { this.handlers?.logHandler?.log?.info("create TradeJobInfoDBApi done.") });
            this.interval = setInterval(() => {
                if (this.exchangeAccountInfoDBApi?.isOnLoaded === true && this.jobworkerDBApi?.isOnLoaded === true) {
                    if (this.interval) { clearInterval(this.interval); }
                    this.registerIPCLister();
                    this.handlers?.logHandler?.log?.info("DatabaseHandler initialize done")
                    resolve();
                }
            }, 10);
        })
    }

    public setUserInfo = (userInfo: IUserInfo | null) => {
        this.userInfo = userInfo? {...userInfo}: null;
    }
    
    private registerIPCLister = () => {
        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.STORE_GET_EXCHANGE_ACCOUNT_INFOS, async (evt, req: IReqExchageAccountInfo) => {
            this.handlers?.logHandler?.log?.info("[IPC][STORE_GET_EXCHANGE_ACCOUNT_INFOS]")
            if (!this.userInfo?.uid) {
                this.handlers?.logHandler?.log?.error("uid is null. skip STORE_GET_EXCHANGE_ACCOUNT_INFOS");
                return;
            }
            let ret = await this.exchangeAccountInfoDBApi?.getExchangeAccountInfos(req, this.userInfo?.uid);
            evt.reply(IPC_CMD.NOTIFY_EXCHANGE_ACCOUNT_INFOS, ret);
        });

        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.STORE_ADD_EXCHANGE_ACCOUNT_INFOS, async (evt, exchangeAccountInfos: ExchangeAccountInfo[]) => {
            this.handlers?.logHandler?.log?.info("[IPC][STORE_ADD_EXCHANGE_ACCOUNT_INFOS]")
            if (!this.userInfo?.uid) {
                this.handlers?.logHandler?.log?.error("uid is null. skip STORE_ADD_EXCHANGE_ACCOUNT_INFOS");
                return;
            }
            let ret = await this.exchangeAccountInfoDBApi?.addExchangeAccountInfos(exchangeAccountInfos, this.userInfo?.uid);
            evt.reply(IPC_CMD.STORE_ADD_EXCHANGE_ACCOUNT_INFOS, ret);
            evt.reply(IPC_CMD.NOTIFY_EXCHANGE_ACCOUNT_INFOS, await this.exchangeAccountInfoDBApi?.getExchangeAccountInfos({email: this.userInfo?.email}, this.userInfo.uid));
        });

        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.STORE_UPDATE_EXCHANGE_ACCOUNT_INFOS, async (evt, exchangeAccountInfos: ExchangeAccountInfo[]) => {
            this.handlers?.logHandler?.log?.info("[IPC][STORE_UPDATE_EXCHANGE_ACCOUNT_INFOS]")
            if (!this.userInfo?.uid) {
                this.handlers?.logHandler?.log?.error("uid is null. skip STORE_UPDATE_EXCHANGE_ACCOUNT_INFOS");
                return;
            }
            let ret = await this.exchangeAccountInfoDBApi?.updateExchangeAccountInfos(exchangeAccountInfos, this.userInfo?.uid);
            evt.reply(IPC_CMD.STORE_UPDATE_EXCHANGE_ACCOUNT_INFOS, ret);
            evt.reply(IPC_CMD.NOTIFY_EXCHANGE_ACCOUNT_INFOS, await this.exchangeAccountInfoDBApi?.getExchangeAccountInfos({email: this.userInfo?.email}, this.userInfo?.uid));
        });

        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.STORE_DELETE_EXCHANGE_ACCOUNT_INFOS, async (evt, ids: string[]) => {
            this.handlers?.logHandler?.log?.info("[IPC][STORE_DELETE_EXCHANGE_ACCOUNT_INFOS]")
            if (!this.userInfo?.uid) {
                this.handlers?.logHandler?.log?.error("uid is null. skip STORE_DELETE_EXCHANGE_ACCOUNT_INFOS");
                return;
            }
            let ret = await this.exchangeAccountInfoDBApi?.deleteExchangeAccountInfos(ids);
            evt.reply(IPC_CMD.STORE_DELETE_EXCHANGE_ACCOUNT_INFOS, ret);
            evt.reply(IPC_CMD.NOTIFY_EXCHANGE_ACCOUNT_INFOS, await this.exchangeAccountInfoDBApi?.getExchangeAccountInfos({email: this.userInfo?.email}, this.userInfo?.uid));
        });

        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.STORE_DELETE_ALL_EXCHANGE_ACCOUNT_INFOS, async (evt, userId: string) => {
            this.handlers?.logHandler?.log?.info("[IPC][STORE_DELETE_ALL_EXCHANGE_ACCOUNT_INFOS]")
            let ret = await this.exchangeAccountInfoDBApi?.deleteAllExchangeAccountInfo(userId);
            evt.reply(IPC_CMD.STORE_DELETE_ALL_EXCHANGE_ACCOUNT_INFOS, ret);
            if (this.userInfo?.uid) {
                evt.reply(IPC_CMD.NOTIFY_EXCHANGE_ACCOUNT_INFOS, await this.exchangeAccountInfoDBApi?.getExchangeAccountInfos({email: this.userInfo?.email}, this.userInfo?.uid));
            }
        });

        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.STORE_GET_EXCHANGE_ACCOUNT_INFOS, async (evt, req: IReqExchageAccountInfo) => {
            this.handlers?.logHandler?.log?.info("[IPC][STORE_GET_EXCHANGE_ACCOUNT_INFOS]")
            if (!this.userInfo?.uid) {
                this.handlers?.logHandler?.log?.error("uid is null. skip STORE_GET_EXCHANGE_ACCOUNT_INFOS");
                return;
            }
            let ret = await this.exchangeAccountInfoDBApi?.getExchangeAccountInfos(req, this.userInfo?.uid);
            evt.reply(IPC_CMD.NOTIFY_EXCHANGE_ACCOUNT_INFOS, ret);
        });
    }
}