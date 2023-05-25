import { EXCHANGE } from "../../constants/enum";
import { IPC_CMD } from "../../constants/ipcCmd";
import ExchangeAccountInfoDBApi from "../../db/api/ExchangeAccountInfoDBApi";
import { ExchangeAccountInfo } from "../../db/schemas/ExchangeAccountInfo";
import Handlers from "./Handlers";

export interface IReqExchageAccountInfo {
    userId?: string | undefined;
    exchange?: EXCHANGE | undefined;
    ids?: string[] | undefined;
}

export default class DatabaseHandler {
    handlers: Handlers | undefined;
    exchangeAccountInfoDBApi: ExchangeAccountInfoDBApi | undefined;
    interval: NodeJS.Timer | undefined;
    
    constructor(handlers: Handlers) {
        this.handlers = handlers;
        console.log(`create DatabaseHandler.`);
    }

    public initialize = async () => {
        return new Promise((resolve: any, reject: any) => {
            this.exchangeAccountInfoDBApi = new ExchangeAccountInfoDBApi(() => { console.log("create ExchangeAccountInfoDBApi done.") });
            this.interval = setInterval(() => {
                if (this.exchangeAccountInfoDBApi?.isOnLoaded === true) {
                    if (this.interval) { clearInterval(this.interval); }
                    this.registerIPCLister();
                    console.log("DatabaseHandler initialize done")
                    resolve();
                }
            }, 10);
        })
    }

    
    private registerIPCLister = () => {
        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.STORE_GET_EXCHANGE_ACCOUNT_INFOS, async (evt, req: IReqExchageAccountInfo) => {
            console.log("[IPC][STORE_GET_EXCHANGE_ACCOUNT_INFOS]")
            let ret = await this.exchangeAccountInfoDBApi?.getExchangeAccountInfos(req);
            evt.reply(IPC_CMD.STORE_GET_EXCHANGE_ACCOUNT_INFOS, ret);
        });

        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.STORE_ADD_EXCHANGE_ACCOUNT_INFOS, async (evt, exchangeAccountInfos: ExchangeAccountInfo[]) => {
            console.log("[IPC][STORE_ADD_EXCHANGE_ACCOUNT_INFOS]")
            let ret = await this.exchangeAccountInfoDBApi?.addExchangeAccountInfos(exchangeAccountInfos);
            evt.reply(IPC_CMD.STORE_ADD_EXCHANGE_ACCOUNT_INFOS, ret);
            evt.reply(IPC_CMD.STORE_GET_EXCHANGE_ACCOUNT_INFOS, await this.exchangeAccountInfoDBApi?.getExchangeAccountInfos({userId: exchangeAccountInfos[0].userId}));
        });

        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.STORE_UPDATE_EXCHANGE_ACCOUNT_INFOS, async (evt, exchangeAccountInfos: ExchangeAccountInfo[]) => {
            console.log("[IPC][STORE_UPDATE_EXCHANGE_ACCOUNT_INFOS]")
            let ret = await this.exchangeAccountInfoDBApi?.updateExchangeAccountInfos(exchangeAccountInfos);
            evt.reply(IPC_CMD.STORE_UPDATE_EXCHANGE_ACCOUNT_INFOS, ret);
            evt.reply(IPC_CMD.STORE_GET_EXCHANGE_ACCOUNT_INFOS, await this.exchangeAccountInfoDBApi?.getExchangeAccountInfos({userId: exchangeAccountInfos[0].userId}));
        });

        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.STORE_DELETE_EXCHANGE_ACCOUNT_INFOS, async (evt, req: IReqExchageAccountInfo) => {
            console.log("[IPC][STORE_DELETE_EXCHANGE_ACCOUNT_INFOS]")
            let ret = await this.exchangeAccountInfoDBApi?.deleteExchangeAccountInfos(req.ids);
            evt.reply(IPC_CMD.STORE_DELETE_EXCHANGE_ACCOUNT_INFOS, ret);
            evt.reply(IPC_CMD.STORE_GET_EXCHANGE_ACCOUNT_INFOS, await this.exchangeAccountInfoDBApi?.getExchangeAccountInfos(req));
        });

        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.STORE_DELETE_ALL_EXCHANGE_ACCOUNT_INFOS, async (evt, userId: string) => {
            console.log("[IPC][STORE_DELETE_ALL_EXCHANGE_ACCOUNT_INFOS]")
            let ret = await this.exchangeAccountInfoDBApi?.deleteAllExchangeAccountInfo(userId);
            evt.reply(IPC_CMD.STORE_DELETE_ALL_EXCHANGE_ACCOUNT_INFOS, ret);
            evt.reply(IPC_CMD.STORE_GET_EXCHANGE_ACCOUNT_INFOS, []);
        });
    }
}