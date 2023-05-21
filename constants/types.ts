import { EXCHANGE } from "./enum"

export const TAGS = {
    Android: 'Android',
    MacOS: 'MacOS',
    Windows: 'Windows',
}
export type TagsEnum = keyof typeof TAGS

export type API_KEY_INFO = {
    exchange: EXCHANGE
    apiKey: string | null
    securityKey: string | null
}