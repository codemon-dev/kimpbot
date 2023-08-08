import { ipcMain, BrowserWindow, IpcMainEvent } from 'electron';
import { ICurrencyDunamuResponse, ICurrencyInfo, ICurrencyInfos, ICurrencyInvestringResponse, ICurrencyWeebullResponse, ICurrencyYahooResponse, } from '../../interface/ICurrency';
import { CURRENCY_SITE_TYPE, EXCHANGE_RATE_URL } from '../../constants/enum'
import { IPC_CMD } from '../../constants/ipcCmd';
import Handlers from './Handlers';
import moment from 'moment-timezone';


export default class CurrencyHandler {
  private handlers: Handlers | undefined;
  private monitorInterval: any;
  public currencyInfos: ICurrencyInfos = {};
  private listeners = new Map();

  constructor(handlers: Handlers) {
    handlers.logHandler?.log?.info(`create CurrencyHandler.`);
    this.handlers = handlers;
    this.start()
  }

  public addListener = (key: string, callback: any) => {
    this.listeners.set(key, callback);
    this.notifyCurrency();
  }

  public removeListener = (key: string) => {
    this.listeners.delete(key);
  }

  private notifyCurrency = () => {
    if (this.listeners.size === 0) {
      return;
    }
    if (!this.currencyInfos[CURRENCY_SITE_TYPE.WEBULL]) {
      return;
    }
    this.listeners.forEach((callback: any, key: string) => {
      callback(this.currencyInfos[CURRENCY_SITE_TYPE.WEBULL]);
    });
  }

  public start = async () => {
    if (this.monitorInterval != null) {
        this.handlers?.logHandler?.log?.info('CurrencyHandler monitor alread started. skip start.');
        return;
    }
    this.handlers?.logHandler?.log?.info('CurrencyHandler monitor start');
    this.intervalProcess();
    this.monitorInterval = setInterval(() => {
      this.intervalProcess();
    }, 10 * 1000);
  };

  public stop = () => {
    this.handlers?.logHandler?.log?.info('CurrencyInfo monitor stop');
    if (this.monitorInterval != null) {
        clearInterval(this.monitorInterval);
        this.monitorInterval = null;
    }
  }

  private intervalProcess = () => {
    this.fetchCurrencyDunamu()
        .then((data) => {
          // this.handlers?.logHandler?.log?.debug('Success to fetchData currency');
          this.currencyInfos[(data as ICurrencyInfo).type] = {...data as ICurrencyInfo};
        })
        .catch((err) => {
          this.handlers?.logHandler?.log?.info(`[${Date.now().toLocaleString()}] Fail to fetchData Dunamu currency. err:`, err);
          this.handlers?.ipcHandler?.sendMessage(IPC_CMD.DEBUG_MSG, `fail fetchCurrencyDunamu. err: ${err}`);
        });

      // this.fetchCurrencyInvestring()
      // .then((data: any) => {
           // this.handlers?.logHandler?.log?.debug('Success to fetchData CurrencyInfo');
           // this.currencyInfos[(data as ICurrencyInfo).type] = {...data as ICurrencyInfo};
      // })
      // .catch((err) => {
      //   this.handlers?.logHandler?.log?.debug(`[${Date.now()}] Fail to fetchData Investring CurrencyInfo. err:`, err);
      // });

      this.fetchCurrencyYahoo()
      .then((data: any) => {
        // this.handlers?.logHandler?.log?.debug('Success to fetchData CurrencyInfo');
        this.currencyInfos[(data as ICurrencyInfo).type] = {...data as ICurrencyInfo};
      })
      .catch((err) => {
        this.handlers?.ipcHandler?.sendMessage(IPC_CMD.DEBUG_MSG, `fail fetchCurrencyYahoo. err: ${err}`);
        this.handlers?.logHandler?.log?.info(`[${Date.now().toLocaleString()}] Fail to fetchData Yahoo CurrencyInfo. err:`, err);
      });

      this.fetchCurrencyWeebull()
      .then((data: any) => {
        // this.handlers?.logHandler?.log?.debug('Success to fetchData CurrencyInfo');
        this.currencyInfos[(data as ICurrencyInfo).type] = {...data as ICurrencyInfo}
      })
      .catch((err) => {
        this.handlers?.logHandler?.log?.info(`[${Date.now().toLocaleString()}] Fail to fetchData WeeBull CurrencyInfo. err:`, err);
        this.handlers?.ipcHandler?.sendMessage(IPC_CMD.DEBUG_MSG, `fail fetchCurrencyWeebull. err: ${err}`);
      });
      this.notifyCurrency();
  }

