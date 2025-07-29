const WebSocket = require('ws');

class POClient {
  constructor(token) {
    this.token = token;
    this.ws = null;
    this.subscribedPairs = new Map();
  }

  connect() {
    const servers = [
      'wss://api-msk.po.market',
      'wss://api-spb.po.market',
      'wss://api-eu.po.market',
      'wss://api-us-south.po.market',
      'wss://api-us-north.po.market',
    ];
    const server = servers[Math.floor(Math.random() * servers.length)];
    this.ws = new WebSocket(server);

    this.ws.on('open', () => {
      this.ws.send(JSON.stringify({
        name: 'authenticate',
        msg: { token: this.token }
      }));
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.name === 'candles') {
          const { symbol, timeframe, candles } = msg.msg;
          const key = symbol + timeframe;
          const cb = this.subscribedPairs.get(key);
          if (cb && candles && candles.length) {
            cb(candles);
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    });

    this.ws.on('close', () => {
      console.log('WS closed, reconnecting in 5s');
      setTimeout(() => this.connect(), 5000);
   
