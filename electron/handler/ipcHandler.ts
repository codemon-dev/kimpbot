
import { BrowserWindow, IpcMainEvent, ipcMain } from 'electron'
import { IPC_CMD } from '../../constants/ipcCmd'
import Handlers from './Handlers'
import { IEnvInfo } from '../../interface/IEnvInfo';
import "dotenv/config"
import { IUserInfo } from '../../interface/IUserInfo';

export default class IPCHandler {
    handlers: Handlers | undefined;
    window: BrowserWindow | undefined | null

    constructor(handlers: Handlers) {
        handlers.logHandler?.log?.info(`create IPCHandler.`);
        this.handlers = handlers;
    }

    public initialize = (mainWindow: BrowserWindow) => {
        this.handlers?.logHandler?.log?.info(`initialize IPCHandler.`);
        this.window = mainWindow;
        this.registerDefaultListeners();
    }

    public sendMessage = (channel: string, data: any) => {
        if (!this.window) {
            this.handlers?.logHandler?.log?.error(`window is null. skip. channel: `, channel);
            this.handlers?.logHandler?.log?.error(`window is null. skip. data: `, data);
            return;
        }
        this.window?.webContents.send(channel, data)

    }
    public registerIPCListeners = (channel: IPC_CMD, listener: (event: IpcMainEvent, ...args: any[]) => void) => {
        ipcMain.on(channel, listener);
    }

    private registerDefaultListeners = () => {
        this.handlers?.logHandler?.log?.info("registerDefaultListeners, ");
        ipcMain.on(IPC_CMD.GET_ENV_INFO, async (evt) => {
            let envInfo: IEnvInfo = {
                firebaseConfig: {
                    apiKey: process.env.FIREBASE_CONFIG_API_KEY ?? "",
                    authDomain: process.env.FIREBASE_CONFIG_AUTH_DOMIAN ?? "",
                    projectId: process.env.FIREBASE_CONFIG_PROJECT_ID ?? "",
                    storageBucket: process.env.FIREBASE_CONFIG_STORAGE_BUCKET ?? "",
                    messagingSenderId: process.env.FIREBASE_CONFIG_MESSAGING_SENDER_ID ?? "",
                    appId: process.env.FIREBASE_CONFIG_APP_ID ?? "",
                    measurementId: process.env.FIREBASE_CONFIG_MEASUREMENT_ID ?? "",
                }
            }
            //this.handlers?.logHandler?.log?.info("envInfo: ", envInfo)
            evt.reply(IPC_CMD.GET_ENV_INFO, envInfo);
        });

        ipcMain.on(IPC_CMD.SET_USER_INFO, async (evt, userInfo: IUserInfo | null) => {
            this.handlers?.databaseHandler?.setUserInfo(userInfo);
            this.handlers?.jobWorkerHandler?.setUserInfo(userInfo);
        })
    }    
}
