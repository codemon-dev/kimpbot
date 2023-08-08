import Nedb from "nedb"
import { getDBFilePath } from "../../util/databaseUtil"
import { IJobWorker } from "../../interface/ITradeInfo";
import Handlers from "../../electron/handler/Handlers";

const databaseName: string = "job_worker.db"

export default class JobWokerDBApi {
    public db: Nedb | undefined;    
    public isOnLoaded: boolean = false;
    public handlers: Handlers | undefined;
    constructor(handlers: Handlers | undefined, _onload: any) {
        this.handlers = handlers;
        const filename = getDBFilePath(databaseName)
        handlers?.logHandler?.log?.info(`JobWokerDBApi filename ${filename}`);
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

    public addJobWorker = async (jobWoker: IJobWorker): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.handlers?.logHandler?.log?.info(`addJobWorker. jobType:${jobWoker.jobType}, enterTargetPrimium:${jobWoker.enterTargetPrimium}, exitTargetPrimium: ${jobWoker.exitTargetPrimium}`);
            this.db?.insert(jobWoker, (err, doc) => {
                if (err) { 
                    this.handlers?.logHandler?.log?.error(`fail to addJobWorker. err: ${err}`)
                    reject(null);
                } else {
                    resolve(doc);
                }
            });
        })
    }

    public deleteJobWorker = async (id: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.handlers?.logHandler?.log?.info(`deleteJobWorker. id:${id}`);
            this.db?.remove({_id: id}, (err, doc) => {
                if (err) { 
                    this.handlers?.logHandler?.log?.error(`fail to deleteJobWorker. err: ${err}`)
                    reject(null);
                } else {
                    resolve(doc);
                }
            });
        })
    }

    public updateJobWorker = async (jobWoker: IJobWorker): Promise<any> => {
        let options: Nedb.UpdateOptions = {
            multi: false,
            upsert: true,
            returnUpdatedDocs: true
        }   
        if (!jobWoker._id) {
            this.handlers?.logHandler?.log?.error("id is null. skip updateExchangeAccountInfo.");
            return null;
        }
        return new Promise((resolve, reject) => {
            this.handlers?.logHandler?.log?.info(`updateJobWorker. jobWoker: `, jobWoker);
            this.db?.update(
                { _id: jobWoker._id }, 
                jobWoker,
                options,
                (err: Error | null, numberOfUpdated: number, affectedDocuments: any, upsert: boolean) => {
                    if (err) { 
                        this.handlers?.logHandler?.log?.error(`fail to updateJobWorker. err: ${err}`)
                        reject(null);
                    } else {
                        this.handlers?.logHandler?.log?.info(`success updateJobWorker. numberOfUpdated: ${numberOfUpdated}, upsert: ${upsert}`)
                        resolve(affectedDocuments);
                    }
                }
            );
        })
    }

    public getJobWorkerById = async (id: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.db?.find({_id: id}, (err: any, docs: IJobWorker[]) => {
                this.getJobWorksCallback(err, docs, resolve, reject);
            })
        })
    }

    public getJobWorkers = async (userUID: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.db?.find({userUID: userUID}, (err: any, docs: IJobWorker[]) => {
                this.getJobWorksCallback(err, docs, resolve, reject);
            })
        })
    }

    private getJobWorksCallback = (err: any, docs: IJobWorker[], resolve: any, reject: any) => {
        if (err) {
            this.handlers?.logHandler?.log?.error(`Fail to getJobWorksCallback. err: ${err}`);
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