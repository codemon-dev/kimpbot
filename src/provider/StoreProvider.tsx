import React, { useEffect } from "react";
import { StoreContext } from "../App"
import { IPC_CMD } from "../../constants/ipcCmd";
import { IExchageRateInfo } from "../../interface/IExchangeRate";

export const StoreProvider = ({ children }: any) => {
    const [exchangeRateInfo, setExchangeRateInfo] = React.useState<IExchageRateInfo>();
    useEffect(() => {
      window.Main.on(IPC_CMD.NOTIFY_EXCHANGE_RATE_INFOS, (exchangeRate: IExchageRateInfo) => {
        setExchangeRateInfo({...exchangeRate})
      });
      window.Main.setExchageRateMonitorOnOff(true);
      return () => {
      }
    }, [])
 
    const IPCSetExchageRateMonitorOnOff = async (onOff: boolean) => {
      console.log("IPCSetExchageRateMonitorOnOff. onOff: ", onOff);
      window.Main.setExchageRateMonitorOnOff(onOff);
    };

    const value: any = {
      exchangeRateInfo,
      IPCSetExchageRateMonitorOnOff: IPCSetExchageRateMonitorOnOff,
    };
  
    return (
      <StoreContext.Provider value={value}>
        {children}
      </StoreContext.Provider>
    );
  };