import { useEffect, useState } from 'react';
import { Statistic, Segment, Button, Table, Dropdown, Icon} from 'semantic-ui-react'
import { COIN_SYMBOL, EXCHANGE, EXCHANGE_TYPE } from '../../constants/enum';
import { CoinInfo } from '../../interface/IMarketInfo';

interface IExchangeInfoCompProps {
    onChangeExchange: any;
    exchangeType: EXCHANGE_TYPE;
    exchangeOption: any;
    coinInfo: CoinInfo;
}
const ExchangeInfoComp = ({exchangeType, exchangeOption, coinInfo, onChangeExchange}: IExchangeInfoCompProps) => {
    return (
        <div>
            <Dropdown
                placeholder={exchangeType=== EXCHANGE_TYPE.DOMESTIC? '국내 거래소': '해외 거래소'}
                name={exchangeType=== EXCHANGE_TYPE.DOMESTIC? 'domesticExchange': 'overseaExchange'}
                openOnFocus
                selection
                options={exchangeOption}
                defaultValue={exchangeOption[0].value}
                onChange={onChangeExchange}
            />
            <Table celled>
                <Table.Body>
                    <Table.Row>
                        <Table.Cell style={{width: '100px'}}>{coinInfo.symbol} 현재 가격</Table.Cell>
                        <Table.Cell>{coinInfo.price?.toLocaleString()}</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                        <Table.Cell style={{width: '100px'}}>매도 호가</Table.Cell>
                        <Table.Cell>{coinInfo.sellPrice?.toLocaleString()}</Table.Cell>
                        <Table.Cell>{coinInfo.sellQty?.toLocaleString()}</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                        <Table.Cell style={{width: '100px'}}>매수 호가</Table.Cell>
                        <Table.Cell>{coinInfo.buyPrice?.toLocaleString()}</Table.Cell>
                        <Table.Cell>{coinInfo.buyQty?.toLocaleString()}</Table.Cell>
                    </Table.Row>
                </Table.Body>
            </Table>
        </div>
    );
};

export default ExchangeInfoComp;