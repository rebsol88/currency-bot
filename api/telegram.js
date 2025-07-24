import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto'; // исправлено
import annotationPlugin from 'chartjs-plugin-annotation';
import { PocketOptionApi } from 'pocketoption-api-js'; // https://github.com/StanTOP/PocketOptionApiJs

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const PO_USER_ID = 91717690;       // Ваш userId PocketOption
const PO_USER_SECRET = 'eea7f7588a9a0d84b68e0010a0026544'; // Ваш userSecret PocketOption

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

// --- Инициализация PocketOption API ---
const poApi = new PocketOptionApi({
  userId: PO_USER_ID,
  userSecret: PO_USER_SECRET,
});

// --- Языковые данные, пары, OTC, timeframes и прочее ---
const languages = {
  ru: {
    name: 'Русский',
    texts: {
      chooseLanguage: 'Выберите язык / Choose language',
      choosePair: 'Выберите валютную пару',
      chooseTimeframe: 'Выберите таймфрейм',
      analysisStarting: (pair, tf) => `Начинаю анализ для ${pair} на таймфрейме ${tf}...`,
      nextAnalysis: 'Следующий анализ',
      pleaseChoosePairFirst: 'Пожалуйста, сначала выберите валютную пару.',
      errorGeneratingChart: 'Ошибка при генерации графика.',
      unknownCmd: 'Неизвестная команда.',
    },
    pairsMain: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD'],
    pairsOTC: ['OTC_EURUSD', 'OTC_GBPUSD', 'OTC_USDJPY', 'OTC_USDCHF', 'OTC_USDCAD', 'OTC_AUDUSD', 'OTC_NZDUSD'],
    timeframes: [
      { label: '1м', value: '1m', minutes: 1 },
      { label: '5м', value: '5m', minutes: 5 },
      { label: '15м', value: '15m', minutes: 15 },
      { label: '1ч', value: '1h', minutes: 60 },
      { label: '4ч', value: '4h', minutes: 240 },
      { label: '1д', value: '1d', minutes: 1440 },
    ],
  },
  en: {
    name: 'English',
    texts: {
      chooseLanguage: 'Choose language / Выберите язык',
      choosePair: 'Choose currency pair',
      chooseTimeframe: 'Choose timeframe',
      analysisStarting: (pair, tf) => `Starting analysis for ${pair} on timeframe ${tf}...`,
      nextAnalysis: 'Next analysis',
      pleaseChoosePairFirst: 'Please choose a currency pair first.',
      errorGeneratingChart: 'Error generating chart.',
      unknownCmd: 'Unknown command.',
    },
    pairsMain: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD'],
    pairsOTC: ['OTC_EURUSD', 'OTC_GBPUSD', 'OTC_USDJPY', 'OTC_USDCHF', 'OTC_USDCAD', 'OTC_AUDUSD', 'OTC_NZDUSD'],
    timeframes: [
      { label: '1m', value: '1m', minutes: 1 },
      { label: '5m', value: '5m', minutes: 5 },
      { label: '15m', value: '15m', minutes: 15 },
      { label: '1h', value: '1h', minutes: 60 },
      { label: '4h', value: '4h', minutes: 240 },
      { label: '1d', value: '1d', minutes: 1440 },
    ],
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
  OTC_EURUSD: { ru: 'OTC EUR/USD', en: 'OTC EUR/USD' },
  OTC_GBPUSD: { ru: 'OTC GBP/USD', en: 'OTC GBP/USD' },
  OTC_USDJPY: { ru: 'OTC USD/JPY', en: 'OTC USD/JPY' },
  OTC_USDCHF: { ru: 'OTC USD/CHF', en: 'OTC USD/CHF' },
  OTC_USDCAD: { ru: 'OTC USD/CAD', en: 'OTC USD/CAD' },
  OTC_AUDUSD: { ru: 'OTC AUD/USD', en: 'OTC AUD/USD' },
  OTC_NZDUSD: { ru: 'OTC NZD/USD', en: 'OTC NZD/USD' },
};

// --- Ваша существующая реализация функций: ---
// generateFakeOHLCFromTime, calculateSMA, calculateRSI, calculateMACD, calculateStochastic,
// findSupportResistance, generateChartImage, analyzeIndicators и другие
// вставьте сюда без изменений из вашего исходного кода.

// --- Функция получения свечей из PocketOption ---
async function getCandlesFromPocketOption(pair, timeframe, count = 100) {
  if (!poApi.isConnected()) {
    await poApi.connect();
    await poApi.auth();
  }

  try {
    const candles = await poApi.getCandles({
      symbol: pair,
      timeframe: timeframe,
      count: count,
    });

    const tfMinutes = (() => {
      switch (timeframe) {
        case '1m': return 1;
        case '5m': return 5;
        case '15m': return 15;
        case '1h': return 60;
        case '4h': return 240;
        case '1d': return 1440;
        default: return 1;
      }
    })();

    return candles.map(c => ({
      openTime: c.time * 1000,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      closeTime: c.time * 1000 + tfMinutes * 60 * 1000 - 1,
      volume: c.volume,
    }));
  } catch (e) {
    console.error('Ошибка получения свечей из PocketOption:', e);
    return null;
  }
}

// --- Telegram Bot ---

const historyData = {};

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

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
    let klines = historyData[key];

    if (!klines) {
      klines = await getCandlesFromPocketOption(ctx.session.pair, tf.value, 100);
      if (!klines) {
        const now = Date.now();
        klines = generateFakeOHLCFromTime(now - tf.minutes * 60 * 1000 * 100, 100, tf.minutes, ctx.session.pair);
      }
      historyData[key] = klines;
    }

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
