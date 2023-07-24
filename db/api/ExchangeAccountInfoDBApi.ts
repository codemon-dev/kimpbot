import Nedb from "nedb"
import { EXCHANGE } from "../../constants/enum";
import { decrypt, encrypt, getDBFilePath } from "../../util/databaseUtil"
import { ExchangeAccountInfo } from "../schemas/ExchangeAccountInfo";
import { IReqExchageAccountInfo } from "../../electron/handler/databaseHandler";
import Handlers from "../../electron/handler/Handlers";


const databaseName: string = "exchange_account_info.db"

export default class ExchangeAccountInfoDBApi {
    public db: Nedb | undefined;    
    public isOnLoaded: boolean = false;
    public handlers: Handlers | undefined;
    constructor(handlers: Handlers | undefined, _onload: any) {
        handlers = handlers;
        const filename = getDBFilePath(databaseName)
        handlers?.logHandler?.log?.error(`ExchangeAccountInfoDBApi filename ${filename}`);
        const option: Nedb.DataStoreOptions = {
            filename: filename,
            autoload: true,
            timestampData: true,
            onload: (err) => {
                _onload(err);
                if (err) {
                    handlers?.logHandler?.log?.error(`Fail to load ${databaseName}. err: ${err}`)
                    this.db = undefined;
                    this.isOnLoaded = false;
                } else {
                    handlers?.logHandler?.log?.info(`success to load ${databaseName}.`)
                    this.isOnLoaded = true;
                    //this.db?.ensureIndex({ fieldName: 'userId', unique: true})
                }
            }
        }
        this.db = new Nedb(option)
    }

    private encryptExchangeAccountInfos = (accoutInfos: ExchangeAccountInfo[], key: string) => {
        let ret: ExchangeAccountInfo[] = [];
        accoutInfos.forEach((info:ExchangeAccountInfo) => {
            info.apiKey = encrypt(info.apiKey, key);
            info.secretKey = encrypt(info.secretKey, key);
            ret.push({...info})
        })
        return ret;
    }

    private decryptExchangeAccountInfos = (accoutInfos: ExchangeAccountInfo[], key: string ) => {
        let ret: ExchangeAccountInfo[] = [];
        accoutInfos.forEach((info:ExchangeAccountInfo) => {
            info.apiKey = decrypt(info.apiKey) ?? "";
            info.secretKey = decrypt(info.secretKey)?? "";
            ret.push({...info})
        })
        return ret;
    }

    private getExchangeAccountInfosCallback = (err: any, docs: ExchangeAccountInfo[], key: string, resolve: any, reject: any) => {
        if (err) {
            this.handlers?.logHandler?.log?.error(`Fail to getExchangeAccountInfosCallback. err: ${err}`);
            reject(null);
        };
        if (docs) {
            // docs.forEach(doc => {
            //     this.handlers?.logHandler?.log?.info(doc);
            // });
            resolve(this.decryptExchangeAccountInfos(docs, key));
            return;
        }
        resolve([]);
    }

    public addExchangeAccountInfos = async (exchangeAccountInfos: ExchangeAccountInfo[], key: string): Promise<any> => {
        let promises: any = []
        exchangeAccountInfos?.forEach((info: ExchangeAccountInfo) => {
            promises.push(this.addExchangeAccountInfo(info, key))
        })
        return await Promise.all(promises);
    }

