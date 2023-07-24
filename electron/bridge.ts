import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CMD } from '../constants/ipcCmd'
import { IReqExchageAccountInfo } from './handler/databaseHandler'
import { ExchangeAccountInfo } from '../db/schemas/ExchangeAccountInfo'
import { IUserInfo } from '../interface/IUserInfo'
import { IReqMarketInfo } from '../interface/IMarketInfo'
import { IJobWorker } from '../interface/ITradeInfo'

export const api = {
  sendMessage: (message: string) => {
    ipcRenderer.send('message', message)
  },

  on: (channel: string, callback: Function) => {
    ipcRenderer.on(channel, (_, data) => callback(data))
  },

  off: (channel: string, callback: Function) => {
    ipcRenderer.off(channel, (_, data) => callback(data))
  },

  once: (channel: string, callback: Function) => {
    ipcRenderer.once(channel, (_, data) => callback(data))
  },
  
  getExchangeAccountInfos: (req: IReqExchageAccountInfo) => {
    ipcRenderer.send(IPC_CMD.STORE_GET_EXCHANGE_ACCOUNT_INFOS, req)
  },
  
  addExchangeAccountInfos: (exchangeAccountInfos: ExchangeAccountInfo[]) => {
    ipcRenderer.send(IPC_CMD.STORE_ADD_EXCHANGE_ACCOUNT_INFOS, exchangeAccountInfos)
  },

  updateExchangeAccountInfos: (exchangeAccountInfos: ExchangeAccountInfo[]) => {
    ipcRenderer.send(IPC_CMD.STORE_UPDATE_EXCHANGE_ACCOUNT_INFOS, exchangeAccountInfos)
  },

  deleteExchangeAccountInfos: (ids: string[]) => {
    ipcRenderer.send(IPC_CMD.STORE_DELETE_EXCHANGE_ACCOUNT_INFOS, ids)
  },
  
  deleteAllExchangeAccountInfos: (userId: string) => {
    ipcRenderer.send(IPC_CMD.STORE_DELETE_ALL_EXCHANGE_ACCOUNT_INFOS, userId)
  },

  setExchageRateMonitorOnOff: (onOff: boolean) => {
    ipcRenderer.send(IPC_CMD.SET_EXCHANGE_RATE_MONITOR_ON_OFF, onOff)
  },

  getEnvInfo: () => {
    ipcRenderer.send(IPC_CMD.GET_ENV_INFO)
  },

  setUserInfo: (uerInfo: IUserInfo | null) => {
    ipcRenderer.send(IPC_CMD.SET_USER_INFO, uerInfo)
  },

  setStoreData: (key: string, data: any) => {
    ipcRenderer.send(IPC_CMD.SET_STORE_DATE, key, data)
  },

  getStoreData: (key: string) => {
    ipcRenderer.send(IPC_CMD.GET_STORE_DATE, key)
  },

  requestMarketInfo: (req: IReqMarketInfo) => {
    ipcRenderer.send(IPC_CMD.REQUEST_MARKET_INFO, req)
  },

  getAllJobWorker: () => {
    ipcRenderer.send(IPC_CMD.GET_ALL_JOB_WORKERS)
  },

  addJobWorker: (jobWorker: IJobWorker) => {
    ipcRenderer.send(IPC_CMD.ADD_JOB_WORKER, jobWorker)
  },

  deleteJobWorker: (id: string) => {
    ipcRenderer.send(IPC_CMD.DELETE_JOB_WORKER, id)
  },

  updateJobWorkerTargetPrimium: (id: string, exitTargetPrimium: number) => {
    ipcRenderer.send(IPC_CMD.UPDATE_JOB_WORKER_EXIT_TARGET_PRIMIUM, id, exitTargetPrimium)
  },

  startJobWorkers: (jobWorkers: IJobWorker[]) => {
    ipcRenderer.send(IPC_CMD.START_JOB_WORKERS, jobWorkers)
  },

  stopJobWorkers: (ids: string[]) => {
    ipcRenderer.send(IPC_CMD.STOP_JOB_WORKERS, ids)
  },

  getAllTradeJobInfo: () => {
    ipcRenderer.send(IPC_CMD.GET_ALL_TRADE_JOB_INFOS)
  },

  requestPrimiumChartData: () => {
    ipcRenderer.send(IPC_CMD.REQUEST_PRIMIUM_CHART_DATA)
  },
}

contextBridge.exposeInMainWorld('Main', api)
