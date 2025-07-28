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
const RAPIDAPI_KEY = 'ВАШ_RAPIDAPI_KEY'; // <-- Вставьте сюда ваш RapidAPI ключ
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// Инициализация chartJSNodeCanvas
const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  // chartCallback не нужен, т.к. регистрация уже сделана выше
});

// --- Данные и функции ---
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

function chunkArray(arr, size) {
  const result = [];
  for(let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// --- Функция для получения исторических данных с Yahoo Finance через RapidAPI ---
async function fetchOHLC(pair, timeframeMinutes, count) {
  // Yahoo Finance API через RapidAPI требует символы в формате: "EURUSD=X"
  // Для форекс пар добавляем "=X" в конец
  const symbol = pair + '=X';

  // Определяем интервал для Yahoo Finance API
  // Поддерживаемые интервалы: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
  // Мы будем маппить наши таймфреймы к поддерживаемым:
  let interval = '1d';
  if (timeframeMinutes === 1) interval = '1m';
  else if (timeframeMinutes === 5) interval = '5m';
  else if (timeframeMinutes === 15) interval = '15m';
  else if (timeframeMinutes === 60) interval = '60m';
  else if (timeframeMinutes === 240) interval = '1h'; // 4 часа - нет прямого, берем 1h (60m)
  else if (timeframeMinutes === 1440) interval = '1d';

  // Параметр range - сколько данных брать
  // Для минутных интервалов можно брать '1d', '5d', '1mo' и т.п.
  // Для дневных - '1mo', '3mo', '6mo' и т.п.
  // Для упрощения возьмем range исходя из count и timeframe:
  let range = '1mo'; // по умолчанию месяц
  if (timeframeMinutes <= 15) range = '5d';
  else if (timeframeMinutes === 60) range = '1mo';
  else if (timeframeMinutes === 1440) range = '3mo';

  const url = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/get-chart?region=US&lang=en&symbol=${symbol}&interval=${interval}&range=${range}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'apidojo-yahoo-finance-v1.p.rapidapi.com',
      },
    });
    if (!res.ok) {
      console.error(`Yahoo Finance API error: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
      console.error('Yahoo Finance API returned no data');
      return null;
    }
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const indicators = result.indicators?.quote?.[0];
    if (!timestamps || !indicators) return null;

    // Формируем массив OHLC объектов
    const klines = [];
    for (let i = 0; i < timestamps.length && klines.length < count; i++) {
      const o = indicators.open[i];
      const h = indicators.high[i];
      const l = indicators.low[i];
      const c = indicators.close[i];
      const v = indicators.volume[i];
      if ([o, h, l, c].some(x => x === undefined || x === null)) continue; // пропускаем неполные данные
      klines.push({
        time: timestamps[i] * 1000, // в мс
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v,
      });
    }
    return klines;
  } catch (e) {
    console.error('Ошибка запроса Yahoo Finance:', e);
    return null;
  }
}

// --- Индикаторы ---

function calculateSMA(closes, period) {
  const sma = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      sma.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += closes[j];
    }
    sma.push(sum / period);
  }
  return sma;
}

function calculateRSI(closes, period) {
  const rsi = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    let gain = diff > 0 ? diff : 0;
    let loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period -1) + gain) / period;
    avgLoss = (avgLoss * (period -1) + loss) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }

  // Заполняем null для первых period элементов
  for (let i = 0; i < period; i++) {
    if (rsi[i] === undefined) rsi[i] = null;
  }
  return rsi;
}

function calculateMACD(closes) {
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    const emaArr = [];
    emaArr[0] = data[0];
    for (let i = 1; i < data.length; i++) {
      emaArr[i] = data[i] * k + emaArr[i - 1] * (1 - k);
    }
    return emaArr;
  };
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine.filter(v => v !== undefined && v !== null), 9);
  // Подгоняем длины signalLine к macdLine (signalLine короче на 8)
  const fullSignalLine = Array(macdLine.length - signalLine.length).fill(null).concat(signalLine);
  const histogram = macdLine.map((v, i) => {
    if (v === null || fullSignalLine[i] === null) return null;
    return v - fullSignalLine[i];
  });
  return { macdLine, signalLine: fullSignalLine, histogram };
}

function calculateStochastic(klines, kPeriod = 14, dPeriod = 3) {
  const kValues = [];
  const dValues = [];
  for (let i = 0; i < klines.length; i++) {
    if (i < kPeriod - 1) {
      kValues.push(null);
      continue;
    }
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (klines[j].high > highestHigh) highestHigh = klines[j].high;
      if (klines[j].low < lowestLow) lowestLow = klines[j].low;
    }
    const close = klines[i].close;
    const k = ((close - lowestLow) / (highestHigh - lowestLow)) * 100;
    kValues.push(k);
  }
  for (let i =
