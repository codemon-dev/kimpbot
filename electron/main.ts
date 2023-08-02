import { app, BrowserWindow, crashReporter } from 'electron'
import isDev from "electron-is-dev"
import path from 'path'
import fs from 'fs'
import Handlers from './handler/Handlers'
import { COIN_PAIR, COIN_SYMBOL, EXCHANGE } from '../constants/enum'
import { DATA_LOG_DIR_PATH } from '../constants/constants'


let mainWindow: BrowserWindow | undefined | null
let handlers: Handlers | undefined

declare const MAIN_WINDOW_WEBPACK_ENTRY: string
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string

const assetsPath = isDev === true? process.resourcesPath: app.getAppPath()

const initializeApp = async () => {
  console.log("initializeApp.");
  handlers = new Handlers();
  handlers.initialize();
  await handlers.databaseHandler?.initialize();
  if (mainWindow) {
    handlers?.ipcHandler?.initialize(mainWindow)
    handlers?.binanceHandler?.startHandler([COIN_PAIR.BTCUSDT, COIN_PAIR.ETHUSDT, COIN_PAIR.XRPUSDT, COIN_PAIR.DOGEUSDT]);
    handlers?.upbitHandler?.startHandler([COIN_PAIR.BTCKRW, COIN_PAIR.ETHKRW, COIN_PAIR.XRPKRW, COIN_PAIR.DOGEKRW]);
    handlers?.storeHandler?.registerIPCListeners();    
    handlers?.marketInfoHandler?.registerIPCListeners();
    handlers?.jobWorkerHandler?.registerIPCListeners();
    handlers?.primiumHandler?.startHandler({
      exchange1: EXCHANGE.UPBIT,
      exchange2: EXCHANGE.BINANCE,
      coinPair1: COIN_PAIR.BTCKRW,
      coinPair2: COIN_PAIR.BTCUSDT,
      coinSymbol: COIN_SYMBOL.BTC,
    });
  }
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    icon: path.join(assetsPath, 'assets', 'icon.png'),
    width: 1100,
    height: 700,
    frame: true, // url
    backgroundColor: '#191622',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
    }
  })

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// const logPath = `${DATA_LOG_DIR_PATH}/temp`
// if (fs.existsSync(logPath) === false) {
//   fs.mkdirSync(logPath, { recursive: true });
// }
// app.setPath('temp', logPath)
// crashReporter.start({
//   productName: 'YourName',
//   companyName: 'YourCompany',
//   submitURL: 'https://your-domain.com/url-to-submit',
//   // autoSubmit: true
// })

app.on('ready', createWindow)
  .whenReady()
  .then(() => {
    initializeApp();
    setInterval(() => {
      handlers?.logHandler?.log?.info(`[SERVER WATCHDOG] I'm alive`)
      // process.crash()
    }, 60000)
  })
  .catch(e => handlers?.logHandler?.log?.error(e))

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})