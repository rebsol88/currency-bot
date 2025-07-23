import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const pairsMain = [
  'EURUSD', 'USDJPY', 'GBPUSD', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP',
  'EURJPY', 'GBPJPY', 'CHFJPY', 'AUDJPY', 'EURCHF', 'EURCAD', 'AUDCAD', 'NZDJPY',
];

const pairsOTC = [
  'OTC_EURAUD', 'OTC_EURCAD', 'OTC_EURCHF', 'OTC_EURJPY',
  'OTC_EURNZD', 'OTC_EURUSD', 'OTC_GBPCHF', 'OTC_GBPJPY',
  'OTC_GBPNZD', 'OTC_GBPUSD', 'OTC_USDCAD', 'OTC_USDCHF',
  'OTC_USDJPY', 'OTC_USDNZD', 'OTC_AUDCAD', 'OTC_AUDCHF',
];

const timeframes = [
  { label: { ru: '1 минута', en: '1 minute' }, value: '1m', minutes: 1 },
  { label: { ru: '5 минут', en: '5 minutes' }, value: '5m', minutes: 5 },
  { label: { ru: '15 минут', en: '15 minutes' }, value: '15m', minutes: 15 },
  { label: { ru: '1 час', en: '1 hour' }, value: '1h', minutes: 60 },
  { label: { ru: '4 часа', en: '4 hours' }, value: '4h', minutes: 240 },
  { label: { ru: '1 день', en: '1 day' }, value: '1d', minutes: 1440 },
];

const width = 900;
const height = 600;

const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  chartCallback: (ChartJS) => {
    ChartJS.register(annotationPlugin);
  },
});

// Названия пар на двух языках
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

// --- Тексты на двух языках ---
const texts = {
  start: {
    ru: 'Привет! Выберите язык / Choose your language:',
    en: 'Hello! Please choose your language / Пожалуйста, выберите язык:',
  },
  choosePair: {
    ru: 'Выберите валютную пару:',
    en: 'Choose a currency pair:',
  },
  chooseTimeframe: {
    ru: 'Выберите таймфрейм:',
    en: 'Choose a timeframe:',
  },
  analyzing: {
    ru: (pair, tf) => `Начинаю анализ ${pair} на таймфрейме ${tf}...`,
    en: (pair, tf) => `Starting analysis for ${pair} on timeframe ${tf}...`,
  },
  unknownCommand: {
    ru: 'Неизвестная команда',
    en: 'Unknown command',
  },
  errorChart: {
    ru: 'Ошибка при генерации графика.',
    en: 'Error generating chart.',
  },
  volumeDecreasing: {
    ru: 'Объём снижается, что может указывать на слабость текущего движения.',
    en: 'Volume is decreasing, which may indicate weakness of the current move.',
  },
  volumeStable: {
    ru: 'Объём стабильный или растущий, поддерживает текущий тренд.',
    en: 'Volume is stable or increasing, supporting the current trend.',
  },
};

// --- Функции для локализации текста ---
function t(ctx, key, ...args) {
  const lang = ctx.session.language || 'ru';
  const txt = texts[key];
  if (!txt) return '';
  if (typeof txt === 'function') return txt(...args);
  return txt[lang] || txt['ru'];
}

function getDisplayName(pair, lang = 'ru') {
  return displayNames[pair]?.[lang] || pair;
}

function getTimeframeLabel(tf, lang = 'ru') {
  return tf.label?.[lang] || tf.label || '';
}

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// --- Генерация фиктивных OHLC данных ---
function generateFakeOHLCFromTime(startTime, count, intervalMinutes, pair) {
  const klines = [];
  let time = startTime;
  let basePrice = 1.0;
  if (pair === 'EURUSD') basePrice = 1.1;
  else if (pair === 'USDJPY') basePrice = 140;
  else if (pair === 'GBPUSD') basePrice = 1.3;
  else if (pair === 'USDCHF') basePrice = 0.9;
  else if (pair === 'AUDUSD') basePrice = 0.7;
  else if (pair === 'USDCAD') basePrice = 1.25;
  else if (pair === 'NZDUSD') basePrice = 0.65;
  else if (pair === 'EURGBP') basePrice = 0.85;
  else if (pair.startsWith('OTC_')) basePrice = 1.0;

  for (let i = 0; i < count; i++) {
    const open = basePrice + (Math.random() - 0.5) * 0.01;
    const close = open + (Math.random() - 0.5) * 0.01;
    const high = Math.max(open, close) + Math.random() * 0.005;
    const low = Math.min(open, close) - Math.random() * 0.005;
    const volume = Math.floor(100 + Math.random() * 1000);

    klines.push({
      openTime: time,
      open,
      high,
      low,
      close,
      volume,
    });

    time += intervalMinutes * 60 * 1000;
    basePrice = close;
  }
  return klines;
}

// --- Простые реализации индикаторов (пример) ---
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
  const rsi = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      rsi.push(null);
      continue;
    }
    let gains = 0;
    let losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j] - data[j - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const rs = gains / (losses || 1);
    rsi.push(100 - 100 / (1 + rs));
  }
  return rsi;
}

function calculateMACD(data) {
  return { macd: [], signal: [], histogram: [] };
}
function calculateStochastic(data) {
  return { k: [], d: [] };
}
function findSupportResistance(data) {
  return { supports: [], resistances: [] };
}
function analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, lang) {
  return lang === 'ru'
    ? 'Анализ завершён. (Здесь можно добавить подробный анализ)'
    : 'Analysis completed. (Detailed analysis can be added here)';
}

