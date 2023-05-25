import React, { useContext, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useStore } from "../hooks/useStore";
import { IExchageRateInfo } from "../../interface/IExchangeRate";
import { Form, Container, Button, Statistic, Table, Divider } from 'semantic-ui-react'
import { useWsTicker, useWsOrderbook } from "use-upbit-api";
import { ITicker } from "use-upbit-api/lib/src/interfaces";
import { IOrderbook } from "use-upbit-api/lib/src/interfaces";
import { StoreContext } from "../App";
//https://github.com/devKangMinHyeok/use-upbit-api

const Dashboard = () => {
    var tempExchangeRateInfo: IExchageRateInfo = {
        code: "",
        date: "",
        time: "",
        price: -1,
        timestamp: -1,  //1684512177277;
    }
    const [targetMarketCodeArr, a] = useState<any>(
        [
        {
            market: 'KRW-BTC',
            korean_name: '비트코인',
            english_name: 'Bitcoin',
        }
    ]
    );
    const [targetMarketCode, b] = useState<any>(
        {
            market: 'KRW-BTC',
            korean_name: '비트코인',
            english_name: 'Bitcoin',
        }
    );
    const { exchangeRateInfo, IPCSetExchageRateMonitorOnOff }: any = useStore();
    const [exchangeRateInfos, setExchangeRateInfos] = useState<IExchageRateInfo>(tempExchangeRateInfo);
    
    const onclickStart = () => {
        IPCSetExchageRateMonitorOnOff(true);
    }
    const onclickStop = () => {
        IPCSetExchageRateMonitorOnOff(false);
    }
    
    const onError = (err: any) => {
        console.log("onError: ", err)
    }
    
    const webSocketOptions = { throttle_time: 400, max_length_queue: 100, debug: true };
    interface TEMP {
        socket: WebSocket | null;
        isConnected: boolean;
        socketData: IOrderbook | undefined;
    }
    const { socket, isConnected, socketData } = useWsTicker(targetMarketCodeArr, onError, webSocketOptions);
    const obj: TEMP = useWsOrderbook(targetMarketCode, onError, webSocketOptions);

    useEffect(() => {
        return () => {
            console.log("unMount Dashboard.");
        }
    }, []);

    useEffect(() => {
        console.log(exchangeRateInfo)
        setExchangeRateInfos({...exchangeRateInfo});
        return () => {}
    }, [exchangeRateInfo]);

    

    return (
        <div>
            <h2>exchangeRateInfo - useStore</h2>
            <div>code: {exchangeRateInfo.code}</div>
            <div>date: {exchangeRateInfo.date}</div>
            <div>time: {exchangeRateInfo.time}</div>
            <div>price: {exchangeRateInfo.price}</div>
            <div>timestamp: {exchangeRateInfo.timestamp}</div>

            <Divider />

            <h2>exchangeRateInfos - useState</h2>
            <div>code: {exchangeRateInfos.code}</div>
            <div>date: {exchangeRateInfos.date}</div>
            <div>time: {exchangeRateInfos.time}</div>
            <div>price: {exchangeRateInfos.price}</div>
            <div>timestamp: {exchangeRateInfos.timestamp}</div>
            
            <Button onClick={onclickStart}>시작</Button>
            <Button onClick={onclickStop}>정지</Button>

            <Divider />

            <Container>
                {socketData?.map((data, index) => (
                    <Statistic.Group key={`socketData_title_${index}`}>
                        <Statistic>
                            <Statistic.Value>{data.code}</Statistic.Value>
                            <Statistic.Label>code</Statistic.Label>
                        </Statistic>
                        <Statistic>
                            <Statistic.Value>{data.trade_price}</Statistic.Value>
                            <Statistic.Label>trade_price</Statistic.Label>
                        </Statistic>
                        <Statistic>
                            <Statistic.Value>{(data.signed_change_rate * 100).toFixed(2)}%</Statistic.Value>
                            <Statistic.Label>signed_change_rate</Statistic.Label>
                        </Statistic>
                    </Statistic.Group>
                ))}
            </Container>
            <Divider />
            <Container>
                <Table celled>
                    <Table.Header>
                        <Table.Row>
                            <Table.HeaderCell>ask_price</Table.HeaderCell>
                            <Table.HeaderCell>ask_size</Table.HeaderCell>
                            <Table.HeaderCell>bid_price</Table.HeaderCell>
                            <Table.HeaderCell>bid_size</Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {obj?.socketData?.orderbook_units.map((data, index) => (
                            <Table.Row key={`orderbook_units_${index}`}>
                                <Table.Cell>{data.ask_price}</Table.Cell>
                                <Table.Cell>{data.ask_size}</Table.Cell>
                                <Table.Cell>{data.bid_price}</Table.Cell>
                                <Table.Cell>{data.bid_size}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
            </Container>
        </div>
    );
};

export default Dashboard;