import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import WebSocket from 'ws';

// --- Ваши данные из cookie ---
const USER_ID = '1753190874868-5xtss07znnm';  // lo_uid
const USER_SECRET = 'AKP9s_XjNuXtkInDX';      // SSID

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  chartCallback: (ChartJS) => {
    ChartJS.register(annotationPlugin);
  },
});

// ... (ваши функции и данные для языков, индикаторов и т.п. — оставляем без изменений)

// --- Новый блок: Pocket Option WebSocket клиент ---

class PocketOptionWS {
  constructor(userId, userSecret) {
    this.userId = userId;
    this.userSecret = userSecret;
    this.ws = null;
    this.requestId = 1;
    this.subscriptions = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('wss://socket.pocketoption.com/socket.io/?EIO=3&transport=websocket');

      this.ws.on('open', () => {
        // Отправляем handshake (Socket.IO protocol)
        this.ws.send('40'); // "40" - open connection with namespace "/"

        // Авторизация
        const authMsg = JSON.stringify({
          userId: this.userId,
          userSecret: this.userSecret,
          name: 'api',
          version: 1,
        });
        // Отправляем событие auth (Socket.IO event format)
        this.ws.send(`42["auth",${authMsg}]`);
      });

      this.ws.on('message', (data) => {
        const str = data.toString();

        // Обработка ответа на auth
        if (str.startsWith('42')) {
          try {
            const payload = JSON.parse(str.slice(2));
            const [event, content] = payload;
            if (event === 'auth') {
              if (content.success) {
                resolve(true);
              } else {
                reject(new Error('Authentication failed'));
              }
            }
            // Обработка подписок
            if (event === 'candles') {
              const { symbol, timeframe, candles } = content;
              const key = `${symbol}_${timeframe}`;
              if (this.subscriptions.has(key)) {
                this.subscriptions.get(key)(candles);
              }
            }
          } catch (e) {
            // Игнорируем ошибки парсинга
          }
        }
      });

      this.ws.on('error', (err) => reject(err));
      this.ws.on('close', () => console.log('WebSocket closed'));
    });
  }

  subscribeCandles(symbol, timeframe, callback) {
    const key = `${symbol}_${timeframe}`;
    this.subscriptions.set(key, callback);

    // Отправляем запрос на подписку (Socket.IO event)
    const msg = JSON.stringify({ symbol, timeframe });
    this.ws.send(`42["candles.subscribe",${msg}]`);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

// --- Функция для получения свечей через WebSocket ---

async function getCandles(symbol, timeframe) {
  const wsClient = new PocketOptionWS(USER_ID, USER_SECRET);
  await wsClient.connect();

  return new Promise((resolve, reject) => {
    let received = false;
    const timeout = setTimeout(() => {
      if (!received) {
        wsClient.close();
        reject(new Error('Timeout waiting for candles'));
      }
    }, 5000);

    wsClient.subscribeCandles(symbol, timeframe, (candles) => {
      if (!received) {
        received = true;
        clearTimeout(timeout);
        wsClient.close();

        // Форматируем свечи под ваш код
        // Пример свечи из API: { time: 1681234567, open, high, low, close, volume }
        // Преобразуем время в ms
        const klines = candles.map(c => ({
          openTime: c.time * 1000,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          closeTime: c.time * 1000 + getIntervalMs(timeframe) - 1,
          volume: c.volume,
        }));

        resolve(klines);
      }
    });
  });
}

function getIntervalMs(timeframe) {
  // Преобразуем таймфрейм в миллисекунды
  if (timeframe.endsWith('m')) {
    const m = parseInt(timeframe);
    return m * 60 * 1000;
  }
  if (timeframe.endsWith('h')) {
    const h = parseInt(timeframe);
    return h * 60 * 60 * 1000;
  }
  if (timeframe.endsWith('d')) {
    const d = parseInt(timeframe);
    return d * 24 * 60 * 60 * 1000;
  }
  return 60000; // по умолчанию 1 минута
}

// --- Изменяем обработку выбора таймфрейма ---

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const lang = ctx.session.lang || 'ru'; // По умолчанию русский
  const langData = languages[lang];

  if (data === 'noop') {
    await ctx.answerCbQuery();
    return;
  }

  if (data === 'next_analysis') {
    await ctx.answerCbQuery();
    ctx.session.pair = null;
    ctx.session.timeframe = null;
    await sendPairSelection(ctx, lang);
    return;
  }

  const pairEntry = Object.entries(displayNames).find(([, names]) => names[lang] === data);
  if (pairEntry) {
    const pair = pairEntry[0];
    ctx.session.pair = pair;
    await ctx.answerCbQuery();

    const tfButtons = langData.timeframes.map(tf => Markup.button.callback(tf.label, tf.label));
    const inlineTfButtons = chunkArray(tfButtons, 2);

    await ctx.editMessageText(langData.texts.chooseTimeframe, Markup.inlineKeyboard(inlineTfButtons));
    return;
  }

  const tf = langData.timeframes.find(t => t.label === data);
  if (tf) {
    if (!ctx.session.pair) {
      await ctx.answerCbQuery(langData.texts.pleaseChoosePairFirst);
      return;
    }
    ctx.session.timeframe = tf;
    await ctx.answerCbQuery();

    await ctx.editMessageText(langData.texts.analysisStarting(displayNames[ctx.session.pair][lang], tf.label));

    try {
      // Получаем реальные свечи через API
      const klines = await getCandles(ctx.session.pair, tf.value);

      const closes = klines.map(k => k.close);
      const sma5 = calculateSMA(closes, 5);
      const sma15 = calculateSMA(closes, 15);
      const rsi = calculateRSI(closes, 14);
      const macd = calculateMACD(closes);
      const stochastic = calculateStochastic(klines);
      const { supports, resistances } = findSupportResistance(klines);

      const imageBuffer = await generateChartImage(klines, sma5, sma15, supports, resistances, ctx.session.pair, tf.label, lang);
      await ctx.replyWithPhoto({ source: imageBuffer });

      const analysisText = analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, lang);
      await ctx.reply(analysisText, Markup.inlineKeyboard([
        Markup.button.callback(langData.texts.nextAnalysis, 'next_analysis')
      ]));
    } catch (e) {
      console.error('Ошибка получения данных с Pocket Option:', e);
      await ctx.reply(langData.texts.errorGeneratingChart);
    }

    return;
  }

  await ctx.answerCbQuery(langData.texts.unknownCmd);
});

// --- Остальной код бота без изменений ---

bot.launch();
console.log('Бот запущен и готов к работе');
