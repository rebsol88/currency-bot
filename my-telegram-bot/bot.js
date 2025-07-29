import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import axios from 'axios';

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const ALPHAVANTAGE_API_KEY = '6XLTMJEEILYL1VE3'; // Ваш ключ Alpha Vantage

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
});

// --- Языковые данные и пары (без изменений) ---
const languages = {
  ru: {
    name: 'Русский',
    pairsMain: [
      'EURUSD', 'USDJPY', 'GBPUSD', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP',
      'EURJPY', 'GBPJPY', 'CHFJPY', 'AUDJPY', 'EURCHF', 'EURCAD', 'AUDCAD', 'NZDJPY',
    ],
    pairsOTC: [
      'OTC_EURAUD', 'OTC_EURCAD', 'OTC_EURCHF', 'OTC_EURJPY',
      'OTC_EURNZD', 'OTC_EURUSD', 'OTC_GBPCHF', 'OTC_GBPJPY',
      'OTC_GBPNZD', 'OTC_GBPUSD', 'OTC_USDCAD', 'OTC_USDCHF',
      'OTC_USDJPY', 'OTC_USDNZD', 'OTC_AUDCAD', 'OTC_AUDCHF',
    ],
    timeframes: [
      { label: '1 минута', value: '1min', minutes: 1 },
      { label: '5 минут', value: '5min', minutes: 5 },
      { label: '15 минут', value: '15min', minutes: 15 },
      { label: '1 час', value: '60min', minutes: 60 },
      { label: '4 часа', value: '240min', minutes: 240 },
      { label: '1 день', value: '1day', minutes: 1440 },
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
    pairsOTC: [
      'OTC_EURAUD', 'OTC_EURCAD', 'OTC_EURCHF', 'OTC_EURJPY',
      'OTC_EURNZD', 'OTC_EURUSD', 'OTC_GBPCHF', 'OTC_GBPJPY',
      'OTC_GBPNZD', 'OTC_GBPUSD', 'OTC_USDCAD', 'OTC_USDCHF',
      'OTC_USDJPY', 'OTC_USDNZD', 'OTC_AUDCAD', 'OTC_AUDCHF',
    ],
    timeframes: [
      { label: '1 minute', value: '1min', minutes: 1 },
      { label: '5 minutes', value: '5min', minutes: 5 },
      { label: '15 minutes', value: '15min', minutes: 15 },
      { label: '1 hour', value: '60min', minutes: 60 },
      { label: '4 hours', value: '240min', minutes: 240 },
      { label: '1 day', value: '1day', minutes: 1440 },
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
  OTC_EURAUD: { ru: 'OTC EUR/AUD', en: 'OTC EUR/AUD' },
  OTC_EURCAD: { ru: 'OTC EUR/CAD', en: 'OTC EUR/CAD' },
  OTC_EURCHF: { ru: 'OTC EUR/CHF', en: 'OTC EUR/CHF' },
  OTC_EURJPY: { ru: 'OTC EUR/JPY', en: 'OTC EUR/JPY' },
  OTC_EURNZD: { ru: 'OTC EUR/NZD', en: 'OTC EUR/NZD' },
  OTC_EURUSD: { ru: 'OTC EUR/USD', en: 'OTC EUR/USD' },
  OTC_GBPCHF: { ru: 'OTC GBP/CHF', en: 'OTC GBP/CHF' },
  OTC_GBPJPY: { ru: 'OTC GBP/JPY', en: 'OTC GBP/JPY' },
  OTC_GBPNZD: { ru: 'OTC GBP/NZD', en: 'OTC GBP/NZD' },
  OTC_GBPUSD: { ru: 'OTC GBP/USD', en: 'OTC GBP/USD' },
  OTC_USDCAD: { ru: 'OTC USD/CAD', en: 'OTC USD/CAD' },
  OTC_USDCHF: { ru: 'OTC USD/CHF', en: 'OTC USD/CHF' },
  OTC_USDJPY: { ru: 'OTC USD/JPY', en: 'OTC USD/JPY' },
  OTC_USDNZD: { ru: 'OTC USD/NZD', en: 'OTC USD/NZD' },
  OTC_AUDCAD: { ru: 'OTC AUD/CAD', en: 'OTC AUD/CAD' },
  OTC_AUDCHF: { ru: 'OTC AUD/CHF', en: 'OTC AUD/CHF' },
};

// --- Кэш свечей ---
const candlesCache = new Map(); // ключ: pair_timeframe, значение: klines array

// --- Вспомогательные функции ---

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// Преобразование пары из формата PO в Alpha Vantage
// Alpha Vantage требует from_symbol и to_symbol отдельно, например EUR и USD
function parsePairAlphaVantage(pair) {
  // Уберём OTC_ если есть
  if (pair.startsWith('OTC_')) pair = pair.slice(4);
  // Разобьём на две части по 3 символа
  const from_symbol = pair.slice(0, 3);
  const to_symbol = pair.slice(3);
  return { from_symbol, to_symbol };
}

// Преобразование таймфрейма из вашего списка в Alpha Vantage
// Alpha Vantage поддерживает: 1min, 5min, 15min, 30min, 60min
// Для 4h и 1d — Alpha Vantage не поддерживает FX_INTRADAY, можно использовать FX_DAILY для 1d
function mapTimeframeToAlphaVantage(tfValue) {
  if (tfValue === '1min') return '1min';
  if (tfValue === '5min') return '5min';
  if (tfValue === '15min') return '15min';
  if (tfValue === '60min') return '60min';
  if (tfValue === '240min') return null; // нет поддержки 4h в FX_INTRADAY
  if (tfValue === '1day') return null; // нужно FX_DAILY
  return null;
}

// --- Функция получения свечей с Alpha Vantage ---
async function fetchCandlesAlphaVantage(pair, timeframe, outputsize = 'compact') {
  const { from_symbol, to_symbol } = parsePairAlphaVantage(pair);
  const interval = mapTimeframeToAlphaVantage(timeframe);

  if (!interval) {
    // Для 1day (день) используем FX_DAILY
    if (timeframe === '1day') {
      const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${from_symbol}&to_symbol=${to_symbol}&apikey=${ALPHAVANTAGE_API_KEY}&outputsize=${outputsize}`;
      const response = await axios.get(url);
      const data = response.data;
      if (!data['Time Series FX (Daily)']) throw new Error('No daily data');
      return Object.entries(data['Time Series FX (Daily)'])
        .map(([time, candle]) => ({
          openTime: new Date(time).getTime(),
          open: parseFloat(candle['1. open']),
          high: parseFloat(candle['2. high']),
          low: parseFloat(candle['3. low']),
          close: parseFloat(candle['4. close']),
          volume: 0,
        }))
        .sort((a, b) => a.openTime - b.openTime);
    }
    throw new Error('Unsupported timeframe for Alpha Vantage FX_INTRADAY');
  }

  const url = `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${from_symbol}&to_symbol=${to_symbol}&interval=${interval}&apikey=${ALPHAVANTAGE_API_KEY}&outputsize=${outputsize}`;
  const response = await axios.get(url);
  const data = response.data;
  const key = `Time Series FX (${interval})`;
  if (!data[key]) throw new Error('No intraday data');

  return Object.entries(data[key])
    .map(([time, candle]) => ({
      openTime: new Date(time).getTime(),
      open: parseFloat(candle['1. open']),
      high: parseFloat(candle['2. high']),
      low: parseFloat(candle['3. low']),
      close: parseFloat(candle['4. close']),
      volume: 0,
    }))
    .sort((a, b) => a.openTime - b.openTime);
}

// --- Индикаторы и анализ ---
// Вставьте сюда ваши функции calculateSMA, calculateRSI, calculateEMA, calculateMACD, calculateStochastic, findSupportResistance, isVolumeDecreasing, detectCandlePattern, detectRSIDivergence, checkBreakoutWithRetest, generateDetailedRecommendation, analyzeIndicators, generateChartImage
// Для примера вставляю заглушки — замените на ваши реализации:

function calculateSMA(data, period) {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}
function calculateRSI(data, period) {
  // Реализуйте ваш RSI
  return new Array(data.length).fill(null);
}
function calculateEMA(data, period) {
  // Реализуйте ваш EMA
  return new Array(data.length).fill(null);
}
function calculateMACD(data) {
  // Реализуйте ваш MACD
  return { macdLine: [], signalLine: [], histogram: [] };
}
function calculateStochastic(data) {
  // Реализуйте ваш Stochastic
  return { k: [], d: [] };
}
function findSupportResistance(data) {
  // Реализуйте поиск уровней поддержки и сопротивления
  return { supports: [], resistances: [] };
}
function isVolumeDecreasing(data) {
  // Реализуйте проверку объёма
  return false;
}
function detectCandlePattern(data) {
  // Реализуйте обнаружение паттернов
  return false;
}
function detectRSIDivergence(data) {
  // Реализуйте обнаружение дивергенций RSI
  return false;
}
function checkBreakoutWithRetest(data) {
  // Реализуйте проверку пробоев с ретестом
  return null;
}
function generateDetailedRecommendation() {
  // Реализуйте генерацию рекомендаций
  return '';
}
function analyzeIndicators() {
  // Реализуйте анализ индикаторов
  return 'Анализ пока не реализован.';
}
async function generateChartImage() {
  // Реализуйте генерацию графика с помощью chartJSNodeCanvas
  // Для примера возвращаем пустой буфер
  return Buffer.from([]);
}

// --- Функция для вывода выбора валютных пар ---
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

  await ctx.editMessageText(langData.texts.choosePair, Markup.inlineKeyboard(keyboardFinal));
}

// --- Telegram Bot ---

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

    try {
      // Получаем свечи с Alpha Vantage
      const klines = await fetchCandlesAlphaVantage(ctx.session.pair, tf.value, 'compact');

      if (!klines || klines.length < 20) {
        await ctx.reply(langData.texts.errorGeneratingChart + '\n' + langData.texts.pleaseChoosePairFirst);
        return;
      }

      // Кэшируем
      candlesCache.set(`${ctx.session.pair}_${tf.value}`, klines);

      const closes = klines.map(k => k.close);
      const sma5 = calculateSMA(closes, 5);
      const sma15 = calculateSMA(closes, 15);
      const rsi = calculateRSI(closes, 14);
      const macd = calculateMACD(closes);
      const stochastic = calculateStochastic(klines);
      const { supports, resistances } = findSupportResistance(klines);

      const analysisText = analyzeIndicators(
        klines,
        sma5,
        sma15,
        rsi,
        macd,
        stochastic,
        supports,
        resistances,
        lang,
      );

      const chartBuffer = await generateChartImage(
        klines,
        sma5,
        sma15,
        supports,
        resistances,
        ctx.session.pair,
        tf.label,
        lang,
      );

      await ctx.replyWithPhoto({ source: chartBuffer }, { caption: analysisText });

      const nextBtn = Markup.inlineKeyboard([
        Markup.button.callback(langData.texts.nextAnalysis, 'next_analysis'),
      ]);
      await ctx.reply(langData.texts.nextAnalysis, nextBtn);
    } catch (e) {
      console.error(e);
      await ctx.reply(langData.texts.errorGeneratingChart + '\n' + e.message);
    }

    return;
  }

  await ctx.answerCbQuery(langData.texts.unknownCmd);
});

// --- Запуск бота ---
bot.launch();
console.log('Bot started');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
