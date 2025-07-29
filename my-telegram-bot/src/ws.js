import WebSocket from 'ws';
import EventEmitter from 'events';

export default class WebSocketClient extends EventEmitter {
  constructor(url, ssid) {
    super();
    this.url = url;
    this.ssid = ssid;
    this.ws = null;
    this.connected = false;

    this.serverTimeOffset = 0; // смещение времени сервера относительно локального
    this.requestId = 1; // для уникальных id запросов
    this.pendingRequests = new Map(); // map id -> {resolve, reject}

    this._heartbeatInterval = null;
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      console.log('WS connected');
      this.connected = true;

      // Отправляем авторизацию
      this.send(this.ssid);

      // Запускаем heartbeat (ping)
      this._startHeartbeat();

      this.emit('connected');
    });

    this.ws.on('message', (data) => {
      this._handleMessage(data.toString());
    });

    this.ws.on('close', (code, reason) => {
      this.connected = false;
      console.warn(`WS disconnected: code=${code}, reason=${reason.toString()}`);

      this.emit('disconnected', { code, reason });

      this._stopHeartbeat();

      // Автоматический переподключ
      setTimeout(() => this.connect(), 5000);
    });

    this.ws.on('error', (error) => {
      console.error('WS error', error);
      this.emit('error', error);
    });
  }

  disconnect() {
    this._stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  send(data) {
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  /**
   * Отправляет запрос в формате:
   * 42["method", {params}]
   * и возвращает Promise, который резолвится при получении ответа с тем же id.
   */
  sendRequest(method, params) {
    if (!this.connected) {
      return Promise.reject(new Error('WebSocket is not connected'));
    }

    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      const message = `42["${method}",${JSON.stringify({ id, ...params })}]`;

      // Сохраняем обработчики для ответа
      this.pendingRequests.set(id, { resolve, reject });

      try {
        this.send(message);
      } catch (err) {
        this.pendingRequests.delete(id);
        reject(err);
      }

      // Таймаут на ответ (например, 10 секунд)
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.get(id).reject(new Error('Request timed out'));
          this.pendingRequests.delete(id);
        }
      }, 10000);
    });
  }

  getServerTime() {
    return Date.now() + this.serverTimeOffset;
  }

  _handleMessage(message) {
    // Пример сообщений: "42[...]"
    if (!message.startsWith('42')) {
      // Игнорируем другие служебные сообщения Socket.IO (например, ping/pong)
      return;
    }

    // Парсим JSON после "42"
    let payload;
    try {
      payload = JSON.parse(message.slice(2));
    } catch (err) {
      console.warn('Failed to parse message payload:', err);
      return;
    }

    if (!Array.isArray(payload) || payload.length < 1) return;

    const [event, data] = payload;

    // Обработка авторизации
    if (event === 'auth') {
      if (data?.success) {
        this.emit('authorized');
        // Запросить серверное время для синхронизации
        this._requestServerTime();
      } else {
        this.emit('error', new Error('Authorization failed'));
      }
      return;
    }

    // Обработка серверного времени
    if (event === 'serverTime') {
      if (typeof data?.time === 'number') {
        const serverTime = data.time * 1000; // предположим, что время в секундах
        this.serverTimeOffset = serverTime - Date.now();
        //console.log('Server time synchronized, offset ms:', this.serverTimeOffset);
      }
      return;
    }

    // Обработка ответов на запросы с id
    if (data && typeof data.id === 'number') {
      const { id } = data;
      if (this.pendingRequests.has(id)) {
        const { resolve } = this.pendingRequests.get(id);
        resolve(data);
        this.pendingRequests.delete(id);
      }
      return;
    }

    // Можно добавить обработку других событий по необходимости
  }

  _requestServerTime() {
    // Запрос серверного времени, если есть соответствующий метод
    // Например, "getServerTime" без параметров
    this.sendRequest('getServerTime', {}).catch(() => {
      // Игнорируем ошибки
    });
  }

  _startHeartbeat() {
    if (this._heartbeatInterval) return;
    this._heartbeatInterval = setInterval(() => {
      if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 25000); // каждые 25 секунд
  }

  _stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
  }
}
