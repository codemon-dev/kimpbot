import { useEffect, useState, useCallback } from 'react';
import { Statistic, Segment } from 'semantic-ui-react'
import { useStore } from '../hooks/useStore';
import { elapsedTime } from '../../util/timestamp';
import { ICurrencyInfo, ICurrencyInfos} from '../../interface/ICurrency'
import { CURRENCY_SITE_TYPE } from '../../constants/enum';

const MinDashboard = () => {
    const { marketInfo }: any = useStore()
    useEffect(() => {
        return () => {}
    }, []);

    const getElapsedTimeStr = useCallback((timestamp: number) => {
        return elapsedTime(timestamp);
    }, [marketInfo.currencyInfos])

    const currencySiteList = [CURRENCY_SITE_TYPE.DUNAMU, CURRENCY_SITE_TYPE.INVESTRING, CURRENCY_SITE_TYPE.YAHOO, CURRENCY_SITE_TYPE.WEBULL];

    return (
        <Segment>
            <Statistic.Group color={"red"} size={"mini"}>
                {
                    currencySiteList.map((list: CURRENCY_SITE_TYPE) => {
                        if (marketInfo?.currencyInfos[list]) {
                            // console.log(marketInfo?.currencyInfos[list]);
                            return (
                                <Statistic key={list}>
                                    <Statistic.Value>{marketInfo.currencyInfos[list].price.toLocaleString('en-US')}원</Statistic.Value>
                                    <Statistic.Label>{list} - ({getElapsedTimeStr(marketInfo.currencyInfos[list].timestamp)}) 전</Statistic.Label>
                                </Statistic>
                            )
                        }
                        
                    })
                }
                <Statistic>
                    <Statistic.Value>99,999$</Statistic.Value>
                    <Statistic.Label>BTC 가격</Statistic.Label>
                </Statistic>
                <Statistic>
                    <Statistic.Value>99.99%</Statistic.Value>
                    <Statistic.Label>김프(UPBIT-BTCUSDT)</Statistic.Label>
                </Statistic>
            </Statistic.Group>
        </Segment>
    );
};

export default MinDashboard;