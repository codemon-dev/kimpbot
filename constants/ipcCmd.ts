export enum IPC_CMD {
    STORE_GET_EXCHANGE_ACCOUNT_INFOS = "store:get_exchange_account_infos",
    STORE_ADD_EXCHANGE_ACCOUNT_INFOS = "store:add_exchange_account_infos",
    STORE_UPDATE_EXCHANGE_ACCOUNT_INFOS = "store:update_exchange_account_infos",
    STORE_DELETE_EXCHANGE_ACCOUNT_INFOS = "store:delete_exchange_account_infos",
    STORE_DELETE_ALL_EXCHANGE_ACCOUNT_INFOS = "store:delete_all_exchange_account_infos",
    NOTIFY_EXCHANGE_RATE_INFOS = "notify_exchange_rate_infos",
    SET_EXCHANGE_RATE_MONITOR_ON_OFF = "set_exchange_rate_monitor_on_off",
}