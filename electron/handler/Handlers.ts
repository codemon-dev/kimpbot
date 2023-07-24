import CurrencyHandler from "./currencyHandler";
import DatabaseHandler from "./databaseHandler";
import BinanceHander from "./binanceHandler";
import IPCHandler from "./ipcHandler";
import StoreHander from "./storeHandler";
import marketInfoHandler from "./marketInfoHandler";
import UpbitHandler from "./upbitHandler";
import jobWorkerHandler from "./jobWorkerHandler";
import primiumHandler from "./primiumHandler";
import LogHandler from "./logHandler";
import LockHandler from "./lockHandler";

export default class Handlers {
    public logHandler: LogHandler = new LogHandler(this);
    public lockHandler: LockHandler | undefined;    
    public currencyHandler: CurrencyHandler | undefined;
    public ipcHandler: IPCHandler | undefined;
    public databaseHandler: DatabaseHandler | undefined;
    public storeHandler: StoreHander | undefined;
    public binanceHandler: BinanceHander | undefined;
    public upbitHandler: UpbitHandler | undefined;
    public marketInfoHandler: marketInfoHandler | undefined;
    public jobWorkerHandler: jobWorkerHandler | undefined;
    public primiumHandler: primiumHandler | undefined;    
    constructor() {
        this.logHandler.log.info(`create Handlers.`);
    }

    public initialize = () => {
        this.lockHandler = new LockHandler(this);
        this.storeHandler = new StoreHander(this);
        this.databaseHandler = new DatabaseHandler(this);
        this.currencyHandler = new CurrencyHandler(this);
        this.upbitHandler = new UpbitHandler(this);
        this.binanceHandler = new BinanceHander(this);
        this.marketInfoHandler = new marketInfoHandler(this);
        this.jobWorkerHandler = new jobWorkerHandler(this);
        this.primiumHandler = new primiumHandler(this);
        this.ipcHandler = new IPCHandler(this);        
    }
}