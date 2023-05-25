import Nedb from "nedb"
import { EXCHANGE } from "../../constants/enum";
import { decrypt, encrypt, getDBFilePath } from "../../util/databaseUtil"
import { ExchangeAccountInfo } from "../schemas/ExchangeAccountInfo";
import { IReqExchageAccountInfo } from "../../electron/handler/databaseHandler";

const databaseName: string = "exchange_account_info.db"

export default class ExchangeAccountInfoDBApi {
    public db: Nedb | undefined;    
    public isOnLoaded: boolean = false;
    constructor(_onload: any) {
        const option: Nedb.DataStoreOptions = {
            filename: getDBFilePath(databaseName),
            autoload: true,
            timestampData: true,
            onload: (err) => {
                _onload(err);
                if (err) {
                    console.log(`Fail to load ${databaseName}. err: ${err}`);
                    this.db = undefined;
                    this.isOnLoaded = false;
                } else {
                    console.log(`success to load ${databaseName}.`);
                    this.isOnLoaded = true;
                    //this.db?.ensureIndex({ fieldName: 'userId', unique: true})
                }
            }
        }
        this.db = new Nedb(option)
    }

    private encryptExchangeAccountInfos = (accoutInfos: ExchangeAccountInfo[]) => {
        let ret: ExchangeAccountInfo[] = [];
        accoutInfos.forEach((info:ExchangeAccountInfo) => {
            info.apiKey = encrypt(info.apiKey, "");
            info.secretKey = encrypt(info.secretKey, "");
            ret.push({...info})
        })
        return ret;
    }

    private decryptExchangeAccountInfos = (accoutInfos: ExchangeAccountInfo[]) => {
        let ret: ExchangeAccountInfo[] = [];
        accoutInfos.forEach((info:ExchangeAccountInfo) => {
            info.apiKey = decrypt(info.apiKey) ?? "";
            info.secretKey = decrypt(info.secretKey)?? "";
            ret.push({...info})
        })
        return ret;
    }

    private getExchangeAccountInfosCallback = (err: any, docs: ExchangeAccountInfo[], resolve: any, reject: any) => {
        if (err) {
            console.log(`Fail to getExchangeAccountInfosCallback. err: ${err}`);
            reject(null);
        };
        if (docs) {
            docs.forEach(doc => {
                console.log(doc);
            });
            resolve(this.decryptExchangeAccountInfos(docs));
        }
        resolve([]);
    }

    public addExchangeAccountInfos = async (exchangeAccountInfos: ExchangeAccountInfo[]): Promise<any> => {
        let promises: any = []
        exchangeAccountInfos?.forEach((info: ExchangeAccountInfo) => {
            promises.push(this.addExchangeAccountInfo(info))
        })
        return await Promise.all(promises);
    }

    public addExchangeAccountInfo = async (exchangeAccountInfo: ExchangeAccountInfo): Promise<any> => {
        return new Promise((resolve, reject) => {
            console.log(`addExchangeAccountInfo. exchange: ${exchangeAccountInfo.exchange}`);
            this.db?.insert(this.encryptExchangeAccountInfos([exchangeAccountInfo])[0], (err, doc) => {
                if (err) { 
                    console.error(`fail to addExchangeAccountInfo. err: ${err}`)
                    reject(null);
                } else {
                    resolve(doc);
                }
            });
        })
    }

    public deleteAllExchangeAccountInfo = async (userId: string): Promise<any> => {
        return new Promise((resolve: any, reject: any) => {
            console.log(`deleteExchangeAccdeleteAllExchangeAccountInfoountInfo. userId: ${userId}}`);    
            this.db?.remove({userId}, (err: Error | null) => {
                if (err) {
                    console.error(`fail to deleteAllExchangeAccountInfo. err: ${err}`)
                    reject(null);
                }
                console.log(`success deleteAllExchangeAccountInfo. id: ${userId}`)
                resolve(userId);
            })
        })
    }

    public deleteExchangeAccountInfos = async (ids: string[] | undefined): Promise<any> => {
        let promises: any = []
        if (!ids) {
            console.error(`ids is null. skip STORE_DELETE_EXCHANGE_ACCOUNT_INFOS`)
            return null;
        }
        ids?.forEach((id: string) => {
            promises.push(this.deleteExchangeAccountInfo(id))
        })
        return await Promise.all(promises);
    }

    public deleteExchangeAccountInfo = async (id: string): Promise<any> =>  {
        return new Promise((resolve: any, reject: any) => {
            console.log(`deleteExchangeAccountInfo. id: ${id}}`);    
            this.db?.remove({_id: id}, (err: Error | null) => {
                if (err) {
                    console.error(`fail to deleteExchangeAccountInfo. err: ${err}`)
                    reject(null);
                }
                console.log(`success deleteExchangeAccountInfo. id: ${id}`)
                resolve(id);
            })
        })
    }

    public updateExchangeAccountInfos = async (ExchangeAccountInfos: ExchangeAccountInfo[]): Promise<any> => {
        let promises: any = []
        ExchangeAccountInfos?.forEach((info: ExchangeAccountInfo) => {
            promises.push(this.updateExchangeAccountInfo(info));
        })
        return await Promise.all(promises);
    }

    public updateExchangeAccountInfo = async (exchangeAccountInfo: ExchangeAccountInfo): Promise<any> => {
        let options: Nedb.UpdateOptions = {
            multi: false,
            upsert: true,
            returnUpdatedDocs: true
        }   
        if (exchangeAccountInfo._id == null) {
            console.error("id is null. skip updateExchangeAccountInfo.");
            return null;
        }
        return new Promise((resolve, reject) => {
            console.log(`updateExchangeAccountInfo. id:${exchangeAccountInfo._id}, exchange: ${exchangeAccountInfo.exchange}}`);
            this.db?.update(
                { _id: exchangeAccountInfo._id }, 
                this.encryptExchangeAccountInfos([exchangeAccountInfo])[0],
                options,
                (err: Error | null, numberOfUpdated: number, affectedDocuments: any, upsert: boolean) => {
                    if (err) { 
                        console.error(`fail to updateExchangeAccountInfo. err: ${err}`)
                        reject(null);
                    } else {
                        console.log(`success updateExchangeAccountInfo. numberOfUpdated: ${numberOfUpdated}, upsert: ${upsert}`)
                        resolve(affectedDocuments);
                    }
                }
            );
        })
    }

    public getExchangeAccountInfos = async (req: IReqExchageAccountInfo): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (!req.userId) { resolve(null) };
            if (req.exchange) {
                this.db?.find({userId: req.userId, exchange: req.exchange}, (err: any, docs: ExchangeAccountInfo[]) => {
                    this.getExchangeAccountInfosCallback(err, docs, resolve, reject);
                })
            } else {
                this.db?.find({userId: req.userId}, (err: any, docs: ExchangeAccountInfo[]) => {
                    this.getExchangeAccountInfosCallback(err, docs, resolve, reject);
                })
            }
        })
    }
}