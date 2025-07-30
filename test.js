const TelegramBot = require('node-telegram-bot-api');
const WebSocket = require('ws');
const moment = require('moment');

// Токен вашего Telegram бота
const TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';

// WebSocket параметры
const WS_URL = 'wss://demo-api-eu.po.market/socket.io/?EIO=4&transport=websocket';
const SSID = '42["auth",{"sessionToken":"eea7f7588a9a0d84b68e0010a0026544","uid":"91717690","lang":"ru","currentUrl":"cabinet","isChart":1}]';

// Глобальная переменная для хранения данных свечей
let candlesData = [];

// Создаем бота с polling
const bot = new TelegramBot(TOKEN, { polling: true });

// WebSocket клиент
class WebSocketClient {
    constructor(url, ssid) {
        this.url = url;
        this.ssid = ssid;
        this.ws = null;
        this.serverTime = 0;
    }

    connect() {
        this.ws = new WebSocket(this.url);
        this.ws.on('open', () => {
            console.log('WebSocket соединение открыто');
            this.ws.send(this.ssid); // Отправляем авторизационные данные
        });

        this.ws.on('message', (data) => {
            console.log('Получено сообщение:', data.toString());
            try {
                const message = data.toString();
                if (message.startsWith('42')) {
                    const parsedData = JSON.parse(message.slice(2));
                    if (Array.isArray(parsedData) && parsedData[0] === 'timeSync') {
                        this.serverTime = parsedData[1];
                    }
                }
            } catch (e) {
                console.error('Ошибка обработки сообщения:', e);
            }
        });

        this.ws.on('error', (error) => {
            console.error('WebSocket ошибка:', error);
        });

        this.ws.on('close', () => {
            console.log('WebSocket соединение закрыто');
        });
    }

    getServerTime() {
        return this.serverTime;
    }

    sendRequest(method, data) {
        const request = `42["${method}", ${JSON.stringify(data)}]`;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(request);
        }
        return { data: [] }; // Заглушка, замените на реальную обработку ответа
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

    const result = client.sendRequest('loadHistoryPeriod', data);
    // Форматируем данные (заглушка, адаптируйте под реальный ответ)
    const formattedData = result.data || [];
    candlesData = formattedData.slice(0, 5); // Сохраняем только первые 5 свечей для примера
    return formattedData;
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
bot.onText(/\/candles/, (msg) => {
    const chatId = msg.chat.id;
    fetchCandleData('EURJPY_otc', 60, 6000); // Запрашиваем данные
    if (candlesData.length > 0) {
        let response = 'Данные о свечах:\n';
        candlesData.forEach(candle => {
            response += `Время: ${candle.time || 'N/A'}, Open: ${candle.open || 'N/A'}\n`;
        });
        bot.sendMessage(chatId, response);
    } else {
        bot.sendMessage(chatId, 'Данные о свечах недоступны. Попробуйте позже.');
    }
});

// Обработчик текстовых сообщений
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (!msg.text.startsWith('/')) {
        bot.sendMessage(chatId, `Ты написал: ${msg.text}`);
    }
});

// Обработчик ошибок
bot.on('polling_error', (error) => {
    console.error('Polling ошибка:', error);
});

console.log('Бот запущен. Нажмите Ctrl+C для остановки.');
