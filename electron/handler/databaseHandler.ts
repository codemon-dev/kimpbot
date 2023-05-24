import KeyInfoDBApi from "../../db/api/keyInfoDBApi";
import Handlers from "./Handlers";

export default class DatabaseHandler {
    handlers: Handlers | undefined;
    keyInfoDBApi: KeyInfoDBApi | undefined;
    interval: NodeJS.Timer | undefined;
    
    constructor(handlers: Handlers) {
        this.handlers = handlers;
        console.log(`create DatabaseHandler.`);
    }

    public initialize = async () => {
        return new Promise((resolve: any, reject: any) => {
            this.keyInfoDBApi = new KeyInfoDBApi(() => { console.log("load keyInfoDBApi done.") });
            this.interval = setInterval(() => {
                if (this.keyInfoDBApi?.isOnLoaded === true) {
                    if (this.interval) { clearInterval(this.interval); }
                    console.log("DatabaseHandler initialize done")
                    resolve();
                }
            }, 10);
        })
    }
}