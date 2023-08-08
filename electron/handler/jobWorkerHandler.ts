import _, { forEach } from "lodash";

import Handlers from "./Handlers";
import { CoinInfos, IAssetInfo } from "../../interface/IMarketInfo";
import { COMPLETE_TYPE, IJobWorker, IJobWorkerInfo, ITradeJobInfo } from "../../interface/ITradeInfo";
import { IPC_CMD } from "../../constants/ipcCmd";
import { IUserInfo } from "../../interface/IUserInfo";
import TradeJobWorker from "../jobWorkers/tradeJobWorker";
import { wrapNumber } from "../../util/tradeUtil";

export default class jobWorkerHandler {
    private handlers: Handlers | undefined;
    public coinInfos: CoinInfos = {};
    private userInfo: IUserInfo | undefined | null;
    private jobWorkerInfos: IJobWorkerInfo[] = [];
    private tradeJobWorkerMap = new Map<string, TradeJobWorker>();
    private interval: any;

    constructor(handlers: Handlers) {
        handlers.logHandler?.log?.info(`create jobWorkerHandler`)
        this.handlers = handlers;
        this.interval = setInterval(() => {
            this.notifyJobWorkerInfos();
        }, 1000)
    }

    private notifyJobWorkerInfos = async () => {
        if (!this.userInfo) {
            // this.handlers?.logHandler?.log?.error("this.userInfo is empry. skip GET_ALL_JOB_WORKERS");
            this.handlers?.ipcHandler?.sendMessage(IPC_CMD.NOTIFY_JOB_WORKERINFOS, []);
            this.handlers?.ipcHandler?.sendMessage(IPC_CMD.NOTIFY_TRADE_JOB_INFOS, []);
            return;
        }
        //this.handlers?.logHandler?.log?.info("notifyJobWorkerInfos");
        let jobWorkers: IJobWorker[] = await this.handlers?.databaseHandler?.jobworkerDBApi?.getJobWorkers(this.userInfo.uid);
        let tradeJobInfos: ITradeJobInfo[] = await this.handlers?.databaseHandler?.tradeJobInfoDBApi?.getTradeJobInfos(this.userInfo.uid);        
        
        let jobWorkerInfos: IJobWorkerInfo[] = [];
        if (jobWorkers?.length > 0) {
            for(let jobWorker of jobWorkers) {
                if (!jobWorker._id) {
                    continue;
                }
                let assetInfo = this.tradeJobWorkerMap.get(jobWorker._id)?.getAssetInfo();
                let newTradeJobInfos: ITradeJobInfo[] = [];
                if (tradeJobInfos?.length > 0) {
                    tradeJobInfos.forEach((tradeJobInfo: ITradeJobInfo) => {
                        if (tradeJobInfo.jobWrokerId === jobWorker._id) {
                            newTradeJobInfos.push(tradeJobInfo);
                        }
                    })
                }
                jobWorker.tradeJobInfos = _.cloneDeep(newTradeJobInfos);     

                let jobWorkerInfo: IJobWorkerInfo = {...jobWorker, isStarted: (jobWorker._id && this.tradeJobWorkerMap.get(jobWorker._id))? true: false,};                
                if (assetInfo && assetInfo.jobWorkerId === jobWorker._id) {
                    jobWorkerInfo ={...jobWorkerInfo, assetInfo: {...assetInfo}};
                }
                jobWorkerInfos.push(jobWorkerInfo);
            }
        }
        this.jobWorkerInfos = _.cloneDeep(jobWorkerInfos);
        this.handlers?.ipcHandler?.sendMessage(IPC_CMD.NOTIFY_JOB_WORKERINFOS, jobWorkerInfos);
        this.handlers?.ipcHandler?.sendMessage(IPC_CMD.NOTIFY_TRADE_JOB_INFOS, tradeJobInfos);
    }


    private startJobWorker = async (jobWorkerInfo: IJobWorkerInfo) => {

        if (!jobWorkerInfo._id) {
            this.handlers?.logHandler?.log?.error("jobWorkerInfo._id is empty. skip startJobWorker.")
            return;
        }
        if (this.tradeJobWorkerMap.get(jobWorkerInfo._id)) {
            this.handlers?.logHandler?.log?.error(`${jobWorkerInfo._id} is already started. skip startJobWorker.`);
            return;
        }
        this.handlers?.logHandler?.log?.info(`startJobWorker. jobWorkerInfo: `, jobWorkerInfo);
        const tradeJobWorker = new TradeJobWorker(this.handlers!, jobWorkerInfo, this.notifyJobWorkerInfos, this.stopJobWorker)
        await tradeJobWorker.initialize();

        this.tradeJobWorkerMap.set(jobWorkerInfo._id, tradeJobWorker);
        const ret = await tradeJobWorker.start();
        if (ret === false) {
            this.stopJobWorker(jobWorkerInfo);
        }
    }