    public addExchangeAccountInfo = async (exchangeAccountInfo: ExchangeAccountInfo, key: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.handlers?.logHandler?.log?.info(`addExchangeAccountInfo. exchange: ${exchangeAccountInfo.exchange}`);
            this.db?.insert(this.encryptExchangeAccountInfos([exchangeAccountInfo], key)[0], (err, doc) => {
                if (err) { 
                    this.handlers?.logHandler?.log?.error(`fail to addExchangeAccountInfo. err: ${err}`)
                    reject(null);
                } else {
                    resolve(doc);
                }
            });
        })
    }

    public deleteAllExchangeAccountInfo = async (userId: string): Promise<any> => {
        return new Promise((resolve: any, reject: any) => {
            this.handlers?.logHandler?.log?.info(`deleteExchangeAccdeleteAllExchangeAccountInfoountInfo. userId: ${userId}}`);    
            this.db?.remove({userId}, (err: Error | null) => {
                if (err) {
                    this.handlers?.logHandler?.log?.error(`fail to deleteAllExchangeAccountInfo. err: ${err}`)
                    reject(null);
                }
                this.handlers?.logHandler?.log?.info(`success deleteAllExchangeAccountInfo. id: ${userId}`)
                resolve(userId);
            })
        })
    }

    public deleteExchangeAccountInfos = async (ids: string[] | undefined): Promise<any> => {
        let promises: any = []
        if (!ids) {
            this.handlers?.logHandler?.log?.error(`ids is null. skip STORE_DELETE_EXCHANGE_ACCOUNT_INFOS`)
            return null;
        }
        ids?.forEach((id: string) => {
            promises.push(this.deleteExchangeAccountInfo(id))
        })
        return await Promise.all(promises);
    }

    public deleteExchangeAccountInfo = async (id: string): Promise<any> =>  {
        return new Promise((resolve: any, reject: any) => {
            this.handlers?.logHandler?.log?.info(`deleteExchangeAccountInfo. id: ${id}}`);    
            this.db?.remove({_id: id}, (err: Error | null) => {
                if (err) {
                    this.handlers?.logHandler?.log?.error(`fail to deleteExchangeAccountInfo. err: ${err}`)
                    reject(null);
                }
                this.handlers?.logHandler?.log?.info(`success deleteExchangeAccountInfo. id: ${id}`)
                resolve(id);
            })
        })
    }

    public updateExchangeAccountInfos = async (ExchangeAccountInfos: ExchangeAccountInfo[], key: string): Promise<any> => {
        let promises: any = []
        ExchangeAccountInfos?.forEach((info: ExchangeAccountInfo) => {
            promises.push(this.updateExchangeAccountInfo(info, key));
        })
        return await Promise.all(promises);
    }

    public updateExchangeAccountInfo = async (exchangeAccountInfo: ExchangeAccountInfo, key: string): Promise<any> => {
        let options: Nedb.UpdateOptions = {
            multi: false,
            upsert: true,
            returnUpdatedDocs: true
        }   
        if (exchangeAccountInfo._id == null) {
            this.handlers?.logHandler?.log?.error("id is null. skip updateExchangeAccountInfo.");
            return null;
        }
        return new Promise((resolve, reject) => {
            this.handlers?.logHandler?.log?.info(`updateExchangeAccountInfo. id:${exchangeAccountInfo._id}, exchange: ${exchangeAccountInfo.exchange}}`);
            this.db?.update(
                { _id: exchangeAccountInfo._id }, 
                this.encryptExchangeAccountInfos([exchangeAccountInfo], key)[0],
                options,
                (err: Error | null, numberOfUpdated: number, affectedDocuments: any, upsert: boolean) => {
                    if (err) { 
                        this.handlers?.logHandler?.log?.error(`fail to updateExchangeAccountInfo. err: ${err}`)
                        reject(null);
                    } else {
                        this.handlers?.logHandler?.log?.info(`success updateExchangeAccountInfo. numberOfUpdated: ${numberOfUpdated}, upsert: ${upsert}`)
                        resolve(affectedDocuments);
                    }
                }
            );
        })
    }

    public getExchangeAccountInfos = async (req: IReqExchageAccountInfo, key: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (req.id) {
                this.db?.find({_id: req.id}, (err: any, docs: ExchangeAccountInfo[]) => {
                    this.getExchangeAccountInfosCallback(err, docs, key, resolve, reject);
                })
            } else {
                if (!req.email) { 
                    resolve(null);
                    return;
                };
                if (req.exchange) {
                    this.db?.find({email: req.email, exchange: req.exchange}, (err: any, docs: ExchangeAccountInfo[]) => {
                        this.getExchangeAccountInfosCallback(err, docs, key, resolve, reject);
                    })
                } else if (req.id) {
                    this.db?.find({email: req.email, _id: req.id}, (err: any, docs: ExchangeAccountInfo[]) => {
                        this.getExchangeAccountInfosCallback(err, docs, key, resolve, reject);
                    })
                } else {
                    this.db?.find({email: req.email}, (err: any, docs: ExchangeAccountInfo[]) => {
                        this.getExchangeAccountInfosCallback(err, docs, key, resolve, reject);
                    })
                }
            }
        })
    }
}