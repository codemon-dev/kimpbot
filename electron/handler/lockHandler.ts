import Handlers from './Handlers';
import { AsyncLock } from '../../util/asyncLock';


export default class LockHandler {
  private handlers: Handlers | undefined;
  public tradeJobLock = new AsyncLock();

  constructor(handlers: Handlers) {
    handlers.logHandler?.log?.info(`create CurrencyHandler.`);
    this.handlers = handlers;
  }
}
