import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import WebSocket from 'ws';

// --- PocketOptionApi класс с таймаутами и обработкой ошибок ---
class PocketOptionApi {
  constructor() {
    this.ws = null;
    this.requestId = 1;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('wss://iqoption.com/echo/websocket');

      const connectTimeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
        this.ws.terminate();
      }, 10000);

      this.ws.on('open', () => {
        clearTimeout(connectTimeout);
        resolve();
      });

      this.ws.on('message', (data) => {
        let msg;
        try {
          msg = JSON.parse(data);
        } catch {
          return;
        }
        if (msg && msg.msg_id && this.callbacks.has(msg.msg_id)) {
          const cb = this.callbacks.get(msg.msg_id);
          cb(msg);
          this.callbacks.delete(msg.msg_id);
        }
      });

      this.ws.on('error', (err) => {
        reject(err);
      });

      this.ws.on('close', () => {
        // Можно логировать закрытие, если нужно
      });
    });
  }

  sendRequest(name, msg) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }
      const id = this.requestId++;
      const request = {
        name,
        msg,
        msg_id: id,
      };

      const timeout = setTimeout(() => {
        if (this.callbacks.has(id)) {
          this.callbacks.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 10000);

      this.callbacks.set(id, (data) => {
        clearTimeout(timeout);
        resolve(data);
      });

      this.ws.send(JSON.stringify(request));
    });
  }

  async getCandles(instrument, timeframe, count) {
    const response = await this.sendRequest('get-candles', {
      instrument,
      timeframe,
      count,
    });

    if (response && response.msg && response.msg.candles) {
      return response.msg.candles;
    }
    throw new Error('No candles data received');
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const bot = new Telegraf(BOT_TOKEN);
bot.use(session()); // подключаем сессию до обработчиков

const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  chartCallback: (ChartJS) => {
    ChartJS.register(annotationPlugin);
  },
});

// --- Языковые данные ---
const languages = {
  ru: {
    name: 'Русский',
    pairsMain: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD'],
    pairsOTC: ['EURJPY', 'GBPJPY', 'EURGBP', 'EURCHF', 'AUDJPY', 'CHFJPY', 'AUDCAD'],
    timeframes: [
      { label: '1 мин', value: '1m' },
      { label: '5 мин', value: '5m' },
      { label: '15 мин', value: '15m' },
      { label: '1 час', value: '1h' },
      { label: '4 часа', value: '4h' },
      { label: '1 день', value: '1d' },
    ],
    texts: {
      chooseLanguage: 'Выберите язык / Choose language',
      choosePair: 'Выберите валютную пару',
      chooseTimeframe: 'Выберите таймфрейм',
      analysisStarting: (pair, tf) => `Анализ для ${pair} на таймфрейме ${tf}`,
      errorGeneratingChart: 'Ошибка при генерации графика',
      nextAnalysis: 'Следующий анализ',
      pleaseChoosePairFirst: 'Пожалуйста, сначала выберите валютную пару',
      unknownCmd: 'Неизвестная команда',
    },
  },
  en: {
    name: 'English',
    pairsMain: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD'],
    pairsOTC: ['EURJPY', 'GBPJPY', 'EURGBP', 'EURCHF', 'AUDJPY', 'CHFJPY', 'AUDCAD'],
    timeframes: [
      { label: '1 min', value: '1m' },
      { label: '5 min', value: '5m' },
      { label: '15 min', value: '15m' },
      { label: '1 hour', value: '1h' },
      { label: '4 hours', value: '4h' },
      { label: '1 day', value: '1d' },
    ],
    texts: {
      chooseLanguage: 'Выберите язык / Choose language',
      choosePair: 'Choose currency pair',
      chooseTimeframe: 'Choose timeframe',
      analysisStarting: (pair, tf) => `Analysis for ${pair} on timeframe ${tf}`,
      errorGeneratingChart: 'Error generating chart',
      nextAnalysis: 'Next analysis',
      pleaseChoosePairFirst: 'Please choose a currency pair first',
      unknownCmd: 'Unknown command',
    },
  },
};

