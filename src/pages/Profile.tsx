import _ from 'lodash';

import React, { useEffect, useState } from 'react';
import { Form, Container, Button, Segment } from 'semantic-ui-react'
import { EXCHANGE } from "../../constants/enum";
import { useStore } from '../hooks/useStore';
import { IPC_CMD } from '../../constants/ipcCmd';
import { ExchangeAccountInfo } from '../../db/schemas/ExchangeAccountInfo';

const Profile = () => {
    const defaultUpbitExchangeAccountInfos: ExchangeAccountInfo[] = [
        {
            userId: "guest",
            exchange: EXCHANGE.UPBIT,
            apiKey: "",
            secretKey: "",
            isConfirmed: false,
        }
    ]
    const defaultBinanceExchangeAccountInfos: ExchangeAccountInfo[] = [
        {
            userId: "guest",
            exchange: EXCHANGE.BINANCE,
            apiKey: "",
            secretKey: "",
            isConfirmed: false,
        }
    ]
    const defaultBybitExchangeAccountInfos: ExchangeAccountInfo[] = [
        {
            userId: "guest",
            exchange: EXCHANGE.BYBIT,
            apiKey: "",
            secretKey: "",
            isConfirmed: false,
        }
    ]    
    const [upbitExchangeAccountInfos, setUpbitExchangeAccountInfos] = useState<ExchangeAccountInfo[]>(defaultUpbitExchangeAccountInfos);    
    const [binanceExchangeAccountInfos, setBinanceExchangeAccountInfos] = useState<ExchangeAccountInfo[]>(defaultBinanceExchangeAccountInfos);
    const [bybitExchangeAccountInfos, setBybitExchangeAccountInfos] = useState<ExchangeAccountInfo[]>(defaultBybitExchangeAccountInfos);
    useEffect(() => {
        window.Main.getExchangeAccountInfos({userId: "guest"});
        return () => {
            console.log("unMount Profile.");
        }
    }, []);

    useEffect(() => {
        window.Main.on(IPC_CMD.STORE_GET_EXCHANGE_ACCOUNT_INFOS, (exchangeAccountInfos: ExchangeAccountInfo[]) => {
            let upbitInfo: ExchangeAccountInfo[] = []
            let binanceInfo: ExchangeAccountInfo[] = []
            let bybitInfo: ExchangeAccountInfo[] = []
            exchangeAccountInfos.forEach((info: ExchangeAccountInfo) => {
                if (info.exchange === EXCHANGE.UPBIT) {
                    upbitInfo.push(info);
                } else if (info.exchange === EXCHANGE.BINANCE) {
                    binanceInfo.push(info);
                }else if (info.exchange === EXCHANGE.BYBIT) {
                    bybitInfo.push(info);
                }
            })
            if (upbitInfo.length === 0) {
                upbitInfo = defaultUpbitExchangeAccountInfos;
            }
            if (binanceInfo.length === 0) {
                binanceInfo = defaultBinanceExchangeAccountInfos;
            }
            if (bybitInfo.length === 0) {
                bybitInfo = defaultBybitExchangeAccountInfos;
            }
            setUpbitExchangeAccountInfos(_.cloneDeep(upbitInfo))
            setBinanceExchangeAccountInfos(_.cloneDeep(binanceInfo))
            setBybitExchangeAccountInfos(_.cloneDeep(bybitInfo))
        });
        return () => {}
    }, [upbitExchangeAccountInfos, binanceExchangeAccountInfos, bybitExchangeAccountInfos])

    const onChange = (e: any, { name, value }: any) => {
        console.log(`onChange. name: `, name);
        console.log(`onChange. name: ${name}, value: ${value}`);
        if (name?.includes('upbit_api_key_')) {
            const index = parseInt(name?.split('upbit_api_key_')[1]);
            upbitExchangeAccountInfos[index].apiKey = value
            setUpbitExchangeAccountInfos([...upbitExchangeAccountInfos])
        } else if (name?.includes('upbit_secret_key_')) {
            const index = parseInt(name?.split('upbit_secret_key_')[1]);
            upbitExchangeAccountInfos[index].secretKey = value
            setUpbitExchangeAccountInfos([...upbitExchangeAccountInfos])
        }

        if (name?.includes('binance_api_key_')) {
            const index = parseInt(name?.split('binance_api_key_')[1]);
            binanceExchangeAccountInfos[index].apiKey = value
            setBinanceExchangeAccountInfos([...binanceExchangeAccountInfos])
        } else if (name?.includes('binance_secret_key_')) {
            const index = parseInt(name?.split('binance_secret_key_')[1]);
            binanceExchangeAccountInfos[index].secretKey = value
            setBinanceExchangeAccountInfos([...binanceExchangeAccountInfos])
        }

        if (name?.includes('bybit_api_key_')) {
            const index = parseInt(name?.split('bybit_api_key_')[1]);
            bybitExchangeAccountInfos[index].apiKey = value
            setBybitExchangeAccountInfos([...bybitExchangeAccountInfos])
        } else if (name?.includes('bybit_secret_key_')) {
            const index = parseInt(name?.split('bybit_secret_key_')[1]);
            bybitExchangeAccountInfos[index].secretKey = value
            setBybitExchangeAccountInfos([...bybitExchangeAccountInfos])
        }
    }

    const onSubmit = (evt: any) => {
        console.log("onSubmit. evt:  ", evt)
        const needToAdd: ExchangeAccountInfo[] = [];
        const needToUpdate: ExchangeAccountInfo[] = [];
        upbitExchangeAccountInfos.forEach((info: ExchangeAccountInfo) => {
            if (info._id) {
                needToUpdate.push(info);
            } else {
                needToAdd.push(info);
            }
        });
        binanceExchangeAccountInfos.forEach((info: ExchangeAccountInfo) => {
            if (info._id) {
                needToUpdate.push(info);
            } else {
                needToAdd.push(info);
            }
        });
        bybitExchangeAccountInfos.forEach((info: ExchangeAccountInfo) => {
            if (info._id) {
                needToUpdate.push(info);
            } else {
                needToAdd.push(info);
            }
        });
        if (needToAdd.length > 0) {
            window.Main.addExchangeAccountInfos(needToAdd)
        }
        if (needToUpdate.length > 0) {
            window.Main.updateExchangeAccountInfos(needToUpdate)
        }
    }
    return (
        <Container>
            <Form onSubmit={onSubmit}>
                {
                    upbitExchangeAccountInfos.map((info: ExchangeAccountInfo, index: number) => {
                        return (
                            <Segment key={`upbit_account_info_${index}`}>
                                <Form.Field>
                                    <Form.Input
                                        label="업비트 API KEY"
                                        placeholder="API KEY"
                                        name={`upbit_api_key_${index}`}
                                        id={`upbit_api_key_${index}`}
                                        value={info.apiKey}
                                        onChange={onChange}
                                    />
                                </Form.Field>
                                <Form.Field>
                                    <Form.Input
                                        label="업비트 SECRET KEY"
                                        placeholder="SECRET KEY"
                                        key={`upbit_secret_key_${index}`}
                                        name={`upbit_secret_key_${index}`}
                                        id={`upbit_secret_key_${index}`}
                                        value={info.secretKey}
                                        onChange={onChange}
                                    />
                                </Form.Field>
                            </Segment>
                        );
                    })
                }
                {
                    binanceExchangeAccountInfos.map((info: ExchangeAccountInfo, index: number) => {
                        return (
                            <Segment key = {`binacne_account_info_${index}`}>
                                <Form.Field>
                                    <Form.Input
                                        label="Binance API KEY"
                                        placeholder="API KEY"
                                        key={`binance_api_key_${index}`}
                                        name={`binance_api_key_${index}`}
                                        id={`binance_api_key_${index}`}                                        
                                        value={info.apiKey}
                                        onChange={onChange}
                                    />
                                </Form.Field>
                                <Form.Field>
                                    <Form.Input
                                        label="Binance SECRET KEY"
                                        placeholder="SECRET KEY"
                                        key={`binance_secret_key_${index}`}
                                        name={`binance_secret_key_${index}`}
                                        id={`binance_secret_key_${index}`}
                                        value={info.secretKey}
                                        onChange={onChange}
                                    />
                                </Form.Field>
                            </Segment>
                        );
                    })
                }
                {
                    bybitExchangeAccountInfos.map((info: ExchangeAccountInfo, index: number) => {
                        return (
                            <Segment key = {`bybit_account_info_${index}`}>
                                <Form.Field>
                                    <Form.Input
                                        label="ByBit API KEY"
                                        placeholder="API KEY"
                                        key={`bybit_api_key_${index}`}
                                        name={`bybit_api_key_${index}`}
                                        id={`bybit_api_key_${index}`}
                                        value={info.apiKey}
                                        onChange={onChange}
                                    />
                                </Form.Field>
                                <Form.Field>
                                    <Form.Input
                                        label="ByBit SECRET KEY"
                                        placeholder="SECRET KEY"
                                        key={`bybit_secret_key_${index}`}
                                        name={`bybit_secret_key_${index}`}
                                        id={`bybit_secret_key_${index}`}
                                        value={info.secretKey}
                                        onChange={onChange}
                                    />
                                </Form.Field>
                            </Segment>
                        );
                    })
                }
                <Button type='submit' floated='right'>등록</Button>
            </Form>
        </Container>
    );
};

export default Profile;