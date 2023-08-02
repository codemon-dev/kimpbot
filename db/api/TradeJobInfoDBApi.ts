import Nedb from "nedb"
import { getDBFilePath } from "../../util/databaseUtil"
import { IJobWorker, ITradeJobInfo } from "../../interface/ITradeInfo";
import Handlers from "../../electron/handler/Handlers";

const databaseName: string = "trade_info.db"

export default class TradeJobInfoDBApi {
    public db: Nedb | undefined;    
    public isOnLoaded: boolean = false;
    public handlers: Handlers | undefined;
    constructor(handlers: Handlers | undefined, _onload: any) {
        this.handlers = handlers;
        const filename = getDBFilePath(databaseName)
        handlers?.logHandler?.log?.error(`TradeJobInfoDBApi filename ${filename}`);
        const option: Nedb.DataStoreOptions = {
            filename: filename,
            autoload: true,
            timestampData: true,
            onload: (err) => {
                _onload(err);
                if (err) {
                    handlers?.logHandler?.log?.error(`Fail to load ${databaseName}. err: ${err}`);
                    this.db = undefined;
                    this.isOnLoaded = false;
                } else {
                    handlers?.logHandler?.log?.info(`success to load ${databaseName}.`);
                    this.isOnLoaded = true;
                    //this.db?.ensureIndex({ fieldName: 'userId', unique: true})
                }
            }
        }
        this.db = new Nedb(option)
    }

    public addTradeJobInfo = async (tradeJobInfo: ITradeJobInfo): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.handlers?.logHandler?.log?.info(`addTradeJobInfo. jobWrokerId: ${tradeJobInfo.jobWrokerId}, targetEnterPrimium:${tradeJobInfo.targetEnterPrimium}, targetExitPrimium: ${tradeJobInfo.targetExitPrimium}`);
            this.db?.insert(tradeJobInfo, (err, doc) => {
                if (err) { 
                    this.handlers?.logHandler?.log?.error(`fail to addTradeJobInfo. err: ${err}`)
                    reject(null);
                } else {
                    resolve(doc);
                }
            });
        })
    }

    public deleteTradeJobInfo = async (id: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.handlers?.logHandler?.log?.info(`deleteTradeJobInfo. id:${id}`);
            this.db?.remove({_id: id}, (err, doc) => {
                if (err) { 
                    this.handlers?.logHandler?.log?.error(`fail to deleteTradeJobInfo. err: ${err}`)
                    reject(null);
                } else {
                    resolve(doc);
                }
            });
        })
    }

    public updateTradeJobInfo = async (tradeJobInfo: ITradeJobInfo): Promise<any> => {
        let options: Nedb.UpdateOptions = {
            multi: false,
            upsert: true,
            returnUpdatedDocs: true
        }   
        if (!tradeJobInfo._id) {
            this.handlers?.logHandler?.log?.error("id is null. skip updateTradeJobInfo.");
            return null;
        }
        return new Promise((resolve, reject) => {
            this.handlers?.logHandler?.log?.info(`updateTradeJobInfo. id:${tradeJobInfo._id}}`);
            this.db?.update(
                { _id: tradeJobInfo._id }, 
                tradeJobInfo,
                options,
                (err: Error | null, numberOfUpdated: number, affectedDocuments: any, upsert: boolean) => {
                    if (err) { 
                        this.handlers?.logHandler?.log?.error(`fail to updateTradeJobInfo. err: ${err}`)
                        reject(null);
                    } else {
                        this.handlers?.logHandler?.log?.info(`success updateTradeJobInfo. numberOfUpdated: ${numberOfUpdated}, upsert: ${upsert}`)
                        resolve(affectedDocuments);
                    }
                }
            );
        })
    }

    public getTradeJobInfosByJobWorkerId = async (jobWorkerId: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.db?.find({jobWrokerId: jobWorkerId}, (err: any, docs: ITradeJobInfo[]) => {
                this.getTradeJobInfosCallback(err, docs, resolve, reject);
            })
        })
    }

    public getTradeJobInfos = async (userUID: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.db?.find({userUID: userUID}, (err: any, docs: ITradeJobInfo[]) => {
                this.getTradeJobInfosCallback(err, docs, resolve, reject);
            })
        })
    }

    private getTradeJobInfosCallback = (err: any, docs: ITradeJobInfo[], resolve: any, reject: any) => {
        if (err) {
            this.handlers?.logHandler?.log?.error(`Fail to getTradeJobInfosCallback. err: ${err}`);
            reject(null);
        };
        if (docs) {
            // docs.forEach(doc => {
            //     this.handlers?.logHandler?.log?.info(doc);
            // });
            resolve(docs);
            return;
        }
        resolve([]);
    }
}