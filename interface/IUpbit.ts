
export interface IUpbitPriceAmount {
    price: string,
    amount: string,
}

export interface IUpbitDeepth {
    symbol: string;
    timestamp: number;
    receivedAt: number;
    bid: IUpbitPriceAmount[];
    ask: IUpbitPriceAmount[];    
}

export interface IUpbitTrade {
    symbol: string;
    timestamp: number,
    receivedAt: number;
    isMaker: boolean,
    price: string,
    amount: string,
}
export interface IUpbitCoinInfos {
    [key: string]: IUpbitCoinInfo
}

export interface IUpbitCoinInfo {
    symbol: string;
    deepth: IUpbitDeepth;
    trade: IUpbitTrade;
}

export interface UpbitSocketPayload {
    type: 'ticker' | 'trade' | 'orderbook'
    codes: string[]
    isOnlySnapshot?: boolean
    isOnlyRealtime?: boolean
    // format?: 'DEFAULT' | 'SIMPLE'
}

export interface UpbitSocketSimpleResponse {
    ty: string  //type
    cd: string  //code
    tp: number  //trade_price
    tv: number  //trade_volume
    ab: string  //ask_bid (ASK : 매도, BID : 매수)
    pcp: number //prev_closing_price (전일종가)
    c: string   //change (전일대비) (RISE : 상승, EVEN : 보합, FALL : 하락)
    cp: number  //change_price  (부호 없는 전일 대비 값)
    td: string  //trade_date (체결 일자(UTC 기준))  yyyy-MM-dd
    ttm: string //trade_time (체결 시각(UTC 기준))  HH:mm:ss
    ttms: number    //trade_timestamp (체결 타임스탬프 (millisecond))
    tms: number //timestamp (타임스탬프 (millisecond))
    sid: number // sequential_id (체결 번호 (Unique))
    op: number  // opening_price
    hp: number  // high_price
    lp: number  // low_price
    scp: number //signed_change_price   (전일 대비 값)
    cr: number  //change_rate
    scr:number //signed_change_rate

    atv: number // acc_trade_volume (누적 거래량(UTC 0시 기준))
    atv24h: number  //acc_trade_volume_24h (24시간 누적 거래량)

    atp: number // acc_trade_price  (누적 거래대금(UTC 0시 기준))
    atp24h: number  // acc_trade_price_24h (24시간 누적 거래대금)
    
    tdt: string //trade_date (최근 거래 일자(UTC))yyyyMMdd
    
    
    aav: number // acc_ask_volume (누적 매도량)
    abv: number // acc_bid_volume (누적 매수량)
    h52wp: number   //highest_52_week_price (52주 최고가)
    h52wdt: string  //highest_52_week_date (52주 최고가 달성일) (yyyy-MM-dd)
    l52wp: number   //lowest_52_week_price
    l52wdt: string  //lowest_52_week_date
    ts: null    //trade_status
    ms: string  //market_state  (PREVIEW : 입금지원, ACTIVE : 거래지원가능, DELISTED : 거래지원종료))
    msfi: null  //market_state_for_ios
    its: boolean  //is_trading_suspended  (거래 정지 여부)
    dd: null    //delisting_date (상장폐지일)
    mw: string  //market_warning (유의 종목 여부) (NONE : 해당없음, CAUTION : 투자유의)

    
    tas: number //total_ask_size (호가 매도 총 잔량)
    tbs: number //total_bid_size (호가 매수 총 잔량)
    obu: UpbitSocketSimpleResponseOrderbook[] //orderbook_units (호가)
    st: string  //stream_type   (SNAPSHOT : 스냅샷, REALTIME : 실시간)
}

export interface UpbitSocketSimpleResponseOrderbook {
    ap: number //ask_price (매도 호가)
    bp: number //bid_price (매수 호가)
    as: number  //ask_size (매도 잔량)
    bs: number  //bid_size (매수 잔량)
}

export interface UpbitChanceResponse {
  bid_fee: string;    //"0.0005"
  ask_fee: string;    // "0.0005"
  maker_bid_fee: string;    //'0.0005',
  maker_ask_fee: string;  //'0.0005',
  market: {
    id: string;   //"KRW-BTC",
    name: string; //"BTC/KRW",
    order_types: string[];    //deprecated //"limit"   
    order_sides: string[];    //"ask" or "bid"
    bid: {
      currency: string;   //"KRW",
      price_unit: any;    //null
      min_total: string;  //"5000"
    };
    ask: {
      currency: string;   //"BTC",
      price_unit: any;    //null
      min_total: string;  //"1000"
    };
    max_total: string;    //"100000000.0",
    state: string;        //"active",
  };
  bid_account: {
    currency: string; //"KRW",
    balance: string; //"0.0",
    locked: string;  //"0.0",
    avg_buy_price: string; //"0",
    avg_buy_price_modified: boolean; //false,
    unit_currency: string; //"KRW",
  };
  ask_account: {
    currency: string; //"BTC",
    balance: string; //"10.0",
    locked: string;  //"0.0",
    avg_buy_price: string; //"8042000",
    avg_buy_price_modified: boolean; //false,
    unit_currency: string; //"KRW",
  };
}

export interface IUpbitAccountResponse {
  currency: string;   //"BTC" or "KRW",
  balance: string;  //"0.90389667",
  locked: string;  //"0",
  avg_buy_price: string;  //"22998211.4403",
  avg_buy_price_modified: boolean;  //false,
  unit_currency: string;  //"KRW"
}

export interface IUpbitAccount {
  currency: string;   //"BTC" or "KRW",
  balance: number;  //"0.90389667",
  locked: number;  //"0",
  avg_buy_price: number;  //"22998211.4403",
  avg_buy_price_modified: boolean;  //false,
  unit_currency: string;  //"KRW"
}

export interface IUpbitOrdersResponse {
  uuid: string; //'0b57bafd-1820-4f74-98f3-bc76b578148a',
  side: string; //'bid',
  ord_type: string; //'limit',
  price: string; //'17347000',
  state: string; //'wait',
  market: string; //'KRW-BTC',
  created_at: string; //'2023-06-20T01:32:36.727135+09:00',
  volume: string; //'0.000289',
  remaining_volume: string; //'0.000289',
  reserved_fee: string; //'2.5066415',
  remaining_fee: string; //'2.5066415',
  paid_fee: string; //'0',
  locked: string; //'5015.7896415',
  executed_volume: string; //'0',
  trades_count: number; //0
}


export interface IUpbitOrderResponse {
  uuid: string; //"9ca023a5-851b-4fec-9f0a-48cd83c2eaae",
  side: string; //"ask",
  ord_type: string; //"limit",
  price: string; //"4280000.0",
  state: string; //"done",
  market: string; //"KRW-BTC",
  created_at: string; //"2019-01-04T13:48:09+09:00",
  volume: string; //"1.0",
  remaining_volume:string; //"0.0",
  reserved_fee: string; //"0.0",
  remaining_fee: string; //"0.0",
  paid_fee: string; //"2140.0",
  locked: string; //"0.0",
  executed_volume: string; //"1.0",
  trades_count: number; //1,
  trades: [
    {
      market: string; //"KRW-BTC",
      uuid: string; //"9e8f8eba-7050-4837-8969-cfc272cbe083",
      price: string; //"4280000.0",
      volume: string; //"1.0",
      funds: string; //"4280000.0",
      side: string; //"ask"
    }
  ]
}