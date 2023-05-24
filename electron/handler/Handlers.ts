import ExchangeRateHander from "./exchageRateHandler";
import DatabaseHandler from "./databaseHandler";
import BinanceHander from "./binanceHandler";
import IPCHandler from "./ipcHandler";

export default class Handlers {
    public exchangeRateHandler: ExchangeRateHander | undefined;
    public ipcHandler: IPCHandler | undefined;
    public databaseHandler: DatabaseHandler | undefined;
    public binanceHandler: BinanceHander | undefined;

    constructor() {
        console.log(`create IPCHHandlersandler.`);
    }

    public initialize = () => {
        this.exchangeRateHandler = new ExchangeRateHander(this);
        this.ipcHandler = new IPCHandler(this);
        this.databaseHandler = new DatabaseHandler(this);
        this.binanceHandler = new BinanceHander(this);
    }
}