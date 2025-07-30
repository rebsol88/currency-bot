import { io } from 'socket.io-client';

// URL для WebSocket-соединения (замените на актуальный, если отличается)
const POCKET_OPTION_WS_URL = 'https://api.po.market';

// Данные авторизации
const authData = {
  sessionToken: 'eea7f7588a9a0d84b68e0010a0026544',
  uid: '91717690',
  lang: 'ru',
  currentUrl: 'cabinet',
  isChart: 1
};

// Переменная для отслеживания состояния соединения
let isWsConnected = false;
let ws;

function connectToPocketOption() {
  console.log('Attempting to connect to Pocket Option WebSocket...');
  
  // Настройки для Socket.IO
  ws = io(POCKET_OPTION_WS_URL, {
    transports: ['websocket'], // Используем только WebSocket
    extraHeaders: {
      'Origin': 'https://po.market',
      'Referer': 'https://po.market/cabinet',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    },
    query: {
      EIO: '4', // Версия Engine.IO (может быть 3 или 4, проверьте в браузере)
      transport: 'websocket',
    },
  });

  // Обработчик успешного подключения
  ws.on('connect', () => {
    console.log('Connected to Pocket Option WebSocket');
    isWsConnected = true;
    console.log('Sending auth data:', authData);
    ws.emit('auth', authData); // Отправляем событие auth с данными
  });

  // Обработчик входящих сообщений
  ws.on('message', (data) => {
    console.log('Received message:', data);
  });

  // Обработчик любых событий (для отладки)
  ws.onAny((event, ...args) => {
    console.log(`Event: ${event}`, args);
  });

  // Обработчик отключения
  ws.on('disconnect', (reason) => {
    console.log('Disconnected from Pocket Option WebSocket. Reason:', reason);
    isWsConnected = false;
    setTimeout(connectToPocketOption, 5000); // Переподключение через 5 секунд
  });

  // Обработчик ошибок
  ws.on('error', (error) => {
    console.error('Socket.IO error:', error);
    isWsConnected = false;
  });

  // Обработчик ошибок подключения
  ws.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
    isWsConnected = false;
    setTimeout(connectToPocketOption, 5000);
  });
}

// Запускаем подключение
connectToPocketOption();

// Пример функции для запроса данных (если потребуется)
function requestCandles(asset, timeframe, count) {
  if (!isWsConnected) {
    console.log('WebSocket is not connected. Cannot request candles.');
    return;
  }
  const requestData = {
    action: 'candles',
    asset: asset, // Например, 'BTCUSD'
    timeframe: timeframe, // Например, 60 для 1 минуты
    count: count, // Количество свечей
  };
  console.log('Requesting candles:', requestData);
  ws.emit('candles', requestData); // Отправляем запрос на свечи (проверьте точное название события в браузере)
}