    private stopJobWorker = (jobWorkerInfo: IJobWorkerInfo) => {
        if (!jobWorkerInfo._id) {
            this.handlers?.logHandler?.log?.error("jobWorkerInfo._id is empty. skip stopJobWorker.")
            return;
        }
        const tradeJobWorker = this.tradeJobWorkerMap.get(jobWorkerInfo._id);
        if (!tradeJobWorker) {
            this.handlers?.logHandler?.log?.error(`${jobWorkerInfo._id} is not exist. skip stopJobWorker.`);
            return;
        }
        tradeJobWorker.dispose();
        this.tradeJobWorkerMap.delete(jobWorkerInfo._id);
        this.notifyJobWorkerInfos()
    }


    public setUserInfo = (userInfo: IUserInfo | null) => {
        this.handlers?.logHandler?.log?.info(`setUserInfo: `, userInfo);
        if (!userInfo) {
            this.userInfo = null;
            return;
        }
        this.jobWorkerInfos = [];
        this.tradeJobWorkerMap.clear();
        this.userInfo = {...userInfo};
        this.notifyJobWorkerInfos();
    }
    
    public registerIPCListeners = () =>{
        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.GET_ALL_JOB_WORKERS, async(evt) => {
            this.handlers?.logHandler?.log?.info("[IPC][GET_ALL_JOB_WORKERS]")
            await this.notifyJobWorkerInfos();
        });

        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.ADD_JOB_WORKER, async(evt, jobWorker: IJobWorker) => {
            this.handlers?.logHandler?.log?.info("[IPC][ADD_JOB_WORKER]")
            let ret = await this.handlers?.databaseHandler?.jobworkerDBApi?.addJobWorker({...jobWorker, exchangeAccountInfo_1: null, exchangeAccountInfo_2: null})
            if (ret) {
                const jobWorkerInfo: IJobWorkerInfo = {...ret, isStarted: true, 
                    exchangeAccountInfo_1: _.cloneDeep(jobWorker.exchangeAccountInfo_1),
                    exchangeAccountInfo_2: _.cloneDeep(jobWorker.exchangeAccountInfo_2),
                }
                this.jobWorkerInfos.push(jobWorkerInfo);
                await this.startJobWorker(jobWorkerInfo);
            }
            this.notifyJobWorkerInfos();            
        });

        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.DELETE_JOB_WORKER, async(evt, id: string) => {
            this.handlers?.logHandler?.log?.info("[IPC][DELETE_JOB_WORKER]")
            if (this.tradeJobWorkerMap.get(id)) {
                this.handlers?.logHandler?.log?.info("JobWorker is not stoped. skip DELETE_JOB_WORKER.")
                return;
            }
            await this.handlers?.databaseHandler?.jobworkerDBApi?.deleteJobWorker(id);
            const newJobWorkerInfos: IJobWorkerInfo[] = this.jobWorkerInfos.filter((jobWorkerInfo: IJobWorkerInfo) => jobWorkerInfo._id !== id);
            this.jobWorkerInfos = _.cloneDeep(newJobWorkerInfos);
            this.notifyJobWorkerInfos();
        });

        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.UPDATE_JOB_WORKER_EXIT_TARGET_PRIMIUM, async(evt, id: string, exitTargetPrimium: number) => {
            this.handlers?.logHandler?.log?.info("[IPC][UPDATE_JOB_WORKER_EXIT_TARGET_PRIMIUM]")
            if (this.tradeJobWorkerMap.get(id)) {
                this.handlers?.logHandler?.log?.info("JobWorker is not stoped. skip UPDATE_JOB_WORKER_EXIT_TARGET_PRIMIUM.")
                return;
            }
            let jobWorkers: IJobWorker[] = await this.handlers?.databaseHandler?.jobworkerDBApi?.getJobWorkerById(id);            
            for (let jobWorkerObj of jobWorkers) {
                if (jobWorkerObj._id === id) {
                    let newJobWorker: IJobWorker = {...jobWorkerObj, exitTargetPrimium: exitTargetPrimium}
                    newJobWorker.tradeJobInfos.forEach((tradeJobInfo: ITradeJobInfo, index: number) => {
                        if (tradeJobInfo.enterCompleteType === COMPLETE_TYPE.SUCCESS && tradeJobInfo.exitCompleteType === COMPLETE_TYPE.NONE) {
                            newJobWorker.tradeJobInfos[index].targetExitPrimium = exitTargetPrimium;
                            newJobWorker.tradeJobInfos[index].targetExitTheTher = wrapNumber(tradeJobInfo.enteredThether * (1.0 + (tradeJobInfo.targetExitPrimium * 0.01)) / (1.0 + (tradeJobInfo.enteredPrimium * 0.01)));
                        }
                    })                    
                    await this.handlers?.databaseHandler?.jobworkerDBApi?.updateJobWorker(newJobWorker)

                    let tradeJobInfos: ITradeJobInfo[] = await this.handlers?.databaseHandler?.tradeJobInfoDBApi?.getTradeJobInfosByJobWorkerId(id)
                    tradeJobInfos.forEach(async(tradeJobInfo: ITradeJobInfo, index: number) => {
                        if (tradeJobInfo.enterCompleteType === COMPLETE_TYPE.SUCCESS && tradeJobInfo.exitCompleteType === COMPLETE_TYPE.NONE) {
                            tradeJobInfos[index].targetExitPrimium = exitTargetPrimium;
                            tradeJobInfos[index].targetExitTheTher = wrapNumber(tradeJobInfo.enteredThether * (1.0 + (tradeJobInfo.targetExitPrimium * 0.01)) / (1.0 + (tradeJobInfo.enteredPrimium * 0.01)));
                        }
                        await this.handlers?.databaseHandler?.tradeJobInfoDBApi?.updateTradeJobInfo(tradeJobInfos[index])
                    })
                }
            }
            for (let [index, jobWorkerInfoObj] of this.jobWorkerInfos.entries()) {
                if (jobWorkerInfoObj._id === id) {
                    this.jobWorkerInfos[index] = {...jobWorkerInfoObj, exitTargetPrimium: exitTargetPrimium}
                    jobWorkerInfoObj.tradeJobInfos?.forEach((tradeJobInfo: ITradeJobInfo, index2: number) => {
                        if (tradeJobInfo.enterCompleteType === COMPLETE_TYPE.SUCCESS && tradeJobInfo.exitCompleteType === COMPLETE_TYPE.NONE) {
                            this.jobWorkerInfos[index].tradeJobInfos[index2].targetExitPrimium = exitTargetPrimium;
                            this.jobWorkerInfos[index].tradeJobInfos[index2].targetExitTheTher = wrapNumber(tradeJobInfo.enteredThether * (1.0 + (tradeJobInfo.targetExitPrimium * 0.01)) / (1.0 + (tradeJobInfo.enteredPrimium * 0.01)));
                        }
                    }) 
                }
            }
            this.handlers?.logHandler?.log?.info(`updateJobWorker. jobWorkerInfos: `, this.jobWorkerInfos);
            this.notifyJobWorkerInfos();
        });

        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.START_JOB_WORKERS, async(evt, jobWorkers: IJobWorker[]) => {
            this.handlers?.logHandler?.log?.info(`[IPC][START_JOB_WORKERS]`);
            let promises: any = [];
            jobWorkers.forEach((jobWorker: IJobWorker) => {
                promises.push(this.excuteIPCCmdForStartJobWorker(jobWorker));
            })
            await Promise.all(promises);
            this.notifyJobWorkerInfos();
        });

        this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.STOP_JOB_WORKERS, async (evt, ids: string[]) => {
            this.handlers?.logHandler?.log?.info(`[IPC][STOP_JOB_WORKERS]`);
            for (const id of ids) {
                const idx = this.jobWorkerInfos.findIndex((jobWorkerInfo: IJobWorkerInfo) => jobWorkerInfo._id === id);
                if (idx === -1) {
                    this.handlers?.logHandler?.log?.info(`jobWorkerInfo is not exist. skip to stop jobWorkerj`)
                    break;
                }
                this.jobWorkerInfos[idx].isStarted = false;
                this.stopJobWorker(this.jobWorkerInfos[idx]);
            }
            this.notifyJobWorkerInfos();
        });
    }

    private excuteIPCCmdForStartJobWorker = async (jobWorker: IJobWorker) => {
        return new Promise(async (resolve) => {
            const idx = this.jobWorkerInfos.findIndex((jobWorkerInfo: IJobWorkerInfo) => jobWorkerInfo._id === jobWorker._id);
            if (idx === -1) {
                this.handlers?.logHandler?.log?.info(`jobWorkerInfo is not exist. skip to start jobWorkerj`)
                return;
            }
            const exchangeAccountInfo_1 = await this.handlers?.databaseHandler?.exchangeAccountInfoDBApi?.getExchangeAccountInfos({id: jobWorker.exchangeAccountInfoId_1}, this.userInfo?.uid ?? "");
            const exchangeAccountInfo_2 = await this.handlers?.databaseHandler?.exchangeAccountInfoDBApi?.getExchangeAccountInfos({id: jobWorker.exchangeAccountInfoId_2}, this.userInfo?.uid ?? "");
            
            this.jobWorkerInfos[idx].isStarted = true;                
            this.jobWorkerInfos[idx].exchangeAccountInfo_1 = exchangeAccountInfo_1 && exchangeAccountInfo_1[0] ?_.cloneDeep(exchangeAccountInfo_1[0]) : null;
            this.jobWorkerInfos[idx].exchangeAccountInfo_2 = exchangeAccountInfo_2 && exchangeAccountInfo_2[0]  ?_.cloneDeep(exchangeAccountInfo_2[0]) : null;

            // 업데이트 되는 항목들은 다시 써줘야 함.
            this.jobWorkerInfos[idx].exitTargetPrimium = jobWorker.exitTargetPrimium;
            this.handlers?.logHandler?.log?.info(`excuteIPCCmdForStartJobWorker. jobWorkerInfo: `, this.jobWorkerInfos[idx])
            this.startJobWorker(this.jobWorkerInfos[idx]);
            resolve(true)
            return;
        })
    }
}