import { BrowserWindow } from "electron";
import Binance from "node-binance-api"
import Handlers from "./Handlers";


export default class BinanceHander {
    handlers: Handlers | undefined;

    constructor(handlers: Handlers) {
        this.handlers = handlers
        console.log(`create BinanceHander`)
    }

    binance = new Binance().options({
        APIKEY: 'rjqZ944W3JhcywSLBDz78gGj0s0pQkxYN9BXeSIST8OU5kEQrJugydfaFzsAYVQW',
        APISECRET: 'ASuhkuPKt4Ji51yG3Oc6zDIeQZJ2aJxAomDQia6RqBuKgZgbf7B09z4kCKaDtYIg'
    });
    testfunc() {
        this.binance.futuresMiniTickerStream( 'BTCUSDT', (data: any)=> {
            //console.log(data)
        } );
        let endpoints = this.binance.websockets.subscriptions();
        for ( let endpoint in endpoints ) {
            console.log(endpoint);
            //binance.websockets.terminate(endpoint);
        }
        this.binance.futuresPrices().then(
            (data: any) => {
                console.log(data);
            }
        ) 
        this.binance.futuresAccount().then(
            (data: any) => {
                console.log(data);
            }
        ) 
        this.binance.futuresLeverage( 'BTCUSDT', 2 )
        this.binance.futuresMarginType( 'BTCUSDT', "CROSSED" ).then(console)
        
    }
    
    
}