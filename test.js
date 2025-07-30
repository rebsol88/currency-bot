const TelegramBot = require('node-telegram-bot-api');
const WebSocket = require('ws');

// Токен вашего Telegram бота
const TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';

// WebSocket параметры
const WS_URL = 'wss://demo-api-eu.po.market/socket.io/?EIO=4&transport=websocket';
const SSID = '42["auth",{"session":"knp5iga4ok9e5jj5psmp50hlrh","isDemo":1,"uid":89012109,"platform":1}]';

// Глобальная переменная для хранения данных свечей
let candlesData = [];

// Создаем бота с polling
const bot = new TelegramBot(TOKEN, { polling: true });

// WebSocket клиент с переподключением и пингом
class WebSocketClient {
    constructor(url, ssid) {
        this.url = url;
        this.ssid = ssid;
        this.ws = null;
        this.serverTime = 0;
        this.reconnectInterval = 5000; // Интервал переподключения 5 секунд
        this.isConnecting = false;
        this.pingInterval = 25000; // Интервал пинга по умолчанию (25 секунд)
        this.pingTimer = null; // Таймер для пинга
    }

    connect() {
        if (this.isConnecting) return;
        this.isConnecting = true;
        console.log('Попытка подключения к WebSocket...');
        this.ws = new WebSocket(this.url);

        this.ws.on('open', () => {
            console.log('WebSocket соединение открыто');
            this.isConnecting = false;
            this.ws.send('40'); // Отправляем начальное сообщение
            console.log('Отправили: 40');
            this.ws.send(this.ssid); // Отправляем авторизационные данные
            console.log(`Отправили: ${this.ssid}`);
        });

        this.ws.on('message', (data) => {
            console.log('Получено сообщение:', data.toString());
            try {
                const message = data.toString();
                if (message.startsWith('0')) {
                    // Начальное сообщение с параметрами соединения
                    const params = JSON.parse(message.slice(1));
                    this.pingInterval = params.pingInterval || 25000;
                    console.log(`Установлен pingInterval: ${this.pingInterval} мс`);
                    this.startPing(); // Запускаем пинг после получения параметров
                } else if (message.startsWith('42')) {
                    const parsedData = JSON.parse(message.slice(2));
                    if (Array.isArray(parsedData) && parsedData[0] === 'timeSync') {
                        this.serverTime = parsedData[1];
                        console.log(`Получено время сервера: ${this.serverTime}`);
                    } else if (Array.isArray(parsedData) && parsedData[0] === 'history') {
                        candlesData = parsedData[1].data || [];
                        console.log(`Получены данные свечей: ${candlesData.length} записей`);
                    }
                } else if (message === '3') {
                    console.log('Получен pong от сервера');
                }
            } catch (e) {
                console.error('Ошибка обработки сообщения:', e);
            }
        });

        this.ws.on('error', (error) => {
            console.error('WebSocket ошибка:', error);
            this.isConnecting = false;
            this.stopPing(); // Останавливаем пинг при ошибке
        });

        this.ws.on('close', (code, reason) => {
            console.log(`WebSocket соединение закрыто. Код: ${code}, Причина: ${reason || 'не указана'}`);
            this.isConnecting = false;
            this.stopPing(); // Останавливаем пинг при закрытии
            setTimeout(() => this.connect(), this.reconnectInterval);
        });
    }

    startPing() {
        if (this.pingTimer) return; // Уже запущен
        console.log(`Запуск пинга с интервалом ${this.pingInterval} мс`);
        this.pingTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                console.log('Отправляем пинг: 2');
                this.ws.send('2');
            } else {
                console.log('WebSocket не открыт, пинг не отправлен');
            }
        }, this.pingInterval);
    }

    stopPing() {
        if (this.pingTimer) {
            console.log('Остановка пинга');
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    getServerTime() {
        return this.serverTime;
    }

    sendRequest(method, data) {
        const request = `42["${method}", ${JSON.stringify(data)}]`;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log(`Отправляем запрос: ${request}`);
            this.ws.send(request);
        } else {
            console.log('WebSocket не подключен. Запрос не отправлен.');
        }
    }
}

// Инициализация WebSocket клиента
const client = new WebSocketClient(WS_URL, SSID);
client.connect();

// Функция для генерации индекса
function generateIndex() {
    const rand = Math.floor(Math.random() * 90) + 10; // Случайное число от 10 до 99
    const cu = Math.floor(Date.now() / 1000); // Текущее время в секундах
    const t = cu + (2 * 60 * 60); // Добавляем 2 часа
    return parseInt(`${t}${rand}`);
}

// Функция для получения данных о свечах
function fetchCandleData(asset, period, count, endTime = null) {
    const timeSync = client.getServerTime() || Math.floor(Date.now() / 1000);
    const timeRounded = Math.floor(timeSync / period) * period;

    const data = {
        asset: asset,
        index: generateIndex(),
        time: timeRounded,
        offset: count,
        period: period,
    };

    client.sendRequest('loadHistoryPeriod', data);
    // Данные будут обновлены асинхронно через событие 'message'
}

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Привет, ${msg.from.first_name}! Я твой Telegram бот. Напиши мне что-нибудь или используй /candles для получения данных о свечах!`);
});

// Обработчик команды /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Я могу помочь тебе с разными задачами. Вот доступные команды:\n` +
        `/start - Начать общение\n` +
        `/help - Показать помощь\n` +
        `/candles - Получить данные о свечах\n` +
        `Просто напиши мне текст, и я отвечу!`);
});

// Обработчик команды /candles
bot.onText(/\/candles/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Запрашиваю данные о свечах...');
    fetchCandleData('EURJPY_otc', 60, 6000); // Запрашиваем данные

    // Ждем немного, чтобы данные успели прийти (асинхронный подход)
    setTimeout(() => {
        if (candlesData.length > 0) {
            let response = 'Данные о свечах (первые 5):\n';
            candlesData.slice(0, 5).forEach((candle, index) => {
                response += `${index + 1}. Время: ${new Date(candle.time * 1000).toLocaleString() || 'N/A'}, Open: ${candle.open || 'N/A'}, Close: ${candle.close || 'N/A'}\n`;
            });
            bot.sendMessage(chatId, response);
        } else {
            bot.sendMessage(chatId, 'Данные о свечах недоступны. Попробуйте позже.');
        }
    }, 2000); // Задержка 2 секунды для получения ответа от WebSocket
});

// Обработчик текстовых сообщений
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (!msg.text.startsWith('/')) {
        bot.sendMessage(chatId, `Ты написал: ${msg.text}`);
    }
});

// Обработчик ошибок polling
bot.on('polling_error', (error) => {
    console.error('Polling ошибка:', error);
});

console.log('Бот запущен. Нажмите Ctrl+C для остановки.');
