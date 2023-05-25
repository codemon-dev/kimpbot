import { EXCHANGE } from "../../constants/enum"

export type ExchangeAccountInfo = {
    _id?: string | null,
    userId: string,
    exchange: EXCHANGE,
    isConfirmed: boolean,
    apiKey: string,
    secretKey: string,
}
