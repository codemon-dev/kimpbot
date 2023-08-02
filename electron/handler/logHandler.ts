
import Handlers from './Handlers'
import "dotenv/config"

import log from "electron-log"
import fs from 'fs'
import path from 'path'
import isDev from "electron-is-dev";
import { DATA_LOG_DIR_PATH } from '../../constants/constants'
import { convertToLogFormatDate } from '../../util/timestamp'



const logPath = `${DATA_LOG_DIR_PATH}/log`
const { version } = require('./../../package.json');

export default class LogHandler {
    handlers: Handlers | undefined;
    log: any
    logfile: string = ""

    constructor(handlers: Handlers) {
        console.log(`create LogHandler.`);
        this.handlers = handlers;
        console.log(`initialize LogHandler.`);
        if (fs.existsSync(logPath) === false) {
            fs.mkdirSync(logPath, { recursive: true });
        }
        this.log = log.create("main")
        this.logfile = path.join(logPath, isDev? `[${version}]mainLog_dev_${convertToLogFormatDate(Date.now())}.log`: `[${version}]mainLog_product_${convertToLogFormatDate(Date.now())}.log`);
        this.log.transports.file.resolvePath = () => this.logfile;
        this.log.transports.file.maxSize = 1024 * 1024 * 5;
        this.log.info("logHandler created.")
    }
}
