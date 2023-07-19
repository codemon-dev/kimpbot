import _ from 'lodash';

import { useEffect, useState } from 'react';
import { Form, Container, Button, Divider } from 'semantic-ui-react'
import { EXCHANGE } from "../../constants/enum";
import { IPC_CMD } from '../../constants/ipcCmd';
import { ExchangeAccountInfo } from '../../db/schemas/ExchangeAccountInfo';
import { useAuth } from '../hooks/useAuth';
import APIKeyInputForm from './APIKeyInputForm';
import APIKeyRegisteForm from './APIKeyRegisteForm';

const APIKeyInfo = () => {
    const { userInfo, exchangeAccountInfos }: any = useAuth();

    useEffect(() => {
        console.log("Mount APIKeyInfo.");
        return () => {
            console.log("unMount APIKeyInfo.");
        }
    }, []);

    return (
        <Container>
            <APIKeyRegisteForm />
            {   
                exchangeAccountInfos.map((info: ExchangeAccountInfo, index: number) => {
                    return (
                        <div key={index}>
                            <Divider />
                            <APIKeyInputForm defaultAccountInfo={info}/>
                        </div>
                    );
                })
            }
        </Container>
    );
};

export default APIKeyInfo;