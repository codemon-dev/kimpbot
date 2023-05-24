
import { BrowserWindow, IpcMainEvent, ipcMain } from 'electron'
import { API_KEY_INFO } from '../../constants/types'
import store, { STORE_KEYS } from '../store'
import { IPC_CMD } from '../../constants/ipcCmd'
import Handlers from './Handlers'

export default class IPCHandler {
    handlers: Handlers | undefined;
    window: BrowserWindow | undefined | null

    constructor(handlers: Handlers) {
        console.log(`create IPCHandler.`);
        this.handlers = handlers;
    }

    public initialize = (mainWindow: BrowserWindow) => {
        console.log(`initialize IPCHandler.`);
        this.window = mainWindow;
        this.registerDefaultListeners();
    }

    public sendMessage = (channel: string, data: any) => {
        if (!this.window) {
            console.error(`window is null. skip `)
            return;
        }
        this.window?.webContents.send(channel, data)

    }
    public registerIPCListeners = (channel: IPC_CMD, listener: (event: IpcMainEvent, ...args: any[]) => void) => {
        ipcMain.on(channel, listener);
    }

    private registerDefaultListeners = () => {
        console.log("registerDefaultListeners");
        ipcMain.on(IPC_CMD.STORE_SET_APIKEY_INFOS, async (evt, newApiKey: API_KEY_INFO[]) => {
            console.log("[IPC][STORE_SET_APIKEY_INFOS]")
            store.set(STORE_KEYS.API_KEY_INFOS, newApiKey)
            evt.reply(IPC_CMD.STORE_GET_APIKEY_INFOS, store.get(STORE_KEYS.API_KEY_INFOS));
        })
    
        ipcMain.on(IPC_CMD.STORE_GET_APIKEY_INFOS, async (evt) => {
            console.log("[IPC][STORE_GET_APIKEY_INFOS]")
            evt.reply(IPC_CMD.STORE_GET_APIKEY_INFOS, store.get(STORE_KEYS.API_KEY_INFOS));
        })
    }
}
