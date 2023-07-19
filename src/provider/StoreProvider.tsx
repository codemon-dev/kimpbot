import React, { useEffect } from "react";
import _ from "lodash";
import { StoreContext } from "../App"
import { IPC_CMD } from "../../constants/ipcCmd";
import { IEnvInfo } from "../../interface/IEnvInfo";
import { COIN_SYMBOL, EXCHANGE } from "../../constants/enum";
import { IMarketInfo } from "../../interface/IMarketInfo";
import { IChartData, IJobWorkerInfo, ITradeJobInfo } from "../../interface/ITradeInfo";
import { useAuth } from "../hooks/useAuth";

export const StoreProvider = ({ children }: any) => {
  const [envInfo, setEnvInfo] = React.useState<IEnvInfo>();
  const [marketInfo, setMarketInfo] = React.useState<IMarketInfo>();
  const [jobWorkerInfos, setJobWorkerInfos] = React.useState<IJobWorkerInfo[]>([]);
  const [tradeJobInfos, setTradeJobInfos] = React.useState<ITradeJobInfo[]>([]);
  const [primiumChartInfo, setPrimiumChartInfo] = React.useState<IChartData>();
  
  
  useEffect(() => {
    console.log("Mount Dashboard.");
    window.Main.on(IPC_CMD.NOTIFY_MARKET_INFO, onNotifyMarketInfo)
    window.Main.on(IPC_CMD.NOTIFY_JOB_WORKERINFOS, onNotifyJobWorkerInfos)
    window.Main.on(IPC_CMD.NOTIFY_TRADE_JOB_INFOS, onNotifyTradeJobInfos)
    window.Main.on(IPC_CMD.NOTIFY_PRIMIUM_CHART_DATA, onNotifyPrimiumChartInfo)
    window.Main.on(IPC_CMD.GET_ENV_INFO, onGetEvnInfo)
    window.Main.on(IPC_CMD.DEBUG_MSG, onGetDebugMsg);
    window.Main.requestMarketInfo({
      symbols: [COIN_SYMBOL.BTC, COIN_SYMBOL.ETH],
      exchanges: [EXCHANGE.UPBIT, EXCHANGE.BINANCE],
      onOff: true
    });
    return () => {
      console.log("unMount Dashboard.");
      window.Main.requestMarketInfo({onOff: false});      
      window.Main.off(IPC_CMD.NOTIFY_MARKET_INFO, onNotifyMarketInfo);
      window.Main.off(IPC_CMD.NOTIFY_JOB_WORKERINFOS, onNotifyJobWorkerInfos)
      window.Main.off(IPC_CMD.NOTIFY_TRADE_JOB_INFOS, onNotifyTradeJobInfos)
      window.Main.off(IPC_CMD.NOTIFY_PRIMIUM_CHART_DATA, onNotifyPrimiumChartInfo);
      window.Main.off(IPC_CMD.GET_ENV_INFO, onGetEvnInfo)
      window.Main.off(IPC_CMD.DEBUG_MSG, onGetDebugMsg);
    }
  }, [])

  const onNotifyMarketInfo = (marketInfo: IMarketInfo) => {
    setMarketInfo({...marketInfo});
  }

  const onNotifyPrimiumChartInfo = (primiumChartInfo: IChartData) => {
    setPrimiumChartInfo({...primiumChartInfo});
  }

  const onNotifyJobWorkerInfos = (jobWorkerInfos: IJobWorkerInfo[]) => {
    // console.log("jobWorkerInfos: ", jobWorkerInfos)
    setJobWorkerInfos(_.cloneDeep(jobWorkerInfos));
  }

  const onNotifyTradeJobInfos = (tradeJobInfos: ITradeJobInfo[]) => {
    setTradeJobInfos(_.cloneDeep(tradeJobInfos));
  }

  const onGetEvnInfo = (envInfo: IEnvInfo) => {
    setEnvInfo({...envInfo});
  }

  const onGetDebugMsg = (msg: string) => {
    console.error(`[DEBUG_MSG] ${msg}`);
  }

  const value: any = {
    envInfo,
    marketInfo,
    jobWorkerInfos,
    tradeJobInfos,
    primiumChartInfo,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};