const displayNames = {
  EURUSD: { ru: 'EUR/USD', en: 'EUR/USD' },
  GBPUSD: { ru: 'GBP/USD', en: 'GBP/USD' },
  USDJPY: { ru: 'USD/JPY', en: 'USD/JPY' },
  USDCHF: { ru: 'USD/CHF', en: 'USD/CHF' },
  USDCAD: { ru: 'USD/CAD', en: 'USD/CAD' },
  AUDUSD: { ru: 'AUD/USD', en: 'AUD/USD' },
  NZDUSD: { ru: 'NZD/USD', en: 'NZD/USD' },
  EURJPY: { ru: 'EUR/JPY', en: 'EUR/JPY' },
  GBPJPY: { ru: 'GBP/JPY', en: 'GBP/JPY' },
  EURGBP: { ru: 'EUR/GBP', en: 'EUR/GBP' },
  EURCHF: { ru: 'EUR/CHF', en: 'EUR/CHF' },
  AUDJPY: { ru: 'AUD/JPY', en: 'AUD/JPY' },
  CHFJPY: { ru: 'CHF/JPY', en: 'CHF/JPY' },
  AUDCAD: { ru: 'AUD/CAD', en: 'AUD/CAD' },
};

// --- Аналитические функции (заглушки) ---
function calculateSMA(closes, period) {
  const sma = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      sma.push(null);
      continue;
    }
    const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}
function calculateRSI(closes, period) {
  return []; // заглушка
}
function calculateMACD(closes) {
  return { macd: [], signal: [], histogram: [] }; // заглушка
}
function calculateStochastic(klines) {
  return { k: [], d: [] }; // заглушка
}
function findSupportResistance(klines) {
  return { supports: [], resistances: [] }; // заглушка
}
async function generateChartImage(klines, sma5, sma15, supports, resistances, pair, timeframe, lang) {
  const labels = klines.map(k => new Date(k.openTime).toLocaleString());
  const closeData = klines.map(k => k.close);
  const sma5Data = sma5;
  const sma15Data = sma15;

  const config = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Close',
          data: closeData,
          borderColor: 'blue',
          fill: false,
          tension: 0.1,
        },
        {
          label: 'SMA 5',
          data: sma5Data,
          borderColor: 'green',
          fill: false,
          spanGaps: true,
          tension: 0.1,
        },
        {
          label: 'SMA 15',
          data: sma15Data,
          borderColor: 'red',
          fill: false,
          spanGaps: true,
          tension: 0.1,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `${pair} - ${timeframe}`,
          font: { size: 20 },
        },
      },
      scales: {
        x: { display: false },
        y: { beginAtZero: false },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(config);
}
function analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, lang) {
  return lang === 'ru'
    ? `Аналитика для ${klines.length} свечей.\nSMA5 последняя: ${sma5[sma5.length - 1]?.toFixed(5) || 'N/A'}`
    : `Analysis for ${klines.length} candles.\nLast SMA5: ${sma5[sma5.length - 1]?.toFixed(5) || 'N/A'}`;
}

// --- Маппинг таймфреймов в секунды ---
const timeframeToSeconds = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

// --- Получение свечей с таймаутом и обработкой ошибок ---
async function fetchRealOHLC(pair, timeframeValue, count = 100) {
  const api = new PocketOptionApi();
  try {
    await api.connect();

    const tfSeconds = timeframeToSeconds[timeframeValue];
    if (!tfSeconds) throw new Error('Unsupported timeframe: ' + timeframeValue);

    // Таймаут 15 секунд на получение свечей
    const candles = await Promise.race([
      api.getCandles(pair, tfSeconds, count),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout getting candles')), 15000))
    ]);

    const klines = candles.map(c => ({
      openTime: c.at * 1000,
      open: c.open,
      high: c.max,
      low: c.min,
      close: c.close,
      closeTime: c.at * 1000 + tfSeconds * 1000 - 1,
      volume: c.volume,
    }));

    return klines;
  } finally {
    api.close();
  }
}

// --- Вспомогательные ---
function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

const historyData = {};

// --- Отправка выбора пары ---
async function sendPairSelection(ctx, lang) {
  const langData = languages[lang];
  const mainButtons = langData.pairsMain.map(p => Markup.button.callback(displayNames[p][lang], displayNames[p][lang]));
  const otcButtons = langData.pairsOTC.map(p => Markup.button.callback(displayNames[p][lang], displayNames[p][lang]));

  const mainKeyboard = chunkArray(mainButtons, 2);
  const otcKeyboard = chunkArray(otcButtons, 2);

  const maxRows = Math.max(mainKeyboard.length, otcKeyboard.length);
  const keyboardFinal = [];

  for (let i = 0; i < maxRows; i++) {
    const leftButtons = mainKeyboard[i] || [];
    const rightButtons = otcKeyboard[i] || [];

    while (leftButtons.length < 2) leftButtons.push(Markup.button.callback(' ', 'noop'));
    while (rightButtons.length < 2) rightButtons.push(Markup.button.callback(' ', 'noop'));

    keyboardFinal.push([leftButtons[0], rightButtons[0]]);
    keyboardFinal.push([leftButtons[1], rightButtons[1]]);
  }

  try {
    await ctx.editMessageText(langData.texts.choosePair, Markup.inlineKeyboard(keyboardFinal));
  } catch {
    await ctx.reply(langData.texts.choosePair, Markup.inlineKeyboard(keyboardFinal));
  }
}

