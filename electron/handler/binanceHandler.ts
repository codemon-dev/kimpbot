import { BrowserWindow } from "electron";
import Binance from "node-binance-api"
import Handlers from "./Handlers";
import { IBestBidAsk, IBinanceAggTrade, IBinanceCoinInfo, IBinanceDeepth, IBinancePriceAmount } from "../../interface/IBinance";


export default class BinanceHander {
    private handlers: Handlers | undefined;
    private binance: Binance | undefined;
    private apiKey: string | undefined;
    private secretKey: string | undefined;

    public binanceCoinInfo: IBinanceCoinInfo | undefined;

    constructor(handlers: Handlers) {
        this.handlers = handlers
        console.log(`create BinanceHander`)
        this.binanceCoinInfo = {
            symbol: "BTCUSDT",
            deepth: { symbol: "", timestamp: -1, receivedAt: -1, bid: [], ask: [] },
            bestBidAsk: { symbol: "", receivedAt:-1, bestAsk: "", bestBid: "", bestAskQty: "", bestBidQty: ""},
            aggregateTrade: { symbol: "", timestamp: -1, receivedAt: -1, isMaker: false, price: "", amount: "" }
        }
        this.start();
    }

    public setAPIKey(apiKey: string, secretKey: string) {        
        this.apiKey = apiKey;
        this.secretKey = secretKey;
    }

    public start = () => {
        this.binance = new Binance();
        this.startHandler();
        // binance = new Binance().options({
        //     APIKEY: apiKey,
        //     APISECRET: secretKey
        // });
        
    }

    public startHandler = () => {
        this.binance?.futuresSubscribe('btcusdt@depth10', (data: any) => {
            if (!this.binanceCoinInfo) {
                return;
            }
            this.binanceCoinInfo.deepth = {
                symbol: data.s,
                timestamp: data.T,
                receivedAt: Date.now(),
                ask: [],
                bid: [],
            }
            
            if (data?.a.length > 0) {
                data.a?.forEach((item: any) => {
                    this.binanceCoinInfo?.deepth?.ask?.push({price: item[0], amount: item[1]});
                });
            }       
            if (data?.b.length > 0) {
                data.b?.forEach((item: any) => {
                    this.binanceCoinInfo?.deepth?.bid?.push({price: item[0], amount: item[1]});
                });
            }    
        });
        this.binance?.futuresBookTickerStream('BTCUSDT', (data: any) => {
            if (!this.binanceCoinInfo) {
                return;
            }
            this.binanceCoinInfo.bestBidAsk = {
                symbol: data.symbol,
                receivedAt: Date.now(),
                bestBid: data.bestBid,
                bestAsk: data.bestAsk,
                bestBidQty: data.bestBidQty,
                bestAskQty: data.bestAskQty,
            }
        });
        
        this.binance?.futuresAggTradeStream('BTCUSDT', (data: any)=> {
            if (!this.binanceCoinInfo) {
                return;
            }
            this.binanceCoinInfo.aggregateTrade = {
                symbol: data.symbol,
                timestamp: data.timestamp,
                receivedAt: Date.now(),
                isMaker: data.maker,
                price: data.price,
                amount: data.amount,
            }
        });
        
        // setInterval(()=> {
        //     console.log(this.binanceCoinInfo)
        // }, 1000)
    }

    
    
    private testfunc = () => {
        // this.binance?.futuresSubscribe('btcusdt@kline_1m', console.log );
        // @futuresSubscribe('btcusdt@kline_1m', console.log );
        // {
        //     e: 'kline',
        //     E: 1685031628181,
        //     s: 'BTCUSDT',
        //     k: [Object: null prototype] {
        //       t: 1685031600000,
        //       T: 1685031659999,
        //       s: 'BTCUSDT',
        //       i: '1m',
        //       f: 3750438422,
        //       L: 3750439702,
        //       o: '26270.20',
        //       c: '26276.80',
        //       h: '26279.10',
        //       l: '26270.20',
        //       v: '152.658',
        //       n: 1281,
        //       x: false,
        //       q: '4011413.06210',
        //       V: '96.228',
        //       Q: '2528547.05620',
        //       B: '0'
        // }
          
        
        // this.binance?.futuresSubscribe('btcusdt@depth10', console.log );
        // @futuresSubscribe('btcusdt@depth10', console.log );
        // {
        //     e: 'depthUpdate',
        //     E: 1685031396492,
        //     T: 1685031396470,
        //     s: 'BTCUSDT',
        //     U: 2880014297310,
        //     u: 2880014304947,
        //     pu: 2880014297049,
        //     b: [
        //       [ '26237.60', '9.248' ],
        //       [ '26237.50', '0.002' ]
        //     ],
        //     a: [
        //       [ '26237.70', '9.168' ],
        //       [ '26237.80', '0.002' ]
        //     ]
        // }

        // this.binance?.futuresMiniTickerStream('BTCUSDT', console.log)
        // @futuresMiniTickerStream('BTCUSDT', console.log)
        // {
        //     eventType: '24hrMiniTicker',
        //     eventTime: 1685031528481,
        //     symbol: 'BTCUSDT',
        //     close: '26252.90',
        //     open: '26180.10',
        //     high: '26489.50',
        //     low: '25850.00',
        //     volume: '403343.944',
        //     quoteVolume: '10587828723.80'
        // }
        // this.binance?.futuresTickerStream('BTCUSDT', console.log)
        
        
        // this.binance?.futuresBookTickerStream('BTCUSDT', console.log)
        // @futuresBookTickerStream('BTCUSDT', console.log)
        // {
        //     updateId: 2880007752225,
        //     symbol: 'BTCUSDT',
        //     bestBid: '26241.30',
        //     bestBidQty: '19.069',
        //     bestAsk: '26241.40',
        //     bestAskQty: '8.763'
        // }



        // this.binance?.futuresBookTickerStream('BTCUSDT', (data: any)=> {
        //     console.log(`futuresBookTickerStream: `, data);
        // } );


        // this.binance?.futuresSubscribe( 'btcusdt@depth10', console.log );

        
        // this.binance?.futuresAggTradeStream(['BTCUSDT', 'ETHUSDT'], (data: any)=> {
        //     console.log(data)
        // } );
        // @futuresAggTradeStream(['BTCUSDT', 'ETHUSDT'], (data: any)=> {
        // {
        //     eventType: 'aggTrade',
        //     eventTime: 1685035616756,
        //     symbol: 'BTCUSDT',
        //     aggTradeId: 1746253287,
        //     price: '26314.20',
        //     amount: '0.274',
        //     total: 7210.090800000001,
        //     firstTradeId: 3750555279,
        //     lastTradeId: 3750555280,
        //     timestamp: 1685035616650,
        //     maker: true
        // }

        // let endpoints = this.binance?.websockets.subscriptions();    
        // for (let endpoint in endpoints) {
        //     console.log(`websockets endpoint: ${endpoint}`);
        //     // this.binance?.websockets.terminate(endpoint);
        // }
        
        // this.binance?.futuresPrices().then(
        //     (data: any) => {
        //         console.log(data);
        //     }
        // ) 

        // this.binance?.futuresAccount().then(
        //     (data: any) => {
        //         console.log(data);
        //     }
        // ) 

        
        // this.binance?.futuresLeverage( 'BTCUSDT', 2 )
        // this.binance?.futuresMarginType( 'BTCUSDT', "CROSSED" )
    }

    
}