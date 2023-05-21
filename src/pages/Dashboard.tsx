import React, { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useStore } from "../hooks/useStore";
import { IExchageRateInfo } from "../../interface/IExchangeRate";
import { Form, Container, Button } from 'semantic-ui-react'
const Dashboard = () => {
    const { exchangeRateInfo, IPCSetExchageRateMonitorOnOff }: any = useStore();
    var tempExchangeRateInfo: IExchageRateInfo = {
        code: "",
        date: "",
        time: "",
        price: -1,
        timestamp: -1,  //1684512177277;
    }
    const onclickStart = () => {
        IPCSetExchageRateMonitorOnOff(true);
    }
    const onclickStop = () => {
        IPCSetExchageRateMonitorOnOff(false);
    }
    useEffect(() => {
        return () => {}
    }, []);
    return (
        <div>
            <h2>Dashboard (Protected)</h2>
            <div>code: {exchangeRateInfo.code}</div>
            <div>date: {exchangeRateInfo.date}</div>
            <div>time: {exchangeRateInfo.time}</div>
            <div>price: {exchangeRateInfo.price}</div>
            <div>timestamp: {exchangeRateInfo.timestamp}</div>
            <Button onClick={onclickStart}>시작</Button>
            <Button onClick={onclickStop}>정지</Button>
        </div>
    );
};

export default Dashboard;