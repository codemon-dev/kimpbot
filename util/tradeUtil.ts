import { COIN_PAIR, COIN_SYMBOL, CURRENCY_TYPE, EXCHANGE } from "../constants/enum";
import { PriceQty } from "../interface/IMarketInfo";

export const calculatePrimium = (price1: number, price2: number, currency?: number) => {
    return wrapNumber((price1 / (price2 * (currency? currency: 1)) - 1) * 100);
}

export const calculateTether = (primium: number, currency: number) => {
  return wrapNumber((1.0 + (primium / 100.0)) * currency);
}

export const countDecimalPlaces = (num: number) => {
  const decimalString = num.toString().split('.')[1];
    if (decimalString) {
      return decimalString.length;
    }
    return 0;
}

export const getSymbolFromCoinPair = (coinPair: COIN_PAIR) => {
    if (coinPair === COIN_PAIR.BTCUSDT || coinPair === COIN_PAIR.BTCKRW) {
        return COIN_SYMBOL.BTC;
    }
    if (coinPair === COIN_PAIR.ETHUSDT || coinPair === COIN_PAIR.ETHKRW) {
        return COIN_SYMBOL.ETH;
    }
    if (coinPair === COIN_PAIR.XRPUSDT || coinPair === COIN_PAIR.XRPKRW) {
      return COIN_SYMBOL.XRP;
    }
    if (coinPair === COIN_PAIR.DOGEUSDT || coinPair === COIN_PAIR.DOGEKRW) {
      return COIN_SYMBOL.DOGE;
    }
    return COIN_SYMBOL.NONE;
}

export const roundUpToDecimalPlaces = (number: number, decimalPlaces: number) => {
  const multiplier = 10 ** decimalPlaces;
  return wrapNumber(parseFloat((Math.floor(number * multiplier) / multiplier).toFixed(decimalPlaces)));
}

export const convertExchangeOrederPrice = (exchange: EXCHANGE, price: number, pricePrecision?: number) => {
  if (exchange === EXCHANGE.UPBIT) {
    return wrapNumber(convertUpbitOrderPrice(price));
  }else {
    if (pricePrecision && pricePrecision >= 0) {
      return wrapNumber(parseFloat(price.toFixed(pricePrecision)));
    } else {
      return wrapNumber(Math.floor(price));
    }
  }
}

export const convertUpbitOrderPrice = (price: number) => {
    if (price >= 2000000) {
        return wrapNumber(Math.floor(price / 1000) * 1000);
      } else if (price >= 1000000) {
        return wrapNumber(Math.floor(price / 500) * 500);
      } else if (price >= 500000) {
        return wrapNumber(Math.floor(price / 100) * 100);
      } else if (price >= 100000) {
        return wrapNumber(Math.floor(price / 50) * 50);
      } else if (price >= 10000) {
        return wrapNumber(Math.floor(price / 10) * 10);
      } else if (price >= 1000) {
        return wrapNumber(Math.floor(price / 5) * 5);
      } else if (price >= 100) {
        return wrapNumber(Math.floor(price));
      } else if (price >= 10) {
        return wrapNumber(Math.floor(price * 10) / 10);
      } else if (price >= 1) {
        return wrapNumber(Math.floor(price * 100) / 100);
      } else if (price >= 0.1) {
        return wrapNumber(Math.floor(price * 1000) / 1000);
      } else {
        return wrapNumber(Math.floor(price * 10000) / 10000);
      }
}

export const getAvgPriceFromOrderBook = (orderBook: PriceQty[], avaliableBalance: number) => {
  let sumAmount: number = 0;
  let sumQty: number = 0;
  for (const item of orderBook) {
      // console.log(`price: ${item.price}, qty: ${item.qty}, newSumAmount: ${newSumAmount}, avaliableBalance: ${avaliableBalance}`)
      if (avaliableBalance <= wrapNumber(sumAmount + (item.price * item.qty))) {
          sumQty = wrapNumber(sumQty + ((avaliableBalance - sumAmount) / item.price))
          sumAmount = avaliableBalance;
          break;
      }
      sumAmount = wrapNumber(sumAmount +(item.price * item.qty));
      sumQty = wrapNumber(sumQty + item.qty);
  }
  // console.log(`sumAmount: ${sumAmount}, sumQty: ${sumQty}, avaliableBalance: ${avaliableBalance}`)
  if (sumAmount < avaliableBalance) {
    return -1;
  }
  return wrapNumber(sumAmount / sumQty);
}

export const getAvgPriceFromOrderBookByQty = (orderBook: PriceQty[], qty: number) => {
  let sumAmount: number = 0;
  let sumQty: number = 0;
  for (const item of orderBook) {
      // console.log(`price: ${item.price}, qty: ${item.qty}, newSumAmount: ${newSumAmount}, avaliableBalance: ${avaliableBalance}`)
      if (qty <= wrapNumber(sumQty + item.qty)) {
        sumAmount = wrapNumber(sumAmount + (item.price * (qty - sumQty)));
        sumQty = wrapNumber(sumQty + (qty - sumQty))
        break;
      }
      sumAmount = wrapNumber(sumAmount + (item.price * item.qty));
      sumQty = wrapNumber(sumQty + item.qty);
  }
  // console.log(`sumAmount: ${sumAmount}, sumQty: ${sumQty}, avaliableBalance: ${avaliableBalance}`)
  if (sumQty < qty) {
    return -1;
  }
  return wrapNumber(sumAmount / sumQty);
}

export const getCurrencyTypeFromExchange = (exchange: EXCHANGE) => {
  if (exchange === EXCHANGE.UPBIT || exchange === EXCHANGE.BITHUM) {
    return CURRENCY_TYPE.KRW;
  } else {
    return CURRENCY_TYPE.USDT;
  }
}

export const wrapNumber = (num: number, precision?: number): number => {
  if (!num) {
    return 0
  }
  return Number(num.toFixed(precision ?? 8))
}