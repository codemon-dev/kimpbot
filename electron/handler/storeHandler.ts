import { IpcMainEvent } from 'electron';
import { IPC_CMD } from '../../constants/ipcCmd';
import Handlers from './Handlers';
import Store from 'electron-store';


export default class StoreHander {
  handlers: Handlers | undefined;
  store = new Store();
  constructor(handlers: Handlers) {
    handlers.logHandler?.log?.info(`create StoreHander.`);
    this.handlers = handlers;
  }
  public getStoreData(key: string) {
    return this.store.get(key);
  }

  public setStoreData(key: string, value: any) {
    this.store.set(key, value)
  }

  public registerIPCListeners = () => {
    if (!this.handlers?.ipcHandler) {
      this.handlers?.logHandler?.log?.error(`handlers?.ipcHandler is null. skip registerIPCListeners.`);
      return;
    }
    this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.GET_STORE_DATE, async (evt: IpcMainEvent, key: string) => {
      let data = this.getStoreData(key);
        this.handlers?.logHandler?.log?.info(`[IPC][GET_STORE_DATE] key: ${key}, data: `, data)
        evt.reply(IPC_CMD.GET_STORE_DATE, {key, data});
    });

    this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.SET_STORE_DATE, async (evt: IpcMainEvent, key: string, data: any) => {
        this.handlers?.logHandler?.log?.info(`[IPC][SET_STORE_DATE] key: ${key}, data: `, data)       
        this.setStoreData(key, data);
    })
  }
}
