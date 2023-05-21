import React, { useEffect } from "react";
import { StoreContext } from "../App"
import { API_KEY_INFO } from "../../constants/types";
import { IPC_CMD } from "../../constants/ipcCmd";
import { IExchageRateInfo } from "../../constants/interface";

export const StoreProvider = ({ children }: any) => {
    const [apiKeyInfos, setApiKeyInfos] = React.useState<API_KEY_INFO[]>([]);
    const [exchangeRateInfo, setExchangeRateInfo] = React.useState<IExchageRateInfo>();
    useEffect(() => {
      window.Main.on(IPC_CMD.STORE_GET_APIKEY_INFOS, (apiKeyInfos: API_KEY_INFO[]) => {
        setApiKeyInfos([...apiKeyInfos]);
      })
      window.Main.on(IPC_CMD.NOTIFY_EXCHANGE_RATE_INFOS, (exchangeRate: IExchageRateInfo) => {
        setExchangeRateInfo({...exchangeRate});
      })
      window.Main.storeGetApiKeyInfos();
      window.Main.setExchageRateMonitorOnOff(true);
      return () => {
      }
    }, [])
    
  
    const IPCSetApiKeyInfos = async (apiKeyInfos: API_KEY_INFO[]) => {
      console.log("IPCSetApiKeyInfos");
      window.Main.storeSetApiKeyInfos(apiKeyInfos);
    };

    const IPCSetExchageRateMonitorOnOff = async (onOff: boolean) => {
      console.log("IPCSetExchageRateMonitorOnOff");
      window.Main.setExchageRateMonitorOnOff(onOff);
    };

    const value: any = {
      apiKeyInfos,
      IPCSetApiKeyInfos: IPCSetApiKeyInfos,
      exchangeRateInfo,
      IPCSetExchageRateMonitorOnOff: IPCSetExchageRateMonitorOnOff,
    };
  
    return (
      <StoreContext.Provider value={value}>
        {children}
      </StoreContext.Provider>
    );
  };