import { app, BrowserWindow } from 'electron'
import isDev from "electron-is-dev"
import path from 'path'
import Handlers from './handler/Handlers'

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
    handlers?.exchangeRateHandler?.registerIPCListeners();  // should be call after end ipcHandler intialize()
  }
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    icon: path.join(assetsPath, 'assets', 'icon.png'),
    width: 1100,
    height: 700,
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

app.on('ready', createWindow)
  .whenReady()
  .then(() => {
    initializeApp();
  })
  .catch(e => console.error(e))

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
