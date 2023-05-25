import { ipcMain, BrowserWindow, IpcMainEvent } from 'electron';
import { IExchageRateDunamuResponse, IExchageRateInfo } from './../../interface/IExchangeRate';
import { EXCHANGE_RATE_URL } from '../../constants/enum'
import { IPC_CMD } from '../../constants/ipcCmd';
import Handlers from './Handlers';

export default class ExchangeRateHander {
  handlers: Handlers | undefined;
  monitorInterval: any;

  constructor(handlers: Handlers) {
    console.log(`create ExchangeRateHander.`);
    this.handlers = handlers;
  }

  public registerIPCListeners = () => {
    if (!this.handlers?.ipcHandler) {
      console.error(`handlers?.ipcHandler is null. skip registerIPCListeners.`);
      return;
    }
    this.handlers?.ipcHandler?.registerIPCListeners(IPC_CMD.SET_EXCHANGE_RATE_MONITOR_ON_OFF, async (evt: IpcMainEvent, onOnff: boolean) => {
        console.log("[IPC][SET_EXCHANGE_RATE_MONITOR_ON_OFF] onOnff: ", onOnff)       
        if (!this.handlers?.exchangeRateHandler) {
            console.error(`exchangeRateHandler is null. skip set SET_EXCHANGE_RATE_MONITOR_ON_OFF.`);
            evt.reply(IPC_CMD.SET_EXCHANGE_RATE_MONITOR_ON_OFF, false);
            return;
        }
        if (onOnff == true) {
            this.handlers?.exchangeRateHandler.start();
            this.handlers?.exchangeRateHandler.fetchExchageRate()
            .then((data: any) => {
              evt.reply(IPC_CMD.SET_EXCHANGE_RATE_MONITOR_ON_OFF, true);
              evt.reply(IPC_CMD.NOTIFY_EXCHANGE_RATE_INFOS, data);
            })
            .catch((err) => {
              console.log('Fail to fetchData ExchangeRate');
            });
        } else {
            this.handlers?.exchangeRateHandler.stop();
        }
    })
  }

  public start = async () => {
    if (this.monitorInterval != null) {
        console.log('ExchangeRate monitor alread started. skip start.');
        return;
    }
    console.log('ExchangeRate monitor start');
    this.monitorInterval = setInterval(() => {
      this.fetchExchageRate()
        .then((data: any) => {
          // console.log('Success to fetchData ExchangeRate');
          this.handlers?.ipcHandler?.sendMessage(IPC_CMD.NOTIFY_EXCHANGE_RATE_INFOS, data);
        })
        .catch((err) => {
          console.log('Fail to fetchData ExchangeRate. err:', err);
        });
    }, 2000);
  };

  public stop = () => {
    console.log('ExchangeRate monitor stop');
    if (this.monitorInterval != null) {
        clearInterval(this.monitorInterval);
        this.monitorInterval = null;
    }
  }

  public fetchExchageRate = async () => {
    var request = require('request');
    var headers = {
      'Content-Type': 'application/json',
    };
    var options = {
      url: EXCHANGE_RATE_URL.DUNAMU,
      method: 'GET',
      headers: headers,
    };
    return new Promise((resolve, reject) => {
      request(options, callback);
      function callback(error: any, response: any, body: any) {
        // console.log(`response: ${response}`);
        if (!error && response.statusCode == 200) {
          // console.log(body);
          const response: [IExchageRateDunamuResponse] = JSON.parse(body);
          if (response.length > 0) {
            const exchangeRateInfo: IExchageRateInfo = {
              code: response[0].code,
              price: response[0].basePrice,
              date: response[0].date,
              time: response[0].time,
              timestamp: response[0].timestamp,
            };
            resolve(exchangeRateInfo);
          }
        }
        reject();
      }
    });
  }
}