// --- Обработчики бота ---
bot.start(async (ctx) => {
  ctx.session = {};
  const buttons = [
    Markup.button.callback(languages.ru.name, 'lang_ru'),
    Markup.button.callback(languages.en.name, 'lang_en'),
  ];
  await ctx.reply(languages.ru.texts.chooseLanguage, Markup.inlineKeyboard(buttons));
});

bot.action(/lang_(.+)/, async (ctx) => {
  const lang = ctx.match[1];
  if (!languages[lang]) {
    await ctx.answerCbQuery('Unsupported language');
    return;
  }
  ctx.session = ctx.session || {};
  ctx.session.lang = lang;
  ctx.session.pair = null;
  ctx.session.timeframe = null;
  await ctx.answerCbQuery();

  await sendPairSelection(ctx, lang);
});

bot.on('callback_query', async (ctx) => {
  ctx.session = ctx.session || {};
  const data = ctx.callbackQuery.data;
  const lang = ctx.session.lang || 'ru';
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

  // Выбор пары
  const pairEntry = Object.entries(displayNames).find(([, names]) => names[lang] === data);
  if (pairEntry) {
    const pair = pairEntry[0];
    ctx.session.pair = pair;
    ctx.session.timeframe = null;
    await ctx.answerCbQuery();

    const tfButtons = langData.timeframes.map(tf => Markup.button.callback(tf.label, tf.label));
    const inlineTfButtons = chunkArray(tfButtons, 2);

    try {
      await ctx.editMessageText(langData.texts.chooseTimeframe, Markup.inlineKeyboard(inlineTfButtons));
    } catch {
      await ctx.reply(langData.texts.chooseTimeframe, Markup.inlineKeyboard(inlineTfButtons));
    }
    return;
  }

  // Выбор таймфрейма
  const tf = langData.timeframes.find(t => t.label === data);
  if (tf) {
    if (!ctx.session.pair) {
      await ctx.answerCbQuery(langData.texts.pleaseChoosePairFirst);
      return;
    }
    ctx.session.timeframe = tf;
    await ctx.answerCbQuery();

    try {
      await ctx.editMessageText(langData.texts.analysisStarting(displayNames[ctx.session.pair][lang], tf.label));
    } catch {
      await ctx.reply(langData.texts.analysisStarting(displayNames[ctx.session.pair][lang], tf.label));
    }

    const key = `${ctx.session.pair}_${tf.value}`;

    try {
      const klines = await fetchRealOHLC(ctx.session.pair, tf.value, 100);
      historyData[key] = klines;

      const closes = klines.map(k => k.close);
      const sma5 = calculateSMA(closes, 5);
      const sma15 = calculateSMA(closes, 15);
      const rsi = calculateRSI(closes, 14);
      const macd = calculateMACD(closes);
      const stochastic = calculateStochastic(klines);
      const { supports, resistances } = findSupportResistance(klines);

      try {
        const imageBuffer = await generateChartImage(klines, sma5, sma15, supports, resistances, ctx.session.pair, tf.label, lang);
        await ctx.replyWithPhoto({ source: imageBuffer });
      } catch (e) {
        console.error('Ошибка генерации графика:', e);
        await ctx.reply(langData.texts.errorGeneratingChart);
      }

      const analysisText = analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, lang);
      await ctx.reply(analysisText, Markup.inlineKeyboard([
        Markup.button.callback(langData.texts.nextAnalysis, 'next_analysis'),
      ]));
    } catch (e) {
      console.error('Ошибка получения данных с API:', e);
      await ctx.reply(langData.texts.errorGeneratingChart + '\n' + e.message);
    }
    return;
  }

  await ctx.answerCbQuery(langData.texts.unknownCmd);
});

// --- Запуск бота ---
bot.launch();
console.log('Бот запущен');
