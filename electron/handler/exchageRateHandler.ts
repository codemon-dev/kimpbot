import { ipcMain, BrowserWindow } from 'electron';
import { IExchageRateDunamuResponse, IExchageRateInfo } from './../../interface/IExchangeRate';
import { EXCHANGE_RATE_URL } from '../../constants/enum'
import { IPC_CMD } from '../../constants/ipcCmd';

export default class ExchangeRateHander {
  monitorInterval: any;
  window: BrowserWindow | undefined | null;
  constructor(mainWindow: BrowserWindow | null) {
    this.window = mainWindow;
  }

  start = async () => {
    if (this.monitorInterval != null) {
        console.log('ExchangeRate monitor alread started. skip start.');
        return;
    }
    console.log('ExchangeRate monitor start');
    let cnt = 0;
    this.monitorInterval = setInterval(() => {
      cnt++;
      const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
      this.fetchExchageRate()
        .then((data: any) => {
          console.log('Success to fetchData ExchangeRate');
          this.window?.webContents.send(IPC_CMD.NOTIFY_EXCHANGE_RATE_INFOS, data)
        })
        .catch((err) => {
          console.log('Fail to fetchData ExchangeRate');
        });
    }, 2000);
  };

  stop = () => {
    console.log('ExchangeRate monitor stop');
    if (this.monitorInterval != null) {
        clearInterval(this.monitorInterval);
        this.monitorInterval = null;
    }
  }

  async fetchExchageRate() {
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
        console.log(`response: ${response}`);
        if (!error && response.statusCode == 200) {
          console.log(body);
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
