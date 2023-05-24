import { app } from "electron"
import isDev from "electron-is-dev";

export const getDBFilePath = (filename: string) => {
    return isDev ? `${process.cwd()}/db/data/${filename}`: `${app.getPath("userData")}/db/data/${filename}`;
}