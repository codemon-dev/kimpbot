import _, { values } from "lodash";
import { useEffect, useState, useRef, useCallback } from 'react';
import { Header, Segment, Grid, Form, Dropdown, Table, Button, GridRow, Divider, Card, Message} from 'semantic-ui-react'
import { COIN_PAIR, COIN_SYMBOL, CURRENCY_SITE_TYPE, EXCHANGE, EXCHANGE_TYPE } from '../../constants/enum';
import ExchangeInfoComp from './ExchangeInfoComp';
import { CoinInfo, IMarketInfo } from '../../interface/IMarketInfo';
import { useStore } from "../hooks/useStore";
import { ENTER_PRIORITY, IJobWorker, IJobWorkerInfo, JOB_TYPE, JobConfig, ITradeInfo, ITradeJobInfo, COMPLETE_TYPE } from "../../interface/ITradeInfo";
import { useAuth } from "../hooks/useAuth";
import { ExchangeAccountInfo } from "../../db/schemas/ExchangeAccountInfo";
import { calculatePrimium, calculateTether } from "../../util/tradeUtil";
import { convertLocalTime, elapsedTime } from "../../util/timestamp";

interface DropdownOption {
    key: string;
    text: string;
    value: string;
    image?: {
        avatar: boolean;
        src: string;
    };
}

