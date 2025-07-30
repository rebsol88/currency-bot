import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import fetch from 'node-fetch';

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const API_KEY = '63b63ce5be0d7734bb6b995fdab8ae3b'; // Ваш API ключ finnhub.io
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

// --- Функция загрузки котировок с API ---

function mapPairToApiSymbol(pair) {
  return pair;
}

function mapTimeframeToApiInterval(tfValue) {
  switch (tfValue) {
    case '1m': return '1';
    case '5m': return '5';
    case '15m': return '15';
    case '1h': return '60';
    case '4h': return '240';
    case '1d': return 'D';
    default: return '1';
  }
}

async function fetchCandles(pair, timeframe, count = 100) {
  const symbol = mapPairToApiSymbol(pair);
  const interval = mapTimeframeToApiInterval(timeframe);

  const nowSec = Math.floor(Date.now() / 1000);
  let secondsPerCandle;
  switch (interval) {
    case '1': secondsPerCandle = 60; break;
    case '5': secondsPerCandle = 5 * 60; break;
    case '15': secondsPerCandle = 15 * 60; break;
    case '60': secondsPerCandle = 60 * 60; break;
    case '240': secondsPerCandle = 240 * 60; break;
    case 'D': secondsPerCandle = 24 * 60 * 60; break;
    default: secondsPerCandle = 60;
  }
  const from = nowSec - secondsPerCandle * count;
  const to = nowSec;

  const url = `https://finnhub.io/api/v1/forex/candle?symbol=OANDA:${symbol}&resolution=${interval}&from=${from}&to=${to}&token=${API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    if (data.s !== 'ok') {
      throw new Error(`API error: ${data.s}`);
    }

    const klines = data.t.map((timestamp, i) => ({
      openTime: timestamp * 1000,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      closeTime: (i + 1 < data.t.length ? data.t[i + 1] * 1000 - 1 : (timestamp + secondsPerCandle) * 1000 - 1),
      volume: data.v ? data.v[i] : 0,
    }));

    return klines;
  } catch (e) {
    console.error('Error fetching candles:', e);
    return null;
  }
}

// --- Индикаторы и анализ ---

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

function calculateEMA(data, period) {
  const ema = [];
  const k = 2 / (period + 1);
  let prevEma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(null);
      continue;
    }
    if (i === period - 1) {
      ema.push(prevEma);
      continue;
    }
    const currentEma = data[i] * k + prevEma * (1 - k);
    ema.push(currentEma);
    prevEma = currentEma;
  }
  return ema;
}

function calculateRSI(data, period = 14) {
  const rsi = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    let gain = 0;
    let loss = 0;
    if (change >= 0) gain = change;
    else loss = -change;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  for (let i = 0; i < period; i++) rsi[i] = null;

  return rsi;
}

function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const emaFast = calculateEMA(data, fastPeriod);
  const emaSlow = calculateEMA(data, slowPeriod);
  const macdLine = emaFast.map((v, i) => (v !== null && emaSlow[i] !== null) ? v - emaSlow[i] : null);
  const signalLine = calculateEMA(macdLine.filter(v => v !== null), signalPeriod);
  const fullSignalLine = [];
  let signalIndex = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] === null) {
      fullSignalLine.push(null);
    } else {
      fullSignalLine.push(signalLine[signalIndex] !== undefined ? signalLine[signalIndex] : null);
      signalIndex++;
    }
  }
  const histogram = macdLine.map((v, i) => (v !== null && fullSignalLine[i] !== null) ? v - fullSignalLine[i] : null);
  return { macdLine, signalLine: fullSignalLine, histogram };
}

function calculateStochastic(klines, kPeriod = 14, dPeriod = 3) {
  const highs = klines.map(k => k.high);
  const lows = klines.map(k => k.low);
  const closes = klines.map(k => k.close);

  const kValues = [];

  for (let i = 0; i < klines.length; i++) {
    if (i < kPeriod - 1) {
      kValues.push(null);
      continue;
    }
    const highMax = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
    const lowMin = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
    const k = ((closes[i] - lowMin) / (highMax - lowMin)) * 100;
    kValues.push(k);
  }

  const dValues = calculateSMA(kValues.filter(v => v !== null), dPeriod);

  const fullDValues = [];
  let dIndex = 0;
  for (let i = 0; i < kValues.length; i++) {
    if (kValues[i] === null) fullDValues.push(null);
    else fullDValues.push(dValues[dIndex] !== undefined ? dValues[dIndex] : null), dIndex++;
  }

  return { kValues, dValues: fullDValues };
}

function findSupportResistance(klines) {
  const closes = klines.map(k => k.close);
  const supports = [];
  const resistances = [];

  for (let i = 2; i < closes.length - 2; i++) {
    if (closes[i] < closes[i - 1] && closes[i] < closes[i + 1] &&
        closes[i - 1] < closes[i - 2] && closes[i + 1] < closes[i + 2]) {
      supports.push(closes[i]);
    }
    if (closes[i] > closes[i - 1] && closes[i] > closes[i + 1] &&
        closes[i - 1] > closes[i - 2] && closes[i + 1] > closes[i + 2]) {
      resistances.push(closes[i]);
    }
  }

  // Уникальные и отсортированные
  return {
    supports: [...new Set(supports)].sort((a, b) => a - b).slice(-3),
    resistances: [...new Set(resistances)].sort((a, b) => b - a).slice(-3),
  };
}

function isVolumeDecreasing(klines) {
  if (klines.length < 3) return false;
  return klines[klines.length - 1].volume < klines[klines.length - 2].volume &&
         klines[klines.length - 2].volume < klines[klines.length - 3].volume;
}

function detectCandlePattern(klines) {
  if (klines.length < 2) return null;
  const last = klines[klines.length - 1];
  const prev = klines[klines.length - 2];

  // Пример: простой паттерн "бычье поглощение"
  if (last.open < last.close && prev.open > prev.close &&
      last.open < prev.close && last.close > prev.open) {
    return 'Bullish Engulfing';
  }
  // Добавьте другие паттерны по необходимости
  return null;
}

function detectRSIDivergence(rsi, closes) {
  if (rsi.length < 3) return false;
  const lastRsi = rsi[rsi.length - 1];
  const prevRsi = rsi[rsi.length - 3];
  const lastClose = closes[closes.length - 1];
  const prevClose = closes[closes.length - 3];
  if (lastRsi > prevRsi && lastClose < prevClose) return true; // бычья дивергенция
  if (lastRsi < prevRsi && lastClose > prevClose) return true; // медвежья дивергенция
  return false;
}

function checkBreakoutWithRetest(klines, supports, resistances) {
  if (klines.length < 3) return null;
  const lastClose = klines[klines.length - 1].close;
  const prevClose = klines[klines.length - 2].close;

  for (const support of supports) {
    if (prevClose < support && lastClose > support) {
      // Пробой поддержки снизу вверх
      return { type: 'breakoutSupport', level: support };
    }
  }
  for (const resistance of resistances) {
    if (prevClose > resistance && lastClose < resistance) {
      // Пробой сопротивления сверху вниз
      return { type: 'breakoutResistance', level: resistance };
    }
  }
  return null;
}

function generateDetailedRecommendation(
  klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, lang
) {
  const texts = languages[lang].texts;
  const closes = klines.map(k => k.close);
  const lastIndex = closes.length - 1;

  let rec = '';

  // Тренд по SMA
  if (sma5[lastIndex] !== null && sma15[lastIndex] !== null) {
    if (sma5[lastIndex] > sma15[lastIndex]) rec += `${texts.trendUp}. `;
    else if (sma5[lastIndex] < sma15[lastIndex]) rec += `${texts.trendDown}. `;
    else rec += `${texts.trendNone}. `;
  }

  // Объём
  if (isVolumeDecreasing(klines)) rec += `${texts.volumeDecreasing} `;
  else rec += `${texts.volumeIncreasing} `;

  // Свечные паттерны
  const candlePattern = detectCandlePattern(klines);
  if (candlePattern) rec += `${texts.candlePatternDetected}: ${candlePattern}. `;

  // RSI дивергенция
  if (detectRSIDivergence(rsi, closes)) rec += `${texts.divergenceDetected}. `;

  // Близость к уровням
  const lastClose = closes[lastIndex];
  for (const s of supports) {
    if (Math.abs(lastClose - s) / s < 0.005) rec += `${texts.closeToSupport} ${s.toFixed(5)}. `;
  }
  for (const r of resistances) {
    if (Math.abs(lastClose - r) / r < 0.005) rec += `${texts.closeToResistance} ${r.toFixed(5)}. `;
  }

  // Пробой с ретестом
  const breakout = checkBreakoutWithRetest(klines, supports, resistances);
  if (breakout) {
    if (breakout.type === 'breakoutSupport') rec += `${texts.breakoutSupport} `;
    if (breakout.type === 'breakoutResistance') rec += `${texts.breakoutResistance} `;
  }

  // MACD и Stochastic (примитивный анализ)
  const macdLast = macd.macdLine[lastIndex];
  const macdSignalLast = macd.signalLine[lastIndex];
  if (macdLast !== null && macdSignalLast !== null) {
    if (macdLast > macdSignalLast) rec += `${texts.buySignal}. `;
    else rec += `${texts.sellSignal}. `;
  }

  const stochK = stochastic.kValues[lastIndex];
  const stochD = stochastic.dValues[lastIndex];
  if (stochK !== null && stochD !== null) {
    if (stochK > stochD && stochK < 20) rec += `${texts.buySignal}. `;
    else if (stochK < stochD && stochK > 80) rec += `${texts.sellSignal}. `;
  }

  if (rec === '') rec = texts.recommendationPrefix + ' ' + (lang === 'ru' ? 'нет явных сигналов' : 'no clear signals');

  return rec.trim();
}

function analyzeIndicators(
  klines,
  sma5,
  sma15,
  rsi,
  macd,
  stochastic,
  supports,
  resistances,
  lang
) {
  return generateDetailedRecommendation(
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
}

// --- Функция генерации графика ---
async function generateChartImage(klines, sma5, sma15, supports, resistances, pair, timeframeLabel, lang) {
  const labels = klines.map(k => new Date(k.openTime).toISOString().substr(11, 5)); // HH:MM
  const closePrices = klines.map(k => k.close);

  const texts = languages[lang].texts;

  const supportAnnotations = supports.map((s, i) => ({
    type: 'line',
    yMin: s,
    yMax: s,
    borderColor: 'green',
    borderWidth: 2,
    borderDash: [6, 6],
    label: {
      content: `${texts.supportLabel} ${i + 1} (${s.toFixed(5)})`,
      enabled: true,
      position: 'start',
      backgroundColor: 'green',
      color: 'white',
      font: { size: 12 },
    },
  }));

  const resistanceAnnotations = resistances.map((r, i) => ({
    type: 'line',
    yMin: r,
    yMax: r,
    borderColor: 'red',
    borderWidth: 2,
    borderDash: [6, 6],
    label: {
      content: `${texts.resistanceLabel} ${i + 1} (${r.toFixed(5)})`,
      enabled: true,
      position: 'start',
      backgroundColor: 'red',
      color: 'white',
      font: { size: 12 },
    },
  }));

  const configuration = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: lang === 'ru' ? 'Цена Close' : 'Close Price',
          data: closePrices,
          borderColor: 'black',
          backgroundColor: 'rgba(0,0,0,0.1)',
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 1.5,
        },
        {
          label: 'SMA 5',
          data: sma5,
          borderColor: 'limegreen',
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 1.5,
        },
        {
          label: 'SMA 15',
          data: sma15,
          borderColor: 'red',
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 1.5,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: `${lang === 'ru' ? 'Аналитика по паре' : 'Analysis for pair'} ${displayNames[pair][lang]} — ${lang === 'ru' ? 'Таймфрейм' : 'Timeframe'}: ${timeframeLabel}`,
          font: { size: 18, weight: 'bold' },
        },
        legend: {
          position: 'top',
          labels: { font: { size: 14 } },
        },
        annotation: {
          annotations: [...supportAnnotations, ...resistanceAnnotations],
        },
      },
      scales: {
        y: {
          title: { display: true, text: texts.priceLabel },
          beginAtZero: false,
        },
        x: {
          title: { display: true, text: texts.timeLabel },
          ticks: {
            maxTicksLimit: 15,
          },
        },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
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
  const mainKeyboard = chunkArray(mainButtons, 2);
  await ctx.editMessageText(langData.texts.choosePair, Markup.inlineKeyboard(mainKeyboard));
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

    const klines = await fetchCandles(ctx.session.pair, tf.value, 100);

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

    try {
      const chartBuffer = await generateChartImage(
        klines,
        sma5,
        sma15,
        supports,
        resistances,
        ctx.session.pair,
        tf.label,
        lang
      );

      await ctx.replyWithPhoto({ source: chartBuffer }, { caption: analysisText });

      const nextBtn = Markup.inlineKeyboard([
        Markup.button.callback(langData.texts.nextAnalysis, 'next_analysis'),
      ]);
      await ctx.reply(langData.texts.nextAnalysis, nextBtn);
    } catch (e) {
      console.error(e);
      await ctx.reply(langData.texts.errorGeneratingChart);
    }

    return;
  }

  await ctx.answerCbQuery(langData.texts.unknownCmd);
});

bot.launch();
console.log('Bot started');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
