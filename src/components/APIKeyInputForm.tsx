import { useEffect, useState } from 'react';
import { Form, Container, Button, Segment, Header } from 'semantic-ui-react'
import { EXCHANGE } from "../../constants/enum";
import { ExchangeAccountInfo } from '../../db/schemas/ExchangeAccountInfo';

const APIKeyInputForm = ({defaultAccountInfo}: any) => {
    const [accountInfo, setAccountInfo] = useState<ExchangeAccountInfo>(defaultAccountInfo);
    const [editMode, setEditMode] = useState<boolean>(false);
    const [title, setTitle] = useState<string>("");
    useEffect(() => {
        setAccountInfo({...defaultAccountInfo});
        setEditMode(false);
        if (accountInfo.exchange === EXCHANGE.UPBIT) {
            setTitle("업비트");
        } else if (accountInfo.exchange === EXCHANGE.BITHUM) {
            setTitle("빗썸");
        } else if (accountInfo.exchange === EXCHANGE.BINANCE) {
            setTitle("BINANCE");
        } else if (accountInfo.exchange === EXCHANGE.BYBIT) {
            setTitle("BYBIT");
        }
        return () => {}
    }, [defaultAccountInfo]);

    const onChange = (e: any, { name, value }: any) => {
        // console.log(`onChange. name: `, name);
        // console.log(`onChange. name: ${name}, value: ${value}`);
        if (name?.includes('apiKey')) {
            accountInfo.apiKey = value;
        } else if (name?.includes('secretKey')) {
            accountInfo.secretKey = value;
        } else if (name?.includes('nickname')) {
            accountInfo.nickname = value;
        }
        setAccountInfo({...accountInfo});
    }

    const onSubmit = () => {
        console.log("onSubmit.")
        window.Main.updateExchangeAccountInfos([accountInfo])
    }

    const onModify = () => {
        console.log("onModify.")
        setEditMode(!editMode);
    }

    const onDelete = () => {
        console.log("onDelete.")
        if (accountInfo._id) {
            window.Main.deleteExchangeAccountInfos([accountInfo._id])
        }
    }

    const onCancle = () => {
        console.log("onCancle.")
        setEditMode(false);
        setAccountInfo({...defaultAccountInfo})
    }
    
    return (
        <Container>
            <Form>
                <Segment>
                    <Header as='h2'>{title}</Header>
                    <Form.Field>
                        <Form.Input
                            label="별칭"
                            placeholder="별칭"
                            name={`nickname`}
                            disabled={!editMode}
                            type={"text"}
                            value={accountInfo.nickname}
                            onChange={onChange}
                        />
                    </Form.Field>
                    <Form.Field>
                        <Form.Input
                            label="API KEY"
                            placeholder="API KEY"
                            name={`apiKey`}
                            disabled={!editMode}
                            type={editMode?"text":"password"}
                            value={accountInfo.apiKey}
                            onChange={onChange}
                        />
                    </Form.Field>
                    <Form.Field>
                        <Form.Input
                            label="SECRET KEY"
                            placeholder="SECRET KEY"
                            name={`secretKey`}
                            disabled={!editMode}
                            type={editMode?"text":"password"}
                            value={accountInfo.secretKey}
                            onChange={onChange}
                        />
                    </Form.Field>
                    {
                        (editMode === true) ?
                            <div>
                                <Button onClick={onCancle}>취소</Button>
                                <Button onClick={onSubmit} floated='right'>등록</Button>
                            </div>
                        : <div>
                            <Button onClick={onModify}>수정</Button>
                            <Button onClick={onDelete}>삭제</Button>
                        </div>
                    }
                </Segment>
            </Form>
        </Container>
    );
};

export default APIKeyInputForm;