import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CMD } from '../constants/ipcCmd'
import { API_KEY_INFO } from '../constants/types'

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

  storeSetApiKeyInfos: (apiKeyInfo: API_KEY_INFO[]) => {
    ipcRenderer.send(IPC_CMD.STORE_SET_APIKEY_INFOS, apiKeyInfo)
  },

  storeGetApiKeyInfos: () => {
    ipcRenderer.send(IPC_CMD.STORE_GET_APIKEY_INFOS)
  },

  setExchageRateMonitorOnOff: (onOff: boolean) => {
    ipcRenderer.send(IPC_CMD.SET_EXCHANGE_RATE_MONITOR_ON_OFF, onOff)
  },
}

contextBridge.exposeInMainWorld('Main', api)
