import WebSocketClient from './src/ws.js';
import moment from 'moment';

const ssid = `42["auth",{"session":"knp5iga4ok9e5jj5psmp50hlrh","isDemo":1,"uid":89012109,"platform":1}]`;
const wsUrl = 'wss://demo-api-eu.po.market/socket.io/?EIO=4&transport=websocket';

class MarketDataClient {
  constructor() {
    this.client = new WebSocketClient(wsUrl, ssid);
    this.candlesCache = {};

    this.client.on('authorized', () => {
      console.log('WebSocket AUTH SUCCESS');
    });

    this.client.on('disconnected', ({ code, reason }) => {
      console.warn(`WebSocket disconnected: code=${code}, reason=${reason.toString()}`);
    });

    this.client.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.client.connect();
  }

  generateIndex() {
    const rand = Math.floor(Math.random() * 90) + 10;
    const cu = Math.floor(Date.now() / 1000);
    const t = cu + 2 * 60 * 60;
    return parseInt(`${t}${rand}`, 10);
  }

  async fetchCandleData(asset, period, count) {
    const timeSync = Math.floor(this.client.getServerTime());
    const timeRounded = Math.floor(timeSync / period) * period;

    const data = {
      asset,
      index: this.generateIndex(),
      time: timeRounded,
      offset: count,
      period,
    };

    try {
      const result = await this.client.sendRequest('loadHistoryPeriod', data);
      if (!result?.data) return [];

      const candles = result.data.map((item) => ({
        openTime: item.time * 1000,
        open: item.open,
        close: item.close,
        high: item.high,
        low: item.low,
        closeTime: item.time * 1000 + period * 1000 - 1,
        volume: 0,
      }));

      this.candlesCache[`${asset}_${period}`] = candles;
      return candles;
    } catch (e) {
      console.error('Ошибка получения свечей:', e);
      return [];
    }
  }

  getCachedCandles(asset, period) {
    return this.candlesCache[`${asset}_${period}`] || [];
  }
}

export default new MarketDataClient();
