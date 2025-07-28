import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';
import fetch from 'node-fetch';

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
  chartCallback: (ChartJS) => {
    ChartJS.register(annotationPlugin);
  },
  chartJs: Chart,
});

const languages = {
  ru: {
    name: 'Русский',
    pairsMain: [
      'EURUSD', 'USDJPY', 'GBPUSD', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP',
      'EURJPY', 'GBPJPY', 'CHFJPY', 'AUDJPY', 'EURCHF', 'EURCAD', 'AUDCAD', 'NZDJPY',
    ],
    pairsOTC: [],
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
      supportLabel: 'Поддержка',
      resistanceLabel: 'Сопротивление',
      priceLabel: 'Цена',
      timeLabel: 'Время (UTC)',
      trendUp: 'Текущий тренд восходящий',
      trendDown: 'Текущий тренд нисходящий',
      trendNone: 'Тренд не выражен',
      volumeDecreasing: 'Объём снижается, что может указывать на слабость текущего движения.',
      volumeIncreasing: 'Объём стабильный или растущий, поддерживает текущий тренд.',
      candlePatternDetected: 'Обнаружен свечной паттерн',
      divergenceDetected: 'Обнаружена дивергенция RSI',
      closeToSupport: 'Цена близка к поддержке около',
      closeToResistance: 'Цена близка к сопротивлению около',
      breakoutSupport: 'Пробой и ретест поддержки с подтверждением — сильный сигнал к покупке.',
      breakoutResistance: 'Пробой и ретест сопротивления с подтверждением — сильный сигнал к продаже.',
      buySignal: 'Сигнал на покупку',
      sellSignal: 'Сигнал на продажу',
      nextAnalysis: 'Следующий анализ',
    },
  },
  en: {
    name: 'English',
    pairsMain: [
      'EURUSD', 'USDJPY', 'GBPUSD', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP',
      'EURJPY', 'GBPJPY', 'CHFJPY', 'AUDJPY', 'EURCHF', 'EURCAD', 'AUDCAD', 'NZDJPY',
    ],
    pairsOTC: [],
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
      supportLabel: 'Support',
      resistanceLabel: 'Resistance',
      priceLabel: 'Price',
      timeLabel: 'Time (UTC)',
      trendUp: 'Current trend is up',
      trendDown: 'Current trend is down',
      trendNone: 'Trend is not defined',
      volumeDecreasing: 'Volume is decreasing, indicating possible weakness of the current move.',
      volumeIncreasing: 'Volume is stable or increasing, supporting the current trend.',
      candlePatternDetected: 'Candle pattern detected',
      divergenceDetected: 'RSI divergence detected',
      closeToSupport: 'Price is close to support around',
      closeToResistance: 'Price is close to resistance around',
      breakoutSupport: 'Breakout and retest of support confirmed — strong buy signal.',
      breakoutResistance: 'Breakout and retest of resistance confirmed — strong sell signal.',
      buySignal: 'Buy signal',
      sellSignal: 'Sell signal',
      nextAnalysis: 'Next analysis',
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

// --- Получение OHLC с exchangerate.host (дневные данные, упрощённо) ---
async function fetchOHLC(pair, timeframeMinutes, count) {
  const from = pair.slice(0, 3);
  const to = pair.slice(3, 6);
  const endDate = new Date();
  const msPerMinute = 60 * 1000;
  const msPerDay = 24 * 60 * 60 * 1000;

  // Для демонстрации поддерживаем только таймфрейм 1д (1440 мин)
  if (timeframeMinutes !== 1440) {
    return null;
  }

  const startDate = new Date(endDate.getTime() - count * msPerDay);
  const startDateStr = startDate.toISOString().slice(0, 10);
  const endDateStr = endDate.toISOString().slice(0, 10);

  const url = `https://api.exchangerate.host/timeseries?start_date=${startDateStr}&end_date=${endDateStr}&base=${from}&symbols=${to}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Ошибка запроса курсов: ${res.status}`);

    const json = await res.json();
    if (!json.rates) throw new Error('Нет данных курсов');

    const ratesArr = Object.entries(json.rates)
      .map(([date, obj]) => ({ date, rate: obj[to] }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const ohlc = [];

    for (let i = 0; i < ratesArr.length; i++) {
      const open = i === 0 ? ratesArr[i].rate : ratesArr[i - 1].rate;
      const close = ratesArr[i].rate;
      const high = Math.max(open, close) * (1 + 0.002);
      const low = Math.min(open, close) * (1 - 0.002);
      const openTime = new Date(ratesArr[i].date).getTime();
      const closeTime = openTime + msPerDay - 1;

      ohlc.push({
        openTime,
        open,
        high,
        low,
        close,
        closeTime,
        volume: 1000,
      });
    }

    return ohlc.slice(-count);
  } catch (e) {
    console.error('Ошибка получения OHLC:', e);
    return null;
  }
}

// --- Заглушки функций индикаторов и анализа (замените на ваши реализации) ---
function calculateSMA(closes, period) { return []; }
function calculateRSI(closes, period) { return []; }
function calculateMACD(closes) { return { macdLine: [], signalLine: [], histogram: [] }; }
function calculateStochastic(klines) { return []; }
function findSupportResistance(klines) { return { supports: [], resistances: [] }; }
function isVolumeDecreasing(klines) { return false; }
function detectCandlePattern(klines) { return null; }
function detectRSIDivergence(rsi) { return false; }
function checkBreakoutWithRetest(klines, supports, resistances) { return { breakoutSupport: false, breakoutResistance: false }; }
function generateDetailedRecommendation() { return ''; }
function analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, lang) {
  const langData = languages[lang];
  return langData.texts.recommendationPrefix + ' ' + 'Анализ пока не реализован.';
}
async function generateChartImage(klines, sma5, sma15, supports, resistances, pair, timeframeLabel, lang) {
  return Buffer.alloc(0);
}

// --- Вспомогательная функция для разбиения массива на чанки ---
function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// --- Отправка выбора валютной пары с обработкой ошибки "message is not modified" ---
async function sendPairSelection(ctx, lang) {
  const langData = languages[lang];
  const mainButtons = langData.pairsMain.map(p => Markup.button.callback(displayNames[p][lang], displayNames[p][lang]));
  const mainKeyboard = chunkArray(mainButtons, 2);

  try {
    // Используем editMessageText, но игнорируем ошибку "message is not modified"
    await ctx.editMessageText(langData.texts.choosePair, Markup.inlineKeyboard(mainKeyboard));
  } catch (e) {
    if (
      e.description &&
      e.description.includes('message is not modified')
    ) {
      // Игнорируем ошибку, т.к. сообщение и клавиатура не изменились
      // Можно при желании логировать или просто молча пропускать
      return;
    }
    throw e;
  }
}

// --- Основной код бота ---

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

    await ctx.editMessageText(langData.texts.analysisStarting(displayNames[ctx.session.pair][lang], tf.label));

    const key = `${ctx.session.pair}_${tf.value}`;

    if (tf.minutes !== 1440) {
      await ctx.reply(`Для таймфрейма "${tf.label}" пока нет данных. Пожалуйста, выберите 1 день.`);
      return;
    }

    const klines = await fetchOHLC(ctx.session.pair, tf.minutes, 100);
    if (!klines) {
      await ctx.reply(langData.texts.errorGeneratingChart);
      return;
    }
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
      Markup.button.callback(langData.texts.nextAnalysis, 'next_analysis')
    ]));

    return;
  }

  await ctx.answerCbQuery(langData.texts.unknownCmd);
});

bot.launch();
console.log('Бот запущен и готов к работе');
