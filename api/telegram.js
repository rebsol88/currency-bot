import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import fetch from 'node-fetch';

// --- Регистрируем компоненты и плагины Chart.js ---
Chart.register(...registerables);
Chart.register(annotationPlugin);

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// Инициализация chartJSNodeCanvas с регистрацией плагина annotation
const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  chartCallback: () => {}, // регистрация компонентов уже сделана выше
});

// --- Данные и функции (сокращены для примера, подставьте свои реализации) ---
const languages = {
  ru: {
    name: 'Русский',
    pairsMain: [
      'EURUSD', 'USDJPY', 'GBPUSD', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP',
      'EURJPY', 'GBPJPY', 'CHFJPY', 'AUDJPY', 'EURCHF', 'EURCAD', 'AUDCAD', 'NZDJPY',
    ],
    timeframes: [
      { label: '1 минута', value: '1m', minutes: 1 },
      { label: '5 минут', value: '5m', minutes: 5 },
      { label: '15 минут', value: '15m', minutes: 15 },
      { label: '1 час', value: '1h', minutes: 60 },
      { label: '4 часа', value: '4h', minutes: 240 },
      { label: '1 день', value: '1d', minutes: 1440 },
    ],
    texts: {
      chooseLanguage: 'Выберите язык / Choose language',
      choosePair: 'Выберите валютную пару:',
      chooseTimeframe: 'Выберите таймфрейм:',
      analysisStarting: (pair, tf) => `Начинаю анализ ${pair} на таймфрейме ${tf}...`,
      unknownCmd: 'Неизвестная команда',
      pleaseChoosePairFirst: 'Пожалуйста, сначала выберите валютную пару.',
      errorGeneratingChart: 'Ошибка при генерации графика.',
      recommendationPrefix: 'Рекомендация:',
      nextAnalysis: 'Следующий анализ',
      priceNow: (pair, price) => `Текущая цена ${pair}: ${price.toFixed(6)}`,
    },
  },
  en: {
    name: 'English',
    pairsMain: [
      'EURUSD', 'USDJPY', 'GBPUSD', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP',
      'EURJPY', 'GBPJPY', 'CHFJPY', 'AUDJPY', 'EURCHF', 'EURCAD', 'AUDCAD', 'NZDJPY',
    ],
    timeframes: [
      { label: '1 minute', value: '1m', minutes: 1 },
      { label: '5 minutes', value: '5m', minutes: 5 },
      { label: '15 minutes', value: '15m', minutes: 15 },
      { label: '1 hour', value: '1h', minutes: 60 },
      { label: '4 hours', value: '4h', minutes: 240 },
      { label: '1 day', value: '1d', minutes: 1440 },
    ],
    texts: {
      chooseLanguage: 'Choose language / Выберите язык',
      choosePair: 'Choose currency pair:',
      chooseTimeframe: 'Choose timeframe:',
      analysisStarting: (pair, tf) => `Starting analysis of ${pair} on timeframe ${tf}...`,
      unknownCmd: 'Unknown command',
      pleaseChoosePairFirst: 'Please choose a currency pair first.',
      errorGeneratingChart: 'Error generating chart.',
      recommendationPrefix: 'Recommendation:',
      nextAnalysis: 'Next analysis',
      priceNow: (pair, price) => `Current price of ${pair}: ${price.toFixed(6)}`,
    },
  },
};

