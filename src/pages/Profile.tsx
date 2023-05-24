import React, { useEffect, useState } from 'react';
import { Form, Container, Button } from 'semantic-ui-react'
import { API_KEY_INFO } from "../../constants/types";
import { EXCHANGE } from "../../constants/enum";
import { useStore } from '../hooks/useStore';

interface API_KEY_INFOS_INPUT {
    upbitApiKey: string | null,
    upbitSecurityKey: string | null,
    binanceApiKey: string | null,
    binanceSecurityKey: string | null,
}

const Profile = () => {
    const { apiKeyInfos, IPCSetApiKeyInfos }: any = useStore();
    var tempKeyInputValues: API_KEY_INFOS_INPUT = {
        upbitApiKey: "",
        upbitSecurityKey: "",
        binanceApiKey: "",
        binanceSecurityKey: "",
    }
    const [ keyInputValues, setKeyInputValues ] = useState<API_KEY_INFOS_INPUT>(tempKeyInputValues);
    useEffect(() => {
        return () => {
            console.log("unMount Dashboard.");
        }
    }, []);

    useEffect(() => {
        tempKeyInputValues = {...keyInputValues}
        apiKeyInfos?.forEach((info: API_KEY_INFO) => {
            if (info.exchange == EXCHANGE.UPBIT) {
                tempKeyInputValues.upbitApiKey = info.apiKey;
                tempKeyInputValues.upbitSecurityKey = info.securityKey;
            }
            if (info.exchange == EXCHANGE.BINANCE) {
                tempKeyInputValues.binanceApiKey = info.apiKey;
                tempKeyInputValues.binanceSecurityKey = info.securityKey;
            }
        });
        setKeyInputValues(tempKeyInputValues);
        return () => {}
    }, apiKeyInfos)

    const onChange = (e: any, { name, value }: any) => {
        var newKeyInputValues = {...keyInputValues};
        switch (name) {
            case "upbit_api_key":
                newKeyInputValues.upbitApiKey = value;
                break;
            case "upbit_security_key":
                newKeyInputValues.upbitSecurityKey = value;
                break;
            case "binance_api_key":
                newKeyInputValues.binanceApiKey = value;
                break;
            case "binance_security_key":
                newKeyInputValues.binanceSecurityKey = value;
                break;
            default:
                break;
        }
        setKeyInputValues(newKeyInputValues);
    }

    const onSubmit = (evt: any) => {
        console.log("onSubmit. evt:  ", evt)
        const apiKeyInfo: API_KEY_INFO[] = [
            {
                exchange: EXCHANGE.UPBIT,
                apiKey: evt.target[0].value,
                securityKey: evt.target[1].value
            },
            {
                exchange: EXCHANGE.BINANCE,
                apiKey: evt.target[2].value,
                securityKey: evt.target[3].value
            },
            {
                exchange: EXCHANGE.BYBIT,
                apiKey: "",
                securityKey: ""
            }
        ]
        console.log("apiKeyInfo: ", apiKeyInfo)
        IPCSetApiKeyInfos(apiKeyInfo);
    }
    return (
        <Container>
            <Form onSubmit={onSubmit}>
                <Form.Field>
                    <Form.Input
                        label="업비트 API KEY"
                        placeholder="API KEY"
                        name="upbit_api_key"
                        id="upbit_api_key"
                        value={keyInputValues?.upbitApiKey}
                        onChange={onChange}
                    />
                </Form.Field>
                <Form.Field>
                    <Form.Input
                        label="업비트 Security KEY"
                        placeholder="Security KEY"
                        name="upbit_security_key"
                        id="upbit_security_key"
                        value={keyInputValues?.upbitSecurityKey}
                        onChange={onChange}
                    />
                </Form.Field>
                <Form.Field>
                    <Form.Input
                        label="BINANCE API KEY"
                        placeholder="API KEY"
                        name="binance_api_key"
                        id="binance_api_key"
                        value={keyInputValues?.binanceApiKey}
                        onChange={onChange}
                    />
                </Form.Field>
                <Form.Field>
                    <Form.Input
                        label="BINANCE Security KEY"
                        placeholder="Security KEY"
                        name="binance_security_key"
                        id="binance_security_key"
                        value={keyInputValues?.binanceSecurityKey}
                        onChange={onChange}
                    />
                </Form.Field>
                <Button type='submit' floated='right'>등록</Button>
            </Form>
        </Container>
    );
};

export default Profile;