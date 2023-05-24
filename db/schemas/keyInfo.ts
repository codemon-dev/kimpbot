import { EXCHANGE } from "../../constants/enum"

export type KeyInfo = {
    userId: string,
    exchange: EXCHANGE,
    apiKey: string,
    secretKey: string,
}