// --- Генерация графика ---
async function generateChartImage(klines, sma5, sma15, supports, resistances, pair, tfLabel) {
  const labels = klines.map((k) => new Date(k.openTime).toLocaleString());
  const close = klines.map((k) => k.close);

  const datasets = [
    {
      label: 'Close',
      data: close,
      borderColor: 'blue',
      fill: false,
      tension: 0.1,
      pointRadius: 0,
    },
    {
      label: 'SMA 5',
      data: sma5,
      borderColor: 'green',
      fill: false,
      tension: 0.1,
      pointRadius: 0,
    },
    {
      label: 'SMA 15',
      data: sma15,
      borderColor: 'red',
      fill: false,
      tension: 0.1,
      pointRadius: 0,
    },
  ];

  const config = {
    type: 'line',
    data: {
      labels,
      datasets,
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `${pair} - ${tfLabel}`,
        },
        legend: {
          display: true,
          position: 'bottom',
        },
        annotation: {
          annotations: {
            // Можно добавить аннотации, например, уровни поддержки/сопротивления
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: { display: true, text: 'Время' },
        },
        y: {
          display: true,
          title: { display: true, text: 'Цена' },
        },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(config);
}

// --- Telegram Bot ---

const historyData = {}; // { 'EURUSD_1m': [klines...] }

bot.start(async (ctx) => {
  ctx.session = {};
  await ctx.reply(
    texts.start.ru + '\n' + texts.start.en,
    Markup.inlineKeyboard([
      [
        Markup.button.callback('🇷🇺 Русский', 'lang_ru'),
        Markup.button.callback('🇬🇧 English', 'lang_en'),
      ],
    ])
  );
});

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const lang = ctx.session.language || 'ru';

  if (data === 'lang_ru' || data === 'lang_en') {
    ctx.session.language = data === 'lang_ru' ? 'ru' : 'en';
    await ctx.answerCbQuery();

    const langPairsMain = pairsMain.map((p) => getDisplayName(p, ctx.session.language));
    const langPairsOTC = pairsOTC.map((p) => getDisplayName(p, ctx.session.language));

    const mainKeyboard = chunkArray(langPairsMain, 2);
    const otcKeyboard = chunkArray(langPairsOTC, 2);

    const maxRows = Math.max(mainKeyboard.length, otcKeyboard.length);
    const keyboardFinal = [];

    for (let i = 0; i < maxRows; i++) {
      const leftButtons = mainKeyboard[i] || [];
      const rightButtons = otcKeyboard[i] || [];

      while (leftButtons.length < 2) leftButtons.push(' ');
      while (rightButtons.length < 2) rightButtons.push(' ');

      keyboardFinal.push([
        Markup.button.callback(leftButtons[0].trim(), leftButtons[0].trim()),
        Markup.button.callback(rightButtons[0].trim(), rightButtons[0].trim()),
      ]);
      keyboardFinal.push([
        Markup.button.callback(leftButtons[1].trim(), leftButtons[1].trim()),
        Markup.button.callback(rightButtons[1].trim(), rightButtons[1].trim()),
      ]);
    }

    await ctx.editMessageText(t(ctx, 'choosePair'), Markup.inlineKeyboard(keyboardFinal));
    return;
  }

  // Проверяем, выбрана ли валютная пара
  const pairEntry = Object.entries(displayNames).find(
    ([key, names]) => names[lang] === data
  );
  if (pairEntry) {
    ctx.session.pair = pairEntry[0];
    await ctx.answerCbQuery();

    const tfButtons = timeframes.map((tf) =>
      Markup.button.callback(getTimeframeLabel(tf, lang), getTimeframeLabel(tf, lang))
    );
    const inlineTfButtons = chunkArray(tfButtons, 2);

    await ctx.editMessageText(t(ctx, 'chooseTimeframe'), Markup.inlineKeyboard(inlineTfButtons));
    return;
  }

  // Проверяем, выбран ли таймфрейм
  const tf = timeframes.find((tf) => getTimeframeLabel(tf, lang) === data);
  if (tf) {
    ctx.session.timeframe = tf;

    if (!ctx.session.pair) {
      await ctx.answerCbQuery(t(ctx, 'choosePair'));
      return;
    }

    await ctx.answerCbQuery();

    const pairName = getDisplayName(ctx.session.pair, lang);
    const tfLabel = getTimeframeLabel(tf, lang);
    await ctx.editMessageText(t(ctx, 'analyzing', pairName, tfLabel));

    const key = `${ctx.session.pair}_${tf.value}`;
    const now = Date.now();
    const klines = generateFakeOHLCFromTime(now - tf.minutes * 60 * 1000 * 100, 100, tf.minutes, ctx.session.pair);
    historyData[key] = klines;

    const closes = klines.map((k) => k.close);
    const sma5 = calculateSMA(closes, 5);
    const sma15 = calculateSMA(closes, 15);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const stochastic = calculateStochastic(klines);
    const { supports, resistances } = findSupportResistance(klines);

    try {
      const imageBuffer = await generateChartImage(
        klines,
        sma5,
        sma15,
        supports,
        resistances,
        ctx.session.pair,
        tfLabel
      );
      await ctx.replyWithPhoto({ source: imageBuffer });
    } catch (e) {
      console.error('Ошибка генерации графика:', e);
      await ctx.reply(t(ctx, 'errorChart'));
    }

    const analysisText = analyzeIndicators(
      klines,
      sma5,
      sma15,
      rsi,
      macd,
      stochastic,
      supports,
      resistances,
      lang
    );
    await ctx.reply(analysisText);

    ctx.session.pair = null;
    ctx.session.timeframe = null;
    return;
  }

  await ctx.answerCbQuery(t(ctx, 'unknownCommand'));
});

// --- Запуск бота ---
bot.launch();
console.log('Бот запущен и готов к работе');
