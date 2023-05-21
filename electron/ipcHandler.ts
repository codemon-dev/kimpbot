
import { ipcMain } from 'electron'
import { API_KEY_INFO } from '../constants/types'
import store, { STORE_KEYS } from './store'
import { IPC_CMD } from '../constants/ipcCmd'
import ExchangeRateHander from './handler/exchageRateHandler';

export async function registerListeners (mainWindow: any) {
    console.log("registerListeners");
    const exchangeRateHandler = new ExchangeRateHander(mainWindow);
    ipcMain.on('message', (_, message) => {
        console.log(message)
    })

    ipcMain.on(IPC_CMD.STORE_SET_APIKEY_INFOS, async (evt, newApiKey: API_KEY_INFO[]) => {
        console.log("STORE_SET_APIKEY_INFOS")
        store.set(STORE_KEYS.API_KEY_INFOS, newApiKey)
        evt.reply(IPC_CMD.STORE_GET_APIKEY_INFOS, store.get(STORE_KEYS.API_KEY_INFOS));
    })

    ipcMain.on(IPC_CMD.STORE_GET_APIKEY_INFOS, async (evt) => {
        console.log("STORE_GET_APIKEY_INFOS")
        evt.reply(IPC_CMD.STORE_GET_APIKEY_INFOS, store.get(STORE_KEYS.API_KEY_INFOS));
    })

    ipcMain.on(IPC_CMD.SET_EXCHANGE_RATE_MONITOR_ON_OFF, async (evt, onOnff: boolean) => {
        console.log("SET_EXCHANGE_RATE_MONITOR_ON_OFF. onOnff: ", onOnff)
        if (onOnff == true) {
            exchangeRateHandler.start();
            exchangeRateHandler.fetchExchageRate()
            .then((data: any) => {
              console.log('Success to fetchData ExchangeRate');
              evt.reply(IPC_CMD.NOTIFY_EXCHANGE_RATE_INFOS, data);
            })
            .catch((err) => {
              console.log('Fail to fetchData ExchangeRate');
            });
        } else {
            exchangeRateHandler.stop();
        }
    })
}