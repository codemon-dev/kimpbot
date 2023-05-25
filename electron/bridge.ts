import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CMD } from '../constants/ipcCmd'
import { IReqExchageAccountInfo } from './handler/databaseHandler'
import { ExchangeAccountInfo } from '../db/schemas/ExchangeAccountInfo'

export const api = {
  sendMessage: (message: string) => {
    ipcRenderer.send('message', message)
  },

  on: (channel: string, callback: Function) => {
    ipcRenderer.on(channel, (_, data) => callback(data))
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
}

contextBridge.exposeInMainWorld('Main', api)
