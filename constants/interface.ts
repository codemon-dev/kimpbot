export interface IExchageRateInfo {
    code: string; //'FRX.KRWUSD';
    date: string; //'2023-05-19';
    time: string; //'23:58:00';
    price: number,
    timestamp: number,  //1684512177277;
  }
  
  export type IExchageRateDunamuResponse = {
    code: string; //'FRX.KRWUSD';
    currencyCode: string | null; //'USD';
    currencyName: string | null; //'달러';
    country: string | null; //'미국';
    name: string | null; //'미국 (USD/KRW)';
    date: string; //'2023-05-19';
    time: string; //'23:58:00';
    recurrenceCount: number | null; //537;
    basePrice: number; //1327.5;
    openingPrice: number | null; //1332.7;
    highPrice: number | null; //1336.0;
    lowPrice: number | null; //1326.0;
    change: string | null; //'FALL';
    changePrice: number | null; //9.5;
    cashBuyingPrice: number | null; //1350.73;
    cashSellingPrice: number | null; //1304.27;
    ttBuyingPrice: number | null; //1314.5;
    ttSellingPrice: number | null; //1340.5;
    tcBuyingPrice: number | null; // null
    fcSellingPrice: number | null;  //null
    exchangeCommission: number | null; //6.9321;
    usDollarRate: number | null; //1.0;
    high52wPrice: number | null; //1445.0;
    high52wDate: string | null; //'2022-10-13';
    low52wPrice: number | null; //1216.6;
    low52wDate: string | null; //'2023-02-02';
    currencyUnit: number | null; //1;
    provider: string | null; //'하나은행';
    timestamp: number; //1684512177277;
    id: number | null; //79;
    modifiedAt: string | null; //'2023-05-19T16:02:57.000+0000';
    createdAt: string | null; //'2016-10-21T06:13:34.000+0000';
    signedChangePrice: number | null; //-9.5;
    signedChangeRate: number | null; //-0.00710546;
    changeRate: number | null; //0.00710546;
  };
  