  public fetchCurrencyDunamu = async () => {
    var request = require('request');
    var headers = {
      'Content-Type': 'application/json',
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36'
    };
    var options = {
      url: EXCHANGE_RATE_URL.DUNAMU,
      method: 'GET',
      headers: headers,
    };
    return new Promise((resolve, reject) => {
      request(options, callback);
      function callback(error: any, response: any, body: any) {
        // this.handlers?.logHandler?.log?.debug(`response: ${response}`);
        if (!error && response.statusCode == 200) {
          // this.handlers?.logHandler?.log?.debug(body);
          const response: [ICurrencyDunamuResponse] = JSON.parse(body);
          if (response.length > 0) {
            const currencyInfo: ICurrencyInfo = {
              type: CURRENCY_SITE_TYPE.DUNAMU,
              price: response[0].basePrice,
              timestamp: response[0].timestamp,
            };
            resolve(currencyInfo);
            return;
          }
        }
        reject();
      }
    });
  }
  
  public fetchCurrencyInvestring = async () => {
    var request = require('request');
    var headers = {
      'Content-Type': 'application/json',
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36'
    };
    var options = {
      url: EXCHANGE_RATE_URL.INVESTRING,
      method: 'GET',
      headers: headers,
      
    };
    let log = this.handlers?.logHandler?.log;
    return new Promise((resolve, reject) => {
      request(options, callback);
      function callback(error: any, response: any, body: any) {        
        log?.info(`response: `, response);
        // log?.debug(`body: `, body);
        if (!error && response.statusCode == 200) {
          const data: ICurrencyInvestringResponse[] = JSON.parse(body)?.data;
          if (data && data.length > 0) {
            const currencyInfo: ICurrencyInfo = {
              type: CURRENCY_SITE_TYPE.INVESTRING,
              price: data[data.length - 1].price,
              timestamp: data[data.length - 1].timestamp
            };
            resolve(currencyInfo);
            return;
          }
        }
        reject();
      }
    });
  }

  public fetchCurrencyYahoo = async () => {
    var request = require('request');
    var headers = {
      'Content-Type': 'application/json',
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36'
    };
    var options = {
      url: EXCHANGE_RATE_URL.YAHOO,
      method: 'GET',
      headers: headers,
      
    };
    let log = this.handlers?.logHandler?.log;
    return new Promise((resolve, reject) => {
      request(options, callback);
      function callback(error: any, response: any, body: any) {
        // log?.debug(`response: `, response);
        // log?.debug(`body: `, body);
        if (!error && response.statusCode == 200) {
          const data: ICurrencyYahooResponse = JSON.parse(body)?.chart?.result[0];
          if (data) {     
            if (!data.indicators?.quote[0]?.close?.length) {
              reject();
            }
            let cnt = 0;
            let len = data.indicators?.quote[0]?.close?.length-1;
            let sum = 0;
            for (let i=len; i>0; i--) {
              if (cnt >= 10) {
                break;
              }
              if (!data.indicators?.quote[0]?.close[i]) {
                continue
              }
              sum+=data.indicators?.quote[0]?.close[i];              
              cnt++;
              // this.handlers?.logHandler?.log?.debug(`[${i}]${data.indicators?.quote[0]?.close[i]}`)
            }
            const currencyInfo: ICurrencyInfo = {
              type: CURRENCY_SITE_TYPE.YAHOO,
              price: data.meta.regularMarketPrice,
              avgPrice: sum / cnt,
              timestamp: data.meta.regularMarketTime * 1000
            };
            // this.handlers?.logHandler?.log?.debug("yahoo", currencyInfo);
            resolve(currencyInfo);
            return;
          }
          reject();
        }
      }
    });
  }

  public fetchCurrencyWeebull = async () => {
    var request = require('request');
    var headers = {
      'Content-Type': 'application/json',
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36'
    };
    var options = {
      url: EXCHANGE_RATE_URL.WEBULL,
      method: 'GET',
      headers: headers,      
    };
    let log = this.handlers?.logHandler?.log;
    return new Promise((resolve, reject) => {
      request(options, callback);
      function callback(error: any, response: any, body: any) {
        // log?.debug(`response: `, response);
        // log?.debug(`body: `, body);
        if (!error && response.statusCode == 200) {
          const data: ICurrencyWeebullResponse = JSON.parse(body);
          // log?.debug("Weebull", data)
          if (data) {    
            const currencyInfo: ICurrencyInfo = {
              type: CURRENCY_SITE_TYPE.WEBULL,
              price: parseFloat(data.close),
              timestamp: moment.tz(data.tradeTime, data.timeZone).valueOf(),
            };
            resolve(currencyInfo);
            return;
          }
        }
        reject();
      }
    });
  }
}