const displayNames = {
  EURUSD: { ru: 'EUR/USD', en: 'EUR/USD' },
  USDJPY: { ru: 'USD/JPY', en: 'USD/JPY' },
  GBPUSD: { ru: 'GBP/USD', en: 'GBP/USD' },
  USDCHF: { ru: 'USD/CHF', en: 'USD/CHF' },
  AUDUSD: { ru: 'AUD/USD', en: 'AUD/USD' },
  USDCAD: { ru: 'USD/CAD', en: 'USD/CAD' },
  NZDUSD: { ru: 'NZD/USD', en: 'NZD/USD' },
  EURGBP: { ru: 'EUR/GBP', en: 'EUR/GBP' },
  EURJPY: { ru: 'EUR/JPY', en: 'EUR/JPY' },
  GBPJPY: { ru: 'GBP/JPY', en: 'GBP/JPY' },
  CHFJPY: { ru: 'CHF/JPY', en: 'CHF/JPY' },
  AUDJPY: { ru: 'AUD/JPY', en: 'AUD/JPY' },
  EURCHF: { ru: 'EUR/CHF', en: 'EUR/CHF' },
  EURCAD: { ru: 'EUR/CAD', en: 'EUR/CAD' },
  AUDCAD: { ru: 'AUD/CAD', en: 'AUD/CAD' },
  NZDJPY: { ru: 'NZD/JPY', en: 'NZD/JPY' },
};

// Заглушки функций (замените своими)
async function fetchOHLC(pair, timeframeMinutes, count) { /* ... */ return null; }
function calculateSMA(closes, period) { /* ... */ return []; }
function calculateRSI(closes, period) { /* ... */ return []; }
function calculateMACD(closes) { /* ... */ return { macdLine: [], signalLine: [], histogram: [] }; }
function calculateStochastic(klines) { /* ... */ return []; }
function findSupportResistance(klines) { return { supports: [], resistances: [] }; }
function analyzeIndicators() { return 'Анализ пока не реализован.'; }
async function generateChartImage() { return Buffer.alloc(0); }
function chunkArray(arr, size) {
  const result = [];
  for(let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// --- Новая функция получения котировок с exchangerate.host ---
async function fetchForexPrices(pairs) {
  const uniqueBases = new Set(pairs.map(p => p.slice(0,3)));
  const prices = {};

  for (const base of uniqueBases) {
    const targets = pairs.filter(p => p.startsWith(base)).map(p => p.slice(3));
    if (targets.length === 0) continue;

    const url = `https://api.exchangerate.host/latest?base=${base}&symbols=${targets.join(',')}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.rates) {
        for (const [quote, rate] of Object.entries(data.rates)) {
          const pair = base + quote;
          if (pairs.includes(pair)) {
            prices[pair] = rate;
          }
        }
      }
    } catch (e) {
      console.error('Ошибка получения курсов:', e);
    }
  }
  return prices;
}

async function sendPairSelection(ctx, lang) {
  const langData = languages[lang];
  const mainButtons = langData.pairsMain.map(p => Markup.button.callback(displayNames[p][lang], displayNames[p][lang]));
  const mainKeyboard = chunkArray(mainButtons, 2);
  try {
    await ctx.editMessageText(langData.texts.choosePair, Markup.inlineKeyboard(mainKeyboard));
  } catch (e) {
    if (e.description && e.description.includes('message is not modified')) return;
    throw e;
  }
}

const historyData = {};

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
  ctx.session.lang = lang;
  await ctx.answerCbQuery();
  await sendPairSelection(ctx, lang);
});

bot.on('callback_query', async (ctx) => {
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

    // Получаем текущие котировки валютных пар
    const prices = await fetchForexPrices(languages[lang].pairsMain);

    if (prices && prices[ctx.session.pair]) {
      await ctx.editMessageText(langData.texts.analysisStarting(displayNames[ctx.session.pair][lang], tf.label));
      await ctx.reply(langData.texts.priceNow(displayNames[ctx.session.pair][lang], prices[ctx.session.pair]));
    } else {
      await ctx.reply(langData.texts.errorGeneratingChart);
    }

    // Пример вызова анализа и генерации графиков оставлен в комментариях
    /*
    const klines = await fetchOHLC(ctx.session.pair, tf.minutes, 100);
    if (!klines) {
      await ctx.reply(langData.texts.errorGeneratingChart);
      return;
    }
    historyData[`${ctx.session.pair}_${tf.value}`] = klines;

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
      Markup.button.callback(langData.texts.nextAnalysis, 'next_analysis')
    ]));
    */

    return;
  }

  await ctx.answerCbQuery(langData.texts.unknownCmd);
});

bot.launch();
console.log('Бот запущен и готов к работе');
