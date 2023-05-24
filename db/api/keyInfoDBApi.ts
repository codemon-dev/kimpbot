import Nedb from "nedb"
import { EXCHANGE } from "../../constants/enum";
import { getDBFilePath } from "./../../util/databaseUtil"
import { KeyInfo } from "../schemas/keyInfo";

const databaseName: string = "keyInfo.db"

export default class KeyInfoDBApi {
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
                    console.log(`Fail to load keyInfo database. err: ${err}`);
                    this.db = undefined;
                    this.isOnLoaded = false;
                } else {
                    console.log(`success to load. databaseName: ${databaseName}.`);
                    this.isOnLoaded = true;
                    this.db?.ensureIndex({ fieldName: 'exchange', unique: true})
                }
            }
        }
        this.db = new Nedb(option)
    }

    private getKeyInfoCallback = (err: any, docs: [KeyInfo], resolve: any, reject: any) => {
        if (err) {
            console.log(`Fail to GetKeyInfo. err: ${err}`);
            reject(err);
        };
        if (docs) {
            docs.forEach(doc => {
                console.log(doc);
            });
            resolve(docs)
        }
        resolve([]);
    }

    public addKeyInfo = async (keyInfo: KeyInfo): Promise<any> => {
        return new Promise((resolve, reject) => {
            console.log(`AddKeyInfo. exchange: ${keyInfo.exchange}`);
            this.db?.insert(keyInfo, (err, doc) => {
                if (err) { 
                    console.error(`fail to AddKeyInfo. err: ${keyInfo}`)
                    reject(err);
                } else {
                    resolve(doc);
                }
            });
        })
    }

    public updateKyeInfos = async (userId: string, keyInfos: KeyInfo[]): Promise<any> => {
        let promises: any = []
        keyInfos?.forEach((keyInfo: KeyInfo) => {
            promises.push(this.updateKyeInfo(userId, keyInfo))
        })
        return await Promise.all(promises);
    }

    public updateKyeInfo = async (userId: string, keyInfo: KeyInfo): Promise<any> => {
        let options: Nedb.UpdateOptions = {
            multi: false,
            upsert: true,
            returnUpdatedDocs: true
        }
        return new Promise((resolve, reject) => {
            console.log(`updateKyeInfo. userId:${userId}, exchange: ${keyInfo.exchange}}`);    
            this.db?.update(
                { userId, exchage: keyInfo.exchange }, 
                keyInfo,
                options,
                (err: Error | null, numberOfUpdated: number, affectedDocuments: any, upsert: boolean) => {
                    if (err) { 
                        console.error(`fail to AddKeyInfo. err: ${err}`)
                        reject(err);
                    } else {
                        console.log(`success updateKyeInfo. numberOfUpdated: ${numberOfUpdated}, upsert: ${upsert}`)
                        resolve(affectedDocuments);
                    }
                }
            );
        })
    }

    public getKeyInfo = async (userId: string, exchange?: EXCHANGE | null): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (exchange) {
                this.db?.find({userId, exchange}, (err: any, docs: [KeyInfo]) => {
                    this.getKeyInfoCallback(err, docs, resolve, reject);
                })
            } else {
                this.db?.find({userId}, (err: any, docs: [KeyInfo]) => {
                    this.getKeyInfoCallback(err, docs, resolve, reject);
                })
            }
        })
    }
}