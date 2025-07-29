import WebSocket from 'ws';
import EventEmitter from 'events';

export default class WebSocketClient extends EventEmitter {
  constructor(url, ssid) {
    super();
    this.url = url;
    this.ssid = ssid;
    this.ws = null;
    this.connected = false;
    this.serverTimeOffset = 0;
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      console.log('WS connected');
      this.connected = true;
      this.send(this.ssid);
      this.emit('connected');
    });

    this.ws.on('message', (data) => {
      // Обработка сообщений, парсинг, авторизация
      // При успешной авторизации:
      this.emit('authorized');
      // При получении серверного времени, вычисляем смещение
      // ...
    });

    this.ws.on('close', () => {
      this.connected = false;
      console.log('WS disconnected, reconnecting...');
      setTimeout(() => this.connect(), 5000);
    });

    this.ws.on('error', (e) => {
      console.error('WS error', e);
    });
  }

  send(data) {
    if (this.connected) this.ws.send(data);
  }

  async sendRequest(method, params) {
    // Формирование запроса и ожидание ответа
    // Возвращает Promise с данными
  }

  getServerTime() {
    return Date.now() + this.serverTimeOffset;
  }
}
