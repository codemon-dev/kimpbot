import { EXCHANGE } from "../../constants/enum"

export type ExchangeAccountInfo = {
    _id?: string | null,
    nickname?: string | null,
    email?: string,
    exchange: EXCHANGE,
    isConfirmed: boolean,
    apiKey: string,
    secretKey: string,
}