import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import axios from 'axios';

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const FINNHUB_API_KEY = 'a754732283e243e4ba7cf89d3223bbef';
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

// --- Языковые данные ---
const languages = {
  ru: {
    name: 'Русский',
    pairsMain: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD'],
    pairsOTC: ['EURJPY', 'GBPJPY', 'EURGBP', 'EURCHF', 'AUDJPY', 'CHFJPY', 'AUDCAD'],
    timeframes: [
      { label: '1 мин', value: '1' },
      { label: '5 мин', value: '5' },
      { label: '15 мин', value: '15' },
      { label: '1 час', value: '60' },
      { label: '4 часа', value: '240' },
      { label: '1 день', value: 'D' },
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
      jsonData: 'Данные в JSON формате:\n',
    },
  },
  en: {
    name: 'English',
    pairsMain: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD'],
    pairsOTC: ['EURJPY', 'GBPJPY', 'EURGBP', 'EURCHF', 'AUDJPY', 'CHFJPY', 'AUDCAD'],
    timeframes: [
      { label: '1 min', value: '1' },
      { label: '5 min', value: '5' },
      { label: '15 min', value: '15' },
      { label: '1 hour', value: '60' },
      { label: '4 hours', value: '240' },
      { label: '1 day', value: 'D' },
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
      jsonData: 'Data in JSON format:\n',
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
  const labels = klines.map(k => new Date(k.t * 1000).toLocaleString());
  const closeData = klines.map(k => k.c);
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

// --- Маппинг таймфреймов в секунды для Finnhub ---
const timeframeToFinnhub = {
  '1': '1',
  '5': '5',
  '15': '15',
  '60': '60',
  '240': '240',
  'D': 'D',
};

// --- Маппинг пары в символ Finnhub ---
// Finnhub использует формат: "OANDA:EUR_USD" для форекс
function pairToFinnhubSymbol(pair) {
  // Если пара в формате EURUSD, преобразуем в EUR_USD
  if (pair.length === 6) {
    const base = pair.slice(0, 3);
    const quote = pair.slice(3, 6);
    return `OANDA:${base}_${quote}`;
  }
  return pair; // на всякий случай
}

// --- Функция получения исторических свечей с Finnhub ---
async function fetchRealOHLC(pair, timeframeValue, count = 100) {
  const symbol = pairToFinnhubSymbol(pair);
  const resolution = timeframeValue; // '1', '5', '15', '60', '240', 'D'

  const to = Math.floor(Date.now() / 1000);
  // Рассчитаем from, чтобы получить примерно count свечей:
  let secondsPerCandle;
  if (resolution === 'D') {
    secondsPerCandle = 86400;
  } else {
    secondsPerCandle = parseInt(resolution) * 60;
  }
  const from = to - secondsPerCandle * count;

  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;

  const response = await axios.get(url);

  if (response.data.s !== 'ok') {
    throw new Error('Ошибка получения данных с Finnhub: ' + (response.data.s || 'unknown error'));
  }

  // Формируем массив свечей с полями: t (timestamp), o, h, l, c, v
  const klines = [];
  for (let i = 0; i < response.data.t.length; i++) {
    klines.push({
      t: response.data.t[i], // unix timestamp в секундах
      o: response.data.o[i],
      h: response.data.h[i],
      l: response.data.l[i],
      c: response.data.c[i],
      v: response.data.v[i],
    });
  }

  return klines;
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

      // Отправляем JSON данных в чат (с ограничением по длине)
      const jsonText = JSON.stringify(klines, null, 2);
      const chunkSize = 4000;
      for (let i = 0; i < jsonText.length; i += chunkSize) {
        await ctx.reply(langData.texts.jsonData + '```\n' + jsonText.slice(i, i + chunkSize) + '\n```', { parse_mode: 'MarkdownV2' });
      }

      const closes = klines.map(k => k.c);
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
      console.error('Ошибка получения данных с Finnhub:', e);
      await ctx.reply(langData.texts.errorGeneratingChart + '\n' + e.message);
    }
    return;
  }

  await ctx.answerCbQuery(langData.texts.unknownCmd);
});

// --- Запуск бота ---
bot.launch();
console.log('Бот запущен');
