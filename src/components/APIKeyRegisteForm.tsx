import { useEffect, useState } from 'react';
import { Form, Container, Button, Segment, Header, Dropdown } from 'semantic-ui-react'
import { EXCHANGE } from "../../constants/enum";
import { ExchangeAccountInfo } from '../../db/schemas/ExchangeAccountInfo';
import { useAuth } from '../hooks/useAuth';

const APIKeyRegisteForm = () => {
    const { userInfo }: any = useAuth();
    const defaultExchangeAccountInfo: ExchangeAccountInfo = {
        nickname: "",
        email: userInfo.email,
        exchange: EXCHANGE.UPBIT,
        isConfirmed: false,
        apiKey: "",
        secretKey: "",
    }
    const [accountInfo, setAccountInfo] = useState<ExchangeAccountInfo>(defaultExchangeAccountInfo);

    const onChange = (e: any, { name, value }: any) => {
        // console.log(`onChange. name: ${name}, value: ${value}`);
        if (name === 'apiKey') {
            accountInfo.apiKey = value;
        } else if (name === 'secretKey') {        
            accountInfo.secretKey = value;
        } else if (name === 'exchange') {
            accountInfo.exchange = value;
        } else if (name === 'nickname') {
            accountInfo.nickname = value;
        }
        setAccountInfo({...accountInfo});
    }

    const onSubmit = (evt: any) => {
        console.log("onSubmit. accountInfo:  ", accountInfo)
        window.Main.addExchangeAccountInfos([accountInfo])
        setAccountInfo({...defaultExchangeAccountInfo});
    }

    const exchangeOptions = [
        {
            key: 'upbit',
            text: '업비트',
            value: EXCHANGE.UPBIT,
            image: { avatar: true, src: '/images/avatar/small/jenny.jpg' },
        },
        {
            key: 'bithum',
            text: '빗썸',
            value: EXCHANGE.BITHUM,
            image: { avatar: true, src: '/images/avatar/small/jenny.jpg' },
        },
        {
            key: 'binance',
            text: '바이낸스',
            value: EXCHANGE.BINANCE,
            image: { avatar: true, src: '/images/avatar/small/elliot.jpg' },
        },
        {
            key: 'bybit',
            text: '바이비트',
            value: EXCHANGE.BYBIT,
            image: { avatar: true, src: '/images/avatar/small/stevie.jpg' },
        },
    ]

    return (
        <Container>
            <Form onSubmit={onSubmit} >
                <Segment>
                <Form.Field>
                    <Form.Input
                        label="별칭"
                        placeholder="별칭"
                        name={`nickname`}
                        type={"text"}
                        value={accountInfo.nickname}
                        onChange={onChange}
                    />
                    </Form.Field>
                    <Form.Field>
                        <Form.Dropdown
                            label="거래소"
                            placeholder='거래소'
                            name="exchange"
                            fluid
                            selection
                            options={exchangeOptions}
                            onChange={onChange}
                        />
                    </Form.Field>
                    <Form.Field>
                        <Form.Input
                            label="API KEY"
                            placeholder="API KEY"
                            name={`apiKey`}
                            type={"text"}
                            value={accountInfo.apiKey}
                            onChange={onChange}
                        />
                    </Form.Field>
                    <Form.Field>
                        <Form.Input
                            label="SECRET KEY"
                            placeholder="SECRET KEY"
                            name={`secretKey`}
                            type={"text"}
                            value={accountInfo.secretKey}
                            onChange={onChange}
                        />
                    </Form.Field>
                    <Button type='submit'>등록</Button>
                </Segment>
            </Form>
        </Container>
    );
};

export default APIKeyRegisteForm;