const MarketDetail = () => {
    const { userInfo, exchangeAccountInfos }: any = useAuth();
    const { marketInfo, jobWorkerInfos, tradeJobInfos }: any = useStore();
    const defaultExchangeAccountInfo: ExchangeAccountInfo = {
        _id: null,
        nickname: null,
        email: "",
        exchange: EXCHANGE.UPBIT,
        isConfirmed: false,
        apiKey: "",
        secretKey: "",
    }
    const domesticExchangeOptions: DropdownOption[] = [
        { key: 'upbit', text: '업비트', value: EXCHANGE.UPBIT, image: { avatar: true, src: '/images/avatar/small/jenny.jpg' },},
        { key: 'bithum', text: '빗썸', value: EXCHANGE.BITHUM, image: { avatar: true, src: '/images/avatar/small/elliot.jpg' }, },
    ];
    const overseaExchangeOptions: DropdownOption[] = [
        { key: 'binance', text: 'BINANCE', value: EXCHANGE.BINANCE, image: { avatar: true, src: '/images/avatar/small/elliot.jpg' }, },
        { key: 'bybit', text: 'BYBIT', value: EXCHANGE.BYBIT, image: { avatar: true, src: '/images/avatar/small/stevie.jpg' }, },
    ];
    const symbolOptions: DropdownOption[] = [
        { key: 'btc', text: 'BTC', value: COIN_SYMBOL.BTC, image: { avatar: true, src: '/images/avatar/small/elliot.jpg' }, },
        { key: 'eth', text: 'ETH', value: COIN_SYMBOL.ETH, image: { avatar: true, src: '/images/avatar/small/stevie.jpg' }, },
    ];
    const defaultDomesticCoinIfo = {coinPair: COIN_PAIR.BTCKRW, symbol: COIN_SYMBOL.BTC, exchange: EXCHANGE.UPBIT, exchangeType: EXCHANGE_TYPE.DOMESTIC, price: 0, sellPrice: 0, sellQty: 0, buyPrice: 0, buyQty: 0, orderBook: {ask: [], bid: [], timestamp: 0}};
    const defaultOverseaCoinIfo = {coinPair: COIN_PAIR.BTCUSDT, symbol: COIN_SYMBOL.BTC, exchange: EXCHANGE.BINANCE, exchangeType: EXCHANGE_TYPE.OVERSEA, price: 0, sellPrice: 0, sellQty: 0, buyPrice: 0, buyQty: 0, orderBook: {ask: [], bid: [], timestamp: 0}};

    const [domesticAPIKeyOptions, setDomesticAPIKeyOptions] = useState<DropdownOption[]>([])
    const [overseaAPIKeyOptions, setOverseaAPIKeyOptions] = useState<DropdownOption[]>([])
    const [jobWorkers, setJobWorkers] = useState<IJobWorkerInfo[]>([]);
    const [tradeJobs, setTradeJobs] = useState<ITradeJobInfo[]>([]);
    
    const symbolRef = useRef<COIN_SYMBOL>(COIN_SYMBOL.BTC);
    const [enterPrimium, setEnterPrimium] = useState("%");
    const [exitPrimium, setExitPrimium] = useState("%");
    const [enterThether, setEnterThether] = useState("");
    const [exitThether, setExitThether] = useState("");
    
    const [domesticAccountInfo, setDomesticAccountInfo] = useState<ExchangeAccountInfo>(defaultExchangeAccountInfo)
    const [overseaAccountInfo, setOverseaAccountInfo] = useState<ExchangeAccountInfo>(defaultExchangeAccountInfo)
    const [domesticCoinInfo, setDomesticCoinInfo] = useState<CoinInfo>(defaultDomesticCoinIfo);
    const [overseaCoinInfo, setOverseaCoinInfo] = useState<CoinInfo>(defaultOverseaCoinIfo);

    const currencyList: CURRENCY_SITE_TYPE[] = [CURRENCY_SITE_TYPE.WEBULL, CURRENCY_SITE_TYPE.YAHOO, CURRENCY_SITE_TYPE.INVESTRING, CURRENCY_SITE_TYPE.DUNAMU];

    useEffect(() =>{
        if (marketInfo.coinInfos.length <= 0) {
            return;
        }
        // setEnterPrimium(`${marketInfo.enterPrimium.toLocaleString()}%`);
        // setExitPrimium(`${marketInfo.exitPrimium.toLocaleString()}%`);
        if (marketInfo.coinInfos[domesticCoinInfo.coinPair]) {            
            setDomesticCoinInfo({...marketInfo.coinInfos[domesticCoinInfo.coinPair]});
        }
        if (marketInfo.coinInfos[overseaCoinInfo.coinPair]) {
            setOverseaCoinInfo({...marketInfo.coinInfos[overseaCoinInfo.coinPair]});
        }
        for (const site of currencyList) {
            if (site === CURRENCY_SITE_TYPE.WEBULL && marketInfo.currencyInfos[site]) {
                setEnterPrimium(`${calculatePrimium(domesticCoinInfo.sellPrice, overseaCoinInfo.buyPrice, marketInfo.currencyInfos[site]?.price)?.toFixed(2)}%`);
                setExitPrimium(`${calculatePrimium(domesticCoinInfo.buyPrice, overseaCoinInfo.sellPrice, marketInfo.currencyInfos[site]?.price)?.toFixed(2)}%`);
                setEnterThether(`${calculateTether(parseFloat(enterPrimium), marketInfo.currencyInfos[site]?.price)?.toFixed(2)}`);
                setExitThether(`${calculateTether(parseFloat(exitPrimium), marketInfo.currencyInfos[site]?.price)?.toFixed(2)}`);
                break;
            }
        }
        return () => {
        }
    }, [marketInfo])

    useEffect(() =>{    
        // console.log("jobWorkerInfos changed.", jobWorkerInfos)    
        setJobWorkers(_.cloneDeep(jobWorkerInfos));
        return () => {
        }
    }, [jobWorkerInfos])

    useEffect(() =>{    
        // console.log("tradeJobInfos changed.", tradeJobInfos)    
        setTradeJobs(_.cloneDeep(tradeJobInfos));
        return () => {
        }
    }, [tradeJobInfos])

    useEffect(() => {
        const domesticAPIKeyOptions: DropdownOption[] = [];
        const overseaAPIKeyOptions: DropdownOption[] = [];
        if (!exchangeAccountInfos || exchangeAccountInfos?.length === 0) {
            return;
        }
        exchangeAccountInfos?.forEach((exchangeAccountInfo: ExchangeAccountInfo) => {
            let dropdownOption: DropdownOption = {
                key: exchangeAccountInfo._id ?? "",
                text: `[${exchangeAccountInfo.nickname}]_${exchangeAccountInfo.apiKey.slice(0,3)}...${exchangeAccountInfo.apiKey.slice(exchangeAccountInfo.apiKey.length-3,exchangeAccountInfo.apiKey.length)}`,
                value: exchangeAccountInfo._id??""
            }
            if (exchangeAccountInfo.exchange === EXCHANGE.UPBIT || exchangeAccountInfo.exchange === EXCHANGE.BITHUM) {
                domesticAPIKeyOptions.push(dropdownOption);
            } else if (exchangeAccountInfo.exchange === EXCHANGE.BINANCE || exchangeAccountInfo.exchange === EXCHANGE.BYBIT) {
                overseaAPIKeyOptions.push(dropdownOption);
            }
        });
        setDomesticAPIKeyOptions(_.cloneDeep(domesticAPIKeyOptions));
        setOverseaAPIKeyOptions(_.cloneDeep(overseaAPIKeyOptions));
        
        setDomesticAccountInfo(defaultExchangeAccountInfo);
        setOverseaAccountInfo(defaultExchangeAccountInfo);
    }, [exchangeAccountInfos])

    const calculateExitTargetPrimium = useCallback((targetExitPrimium: number, enteredCurrencyPrice: number) => {
        return ((1.0 + targetExitPrimium * 0.01) * enteredCurrencyPrice / marketInfo.currencyInfos[CURRENCY_SITE_TYPE.WEBULL]?.price - 1) * 100;
    }, [tradeJobInfos, marketInfo])
    
    
    const onSubmit = (evt: any) => {
        console.log("onSubmit.", evt)
        if (!domesticAccountInfo._id || !overseaAccountInfo._id) {
            return;
        }

        // 거래 최대 금액
        if (!evt.target[0].value || evt.target[0].value < 5000) {
            return;
        }

        // 레버리지
        if (!evt.target[1].value || evt.target[1].value > 20) {
            return;
        }

        // 분할매수
        if (!evt.target[2].value || evt.target[2].value < 0.001) {
            return;
        }

        // 지입 탈출 김프
        if (!evt.target[3].value || !evt.target[4].value) {
            return;
        }

        // api key
        // if (!evt.target[5].value || !evt.target[6].value) {
        //     return;
        // }

        const jobConfig: JobConfig = {
            maxInputAmount: parseInt(evt.target[0].value) ?? 0,
            leverage: parseInt(evt.target[1].value) ?? 0,
            splitTradeQty: parseFloat(evt.target[2].value) ?? 0.001,
            useCurrencyHedge: true,
            enterPriority: ENTER_PRIORITY.QTY,
        }

        const jobWorker: IJobWorker = {
            userUID: userInfo?.uid,
            userEmail: userInfo?.email,
            exchangeAccountInfoId_1: domesticAccountInfo._id,
            exchangeAccountInfoId_2: overseaAccountInfo._id,

            exchangeAccountInfo_1: domesticAccountInfo,
            exchangeAccountInfo_2: overseaAccountInfo,

            jobType: JOB_TYPE.KIMP_TRADE,
            config: jobConfig,

            coinPair_1: domesticCoinInfo.coinPair,
            coinPair_2: overseaCoinInfo.coinPair,
        
            symbol_1: domesticCoinInfo.symbol,
            symbol_2: overseaCoinInfo.symbol,

            tradeJobInfos: [],
        
            enterTargetPrimium: parseFloat(evt.target[3].value) ?? -99999.0,
            exitTargetPrimium: parseFloat(evt.target[4].value) ?? 99999.0,
        }
        window.Main.addJobWorker(jobWorker);
    }

    const onChange = (e: any, { name, value }: any) => {
        console.log(`onChange. name: ${name}, value: ${value}`);
    }

    const onChangeCoinSymbol = (e: any, { name, value }: any) => {
        console.log(`onChangeCoinSymbol. name: ${name}, value: ${value}`);
        if (name === "coinSymbol") {
            symbolRef.current = value;
            let newCoinInfo: CoinInfo | undefined;
            if (value === COIN_SYMBOL.BTC) {
                newCoinInfo = defaultDomesticCoinIfo;
                newCoinInfo.coinPair = COIN_PAIR.BTCKRW;
                newCoinInfo.symbol = COIN_SYMBOL.BTC;
                setDomesticCoinInfo({...newCoinInfo});
                newCoinInfo = defaultOverseaCoinIfo;
                newCoinInfo.coinPair = COIN_PAIR.BTCUSDT;
                newCoinInfo.symbol = COIN_SYMBOL.BTC;
                setOverseaCoinInfo({...newCoinInfo});
            } else if (value === COIN_SYMBOL.ETH) {
                newCoinInfo = defaultDomesticCoinIfo;
                newCoinInfo.coinPair = COIN_PAIR.ETHKRW;
                newCoinInfo.symbol = COIN_SYMBOL.ETH;
                setDomesticCoinInfo({...newCoinInfo});
                newCoinInfo = defaultOverseaCoinIfo;
                newCoinInfo.coinPair = COIN_PAIR.ETHUSDT;
                newCoinInfo.symbol = COIN_SYMBOL.ETH;
                setOverseaCoinInfo({...newCoinInfo});
            }
        }
    }

    const onChangeExchange = (e: any, { name, value }: any) => {
        console.log(`onChangeExchange. name: ${name}, value: ${value}`);
        if (name === "domesticExchange") {            
        } else if (name === "overseaExchange") {
        }
    }

    const onChangeAPIKey = (e: any, { name, value }: any) => {
        console.log(`onChangeAPIKey. name: ${name}, value: ${value}`);
        if (!exchangeAccountInfos || exchangeAccountInfos.length === 0) {
            return;
        }
        let foundAccountInfo: any;
        exchangeAccountInfos?.forEach((accountInfo: ExchangeAccountInfo) => {
            if (value === accountInfo._id) {
                foundAccountInfo = _.cloneDeep(accountInfo);
            }
        })
        if (!foundAccountInfo) {
            console.error("Fail to find accountInfo. skip onChangeAPIKey")
            return;
        }
        if (name === "domesticAPIKey") { 
            setDomesticAccountInfo({...foundAccountInfo});
        } else if (name === "overseaAPIKey") {
            setOverseaAccountInfo({...foundAccountInfo});
        }
    }

    const onclickJobworkerDelete = (e: any, { name }: any) => {
        console.log(`onclickJobworkerDelete`)
        window.Main.deleteJobWorker(name);
    }

    const onclickJobworkerStart = (e: any, { name }: any) => {
        console.log(`onclickJobworkerStart`);
        let index = (jobWorkerInfos as IJobWorkerInfo[]).findIndex((jobWorkerInfo: IJobWorkerInfo) => jobWorkerInfo._id === name);
        if (index === -1) {
            return;
        }
        window.Main.startJobWorkers([jobWorkerInfos[index]]);
    }

    const onclickJobworkerStop = (e: any, { name }: any) => {
        console.log(`onclickJobworkerStop`)
        window.Main.stopJobWorkers([name]);
    }

    const getLocalTimeStr = useCallback((timestamp: number) => {
        return convertLocalTime(timestamp);
    }, [tradeJobInfos])


    const getElapsedTimeStr = useCallback((timestamp1: number, timestamp2: number) => {
        return elapsedTime(timestamp1, timestamp2);
    }, [tradeJobInfos])
    
    
    return (
        <Segment>
            <Grid columns={2} divided>
                <Grid.Row>
                    <Grid columns={2}>
                        <Grid.Row>
                            <Grid.Column>
                                <Dropdown
                                    placeholder='코인'
                                    name="coinSymbol"
                                    openOnFocus
                                    selection
                                    options={symbolOptions}
                                    onChange={onChangeCoinSymbol}
                                    defaultValue={symbolOptions[0].value}
                                />
                            </Grid.Column>
                        </Grid.Row>
                        <Grid.Row>
                            <Grid.Column>
                                <ExchangeInfoComp 
                                    exchangeType={EXCHANGE_TYPE.DOMESTIC} 
                                    exchangeOption={domesticExchangeOptions}
                                    coinInfo={domesticCoinInfo}
                                    onChangeExchange={onChangeExchange}/>
                            </Grid.Column>
                            <Grid.Column>
                                <ExchangeInfoComp 
                                    exchangeType={EXCHANGE_TYPE.OVERSEA} 
                                    exchangeOption={overseaExchangeOptions}
                                    coinInfo={overseaCoinInfo}
                                    onChangeExchange={onChangeExchange}/>
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                    <Grid.Column>
                        <Table celled>
                            <Table.Body>
                                <Table.Row>
                                    <Table.Cell>실시간 진입 김프</Table.Cell>
                                    <Table.Cell>{enterPrimium}</Table.Cell>
                                    <Table.Cell>실시간 탈출 김프</Table.Cell>
                                    <Table.Cell>{exitPrimium}</Table.Cell>
                                </Table.Row>
                                <Table.Row>
                                    <Table.Cell>실시간 진입 테더</Table.Cell>
                                    <Table.Cell>{enterThether}</Table.Cell>
                                    <Table.Cell>실시간 탈출 테더</Table.Cell>
                                    <Table.Cell>{exitThether}</Table.Cell>
                                </Table.Row>
                            </Table.Body>
                        </Table>
                        
                        <Form onSubmit={onSubmit}>
                            <Segment>
                                <Header as='h2'>자동 김프거래 설정</Header>
                                <Form.Group widths='equal'>
                                    <Form.Input
                                        label="최대 진입 금액(국내기준 원화)"
                                        name={`maxInputAmount`}
                                        type={"number"}
                                        // value={accountInfo.apiKey}
                                        onChange={onChange}
                                    />
                                    <Form.Input
                                        label="해외 레버리지"
                                        name={`leverage`}
                                        type={"number"}
                                        // value={accountInfo.apiKey}
                                        onChange={onChange}
                                    />
                                    <Form.Input
                                        label="분할매수 수량(BTC)"
                                        name={`splitTradeQty`}
                                        type={"number"}
                                        step={"0.001"}
                                        // value={accountInfo.apiKey}
                                        onChange={onChange}
                                    />
                                </Form.Group>
                                <Form.Group widths='equal'>
                                    <Form.Input
                                        label="진입 김프 (%)"
                                        name={`enterTargetPrimium`}
                                        type={"number"}
                                        step={"0.01"}
                                        // value={accountInfo.apiKey}
                                        onChange={onChange}
                                    />
                                    <Form.Input
                                        label="탈출 김프 (%)"
                                        name={`exitTargetPrimium`}
                                        type={"number"}
                                        step={"0.01"}
                                        // value={accountInfo.secretKey}
                                        onChange={onChange}
                                    />
                                </Form.Group>
                                <Form.Group widths='equal'>
                                    <Form.Dropdown
                                        label="국내 API KEY"
                                        placeholder="국내 API KEY"
                                        name="domesticAPIKey"
                                        selection
                                        options={domesticAPIKeyOptions}
                                        onChange={onChangeAPIKey}
                                        disabled={domesticAPIKeyOptions.length===0}
                                    />
                                    <Form.Dropdown
                                        label="해외 API KEY"
                                        placeholder="해외 API KEY"
                                        name="overseaAPIKey"
                                        selection
                                        options={overseaAPIKeyOptions}
                                        onChange={onChangeAPIKey}
                                        disabled={overseaAPIKeyOptions.length===0}
                                    />
                                </Form.Group>
                                
                                <Button type='submit'>등록</Button>
                            </Segment>
                        </Form>
                    </Grid.Column>
                </Grid.Row>
                <Divider />
                <Grid.Row >
                    <Grid.Column>
                        <Card.Group>
                            {   
                                jobWorkers?.map((jobWorkerInfo: IJobWorkerInfo, index: number) => {
                                    return (
                                        <Card key={`jobWorker_${jobWorkerInfo._id}`}>
                                            <Card.Content>
                                                <Card.Header>id: {jobWorkerInfo._id}</Card.Header>
                                                <Card.Meta>isStarted: {jobWorkerInfo.isStarted === true? "true": "false"}</Card.Meta>
                                                <Card.Description>
                                                    <p>진입 설정 김프: {jobWorkerInfo.enterTargetPrimium}%, 탈출 설정 김프: {jobWorkerInfo.exitTargetPrimium}%</p>
                                                    <p>최대 진입 설정 금액: {jobWorkerInfo.config.maxInputAmount?.toLocaleString()}원</p>
                                                    <p>레버리지: {jobWorkerInfo.config.leverage}배, 분할 매수 수량: {jobWorkerInfo.config.splitTradeQty}</p>
                                                    {
                                                        (jobWorkerInfo.assetInfo) ? 
                                                        <div>
                                                            <Divider />
                                                            <p>[국내] 자산: {Math.round(jobWorkerInfo.assetInfo?.balance_1 ?? 0).toLocaleString()}원 | 보유 코인: {jobWorkerInfo.assetInfo?.coinQty_1}{jobWorkerInfo.assetInfo?.symbol} | 수익: {jobWorkerInfo.assetInfo?.pnl_1.toLocaleString()}원</p>
                                                            <p>[해외] 자산: {jobWorkerInfo.assetInfo?.balance_2.toFixed(3).toLocaleString()}USDT | 마진 포지션: {jobWorkerInfo.assetInfo?.margin_2.toFixed(3).toLocaleString()}USDT | 수익: {jobWorkerInfo.assetInfo?.pnl_2.toFixed(3).toLocaleString()}USDT</p>
                                                            <Divider />
                                                            <p>총 자산: {Math.round((jobWorkerInfo.assetInfo?.balance_1 ?? 0) + ((jobWorkerInfo.assetInfo?.balance_2 ?? 0) * (jobWorkerInfo.assetInfo?.currencyPrice ?? 0)) 
                                                            + ((jobWorkerInfo.assetInfo?.coinQty_1?? 0) * (jobWorkerInfo.assetInfo?.price_1 ?? 0)) + ((jobWorkerInfo.assetInfo?.margin_2?? 0) * (jobWorkerInfo.assetInfo?.currencyPrice ?? 0))
                                                            + ((jobWorkerInfo.assetInfo?.margin_2?? 0) * (jobWorkerInfo.assetInfo?.currencyPrice ?? 0)) + (jobWorkerInfo.assetInfo?.pnl_2?? 0)).toLocaleString()}원 
                                                            | 수익: {Math.round((jobWorkerInfo.assetInfo?.pnl_1?? 0) + ((jobWorkerInfo.assetInfo?.pnl_2 ?? 0) * (jobWorkerInfo.assetInfo?.currencyPrice ?? 0))).toLocaleString()}원</p>
                                                        </div>
                                                        : <div></div>
                                                    }
                                                    
                                                </Card.Description>
                                            </Card.Content>
                                            <Card.Content extra>
                                                <div>
                                                    <Button name={jobWorkerInfo._id} onClick={onclickJobworkerDelete}>삭제</Button>
                                                    <Button name={jobWorkerInfo._id} onClick={onclickJobworkerStart}>시작</Button>
                                                    <Button name={jobWorkerInfo._id} onClick={onclickJobworkerStop}>정지</Button>
                                                </div>
                                            </Card.Content>
                                        </Card>)
                                })
                            }
                        </Card.Group>
                    </Grid.Column>
                    <Grid.Column style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <div>
                            {   
                            tradeJobInfos?.map((tradeJobInfo: ITradeJobInfo, index: number) => {
                                const profitDomastic: number = tradeJobInfo.exitTradeStatus.totalVolume_1 - tradeJobInfo.enterTradeStatus.totalVolume_1;
                                const profitOversea: number = Math.round(((tradeJobInfo.enterTradeStatus.totalVolume_2 * tradeJobInfo.enteredCurrencyPrice) - (tradeJobInfo.exitTradeStatus.totalVolume_2 * tradeJobInfo.exitedCurrencyPrice)));
                                const totalFee: number = tradeJobInfo.enterTradeStatus.totalFee_1 + tradeJobInfo.exitTradeStatus.totalFee_1 + ((tradeJobInfo.enterTradeStatus.totalFee_2 + tradeJobInfo.exitTradeStatus.totalFee_2) * tradeJobInfo.exitedCurrencyPrice)
                                const profitRate: number = (profitDomastic + profitOversea - totalFee) / (tradeJobInfo.enterTradeStatus.totalVolume_1 + (tradeJobInfo.enterTradeStatus.totalVolume_2 * tradeJobInfo.enteredCurrencyPrice)) * 100
                                return (
                                    <div key={`jobWorker_${index}`}>
                                        {
                                        (tradeJobInfo.enterTradeStatus.totalQty_1 > 0 || tradeJobInfo.enterTradeStatus.totalQty_2 > 0)
                                            ?   <div>
                                                    <Divider />
                                                    <Message>
                                                        <Message.Header>진입 ({getLocalTimeStr(tradeJobInfo.enterTradeStatus.timestamp)})</Message.Header>                                                                                                    
                                                        <p> 진입(국내): {tradeJobInfo.enterTradeStatus?.totalQty_1}BTC | 평균가격: {tradeJobInfo.enterTradeStatus?.avgPrice_1.toLocaleString()}원</p>
                                                        <p> 총 진입 금액: {tradeJobInfo.enterTradeStatus?.totalVolume_1?.toLocaleString()}원 | 진입 수수료: {tradeJobInfo.enterTradeStatus.totalFee_1?.toLocaleString()}원</p>
                                                        <Divider />
                                                        <p> 진입(해외): {tradeJobInfo.enterTradeStatus?.totalQty_2}BTC, 평균가격: {tradeJobInfo.enterTradeStatus?.avgPrice_2.toLocaleString()}USDT</p>
                                                        <p> 총 진입 금액: {tradeJobInfo.enterTradeStatus?.totalVolume_2?.toLocaleString()}USDT, 진입 수수료: {tradeJobInfo.enterTradeStatus.totalFee_2?.toLocaleString()}USDT</p>
                                                        <Divider />
                                                        <p> 진입 김프: {tradeJobInfo.enteredPrimium.toFixed(3)}% | 진입 환율: {tradeJobInfo.enteredCurrencyPrice.toFixed(3)}원 | 진입 테더: {tradeJobInfo.enteredThether.toFixed(3).toLocaleString()}원</p>
                                                        {
                                                            tradeJobInfo.exitCompleteType === COMPLETE_TYPE.NONE 
                                                            ? <p> 변동 탈출 목표 김프: {calculateExitTargetPrimium(tradeJobInfo.targetExitPrimium, tradeJobInfo.enteredCurrencyPrice).toFixed(3)}% | 탈출 목표 테더: {tradeJobInfo.targetExitTheTher.toFixed(2).toLocaleString()}원 </p>
                                                            : <p> 탈출 시작 김프: {tradeJobInfo.exitStartPrimium.toFixed(3)}% | 탈출 목표 테더: {tradeJobInfo.targetExitTheTher.toFixed(2).toLocaleString()}원 </p>
                                                        }
                                                        {
                                                            (tradeJobInfo.exitTradeStatus.totalQty_1 > 0 || tradeJobInfo.exitTradeStatus.totalQty_2 > 0)
                                                            ?   <div>
                                                                    <Divider />
                                                                    <Message.Header>탈출 ({getLocalTimeStr(tradeJobInfo.exitTradeStatus.timestamp)}) | {getElapsedTimeStr(tradeJobInfo.enterTradeStatus.timestamp, tradeJobInfo.exitTradeStatus.timestamp)} 소요</Message.Header>
                                                                    <p> 탈출(국내): {tradeJobInfo.exitTradeStatus?.totalQty_1}BTC | 평균가격: {tradeJobInfo.exitTradeStatus?.avgPrice_1.toLocaleString()}원</p>
                                                                    <p> 총 탈출 금액: {tradeJobInfo.exitTradeStatus?.totalVolume_1?.toLocaleString()}원 | 탈출 수수료: {tradeJobInfo.exitTradeStatus.totalFee_1?.toLocaleString()}원</p>
                                                                    <Divider />
                                                                    <p> 탈출(해외): {tradeJobInfo.exitTradeStatus?.totalQty_2}BTC, 평균가격: {tradeJobInfo.exitTradeStatus?.avgPrice_2.toLocaleString()}USDT</p>
                                                                    <p> 총 탈출 금액: {tradeJobInfo.exitTradeStatus?.totalVolume_2?.toLocaleString()}USDT, 탈출 수수료: {tradeJobInfo.exitTradeStatus.totalFee_2?.toLocaleString()}USDT</p>
                                                                    <Divider />
                                                                    <p> 탈출 김프: {tradeJobInfo.exitedPrimium.toFixed(3)}% | 탈출 환율: {tradeJobInfo.exitedCurrencyPrice.toFixed(3)}원 | 탈출 테더: {tradeJobInfo.exitedThether.toFixed(3).toLocaleString()}원</p>
                                                                    <Divider />
                                                                    <p> 국내 수익: {profitDomastic.toLocaleString()}원 / 해외 수익: {profitOversea.toLocaleString()}원 / 수수료: -{totalFee.toLocaleString()}원</p>
                                                                    <p> 총 수익: {(profitDomastic + profitOversea - totalFee).toLocaleString()}원 ({profitRate.toFixed(4)}%)</p>
                                                                </div>
                                                            :  <div></div>
                                                        }
                                                    </Message>
                                                </div>
                                            :  <div></div>
                                        }
                                    </div>
                                )
                            })
                        }
                        </div>
                    </Grid.Column>
                </Grid.Row>
            </Grid>
        </Segment>
        
    );
};

export default MarketDetail;