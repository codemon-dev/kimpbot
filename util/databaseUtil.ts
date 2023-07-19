import { app } from "electron"
import crypto, { CipherCCMTypes, CipherKey, KeyObject } from "crypto"
import isDev from "electron-is-dev";
import { DATA_LOG_DIR_PATH } from "../constants/constants";

export const getDBFilePath = (filename: string) => {
    return isDev ? `${process.cwd()}/db/data/${filename}`: `${app.getPath("userData")}/db/data/${filename}`;
}

export const getPrimiumnFilePath = () => {
    return DATA_LOG_DIR_PATH;
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'abcdefghijklmnop'.repeat(2) // Must be 256 bits (32 characters)
const IV_LENGTH = 16 // For AES, this is always 16
export const encrypt = (text: string, key: string) => {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)
    const encrypted = cipher.update(text)

    return iv.toString('hex') + ':' + Buffer.concat([encrypted, cipher.final()]).toString('hex');
}

export const decrypt = (text: string) => {
    const textParts1 = text.split(':');
    const textParts2 = textParts1.shift();
    if (!textParts2) {
        return null;
    }
    const iv = Buffer.from(textParts2, 'hex')
    const encryptedText = Buffer.from(textParts1.join(':'), 'hex')
    const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(ENCRYPTION_KEY),
        iv,
    )
    const decrypted = decipher.update(encryptedText)
    return Buffer.concat([decrypted, decipher.final()]).toString()
}
