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
  { label: '1 минута', value: '1m', minutes: 1 },
  { label: '5 минут', value: '5m', minutes: 5 },
  { label: '15 минут', value: '15m', minutes: 15 },
  { label: '1 час', value: '1h', minutes: 60 },
  { label: '4 часа', value: '4h', minutes: 240 },
  { label: '1 день', value: '1d', minutes: 1440 },
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

const displayNames = {
  EURUSD: 'EUR/USD', USDJPY: 'USD/JPY', GBPUSD: 'GBP/USD', USDCHF: 'USD/CHF',
  AUDUSD: 'AUD/USD', USDCAD: 'USD/CAD', NZDUSD: 'NZD/USD', EURGBP: 'EUR/GBP',
  EURJPY: 'EUR/JPY', GBPJPY: 'GBP/JPY', CHFJPY: 'CHF/JPY', AUDJPY: 'AUD/JPY',
  EURCHF: 'EUR/CHF', EURCAD: 'EUR/CAD', AUDCAD: 'AUD/CAD', NZDJPY: 'NZD/JPY',
  OTC_EURAUD: 'OTC EUR/AUD', OTC_EURCAD: 'OTC EUR/CAD', OTC_EURCHF: 'OTC EUR/CHF', OTC_EURJPY: 'OTC EUR/JPY',
  OTC_EURNZD: 'OTC EUR/NZD', OTC_EURUSD: 'OTC EUR/USD', OTC_GBPCHF: 'OTC GBP/CHF', OTC_GBPJPY: 'OTC GBP/JPY',
  OTC_GBPNZD: 'OTC GBP/NZD', OTC_GBPUSD: 'OTC GBP/USD', OTC_USDCAD: 'OTC USD/CAD', OTC_USDCHF: 'OTC USD/CHF',
  OTC_USDJPY: 'OTC USD/JPY', OTC_USDNZD: 'OTC USD/NZD', OTC_AUDCAD: 'OTC AUD/CAD', OTC_AUDCHF: 'OTC AUD/CHF',
};

// --- Генерация OHLC ---
function getBasePrice(pair) {
  if (pair.startsWith('OTC_')) {
    return 1.2 + (Math.random() - 0.5) * 0.3;
  } else {
    return 1 + (Math.random() - 0.5) * 0.5;
  }
}

function generateFakeOHLCFromTime(startTimeMs, count, intervalMinutes, pair) {
  const basePrice = getBasePrice(pair);
  let price = basePrice;

  const volatility = pair.startsWith('OTC_') ? 0.003 : 0.0018;
  const data = [];
  let time = startTimeMs;

  for (let i = 0; i < count; i++) {
    const trend = Math.sin(i / 10) * volatility * 0.5;
    const randChange = (Math.random() - 0.5) * volatility;
    const open = price;
    price = Math.max(0.01, price + trend + randChange);
    const close = price;
    const high = Math.max(open, close) + Math.random() * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * 0.3;

    // Генерируем объём для каждой свечи
    const volume = Math.floor(100 + Math.random() * 1000);

    data.push({
      openTime: time,
      open,
      high,
      low,
      close,
      closeTime: time + intervalMinutes * 60 * 1000 - 1,
      volume,
    });
    time += intervalMinutes * 60 * 1000;
  }
  return data;
}

// --- Индикаторы ---
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

function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  const ema = [];
  ema[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const emaFast = calculateEMA(data, fastPeriod);
  const emaSlow = calculateEMA(data, slowPeriod);
  const macdLine = emaFast.map((val, idx) => {
    if (val == null || emaSlow[idx] == null) return null;
    return val - emaSlow[idx];
  });

  const macdLineForSignal = macdLine.slice(slowPeriod - 1).filter(v => v !== null);
  const signalLinePart = calculateEMA(macdLineForSignal, signalPeriod);
  const signalLine = Array(slowPeriod - 1 + signalPeriod - 1).fill(null).concat(signalLinePart);

  const histogram = macdLine.map((val, idx) => {
    if (val === null || signalLine[idx] === null) return null;
    return val - signalLine[idx];
  });

  return { macdLine, signalLine, histogram };
}

function calculateStochastic(klines, kPeriod = 14, dPeriod = 3) {
  const kValues = [];
  const dValues = [];

  for (let i = 0; i < klines.length; i++) {
    if (i < kPeriod - 1) {
      kValues.push(null);
      continue;
    }
    const slice = klines.slice(i - kPeriod + 1, i + 1);
    const lowMin = Math.min(...slice.map(c => c.low));
    const highMax = Math.max(...slice.map(c => c.high));
    const close = klines[i].close;
    const k = (highMax - lowMin) === 0 ? 0 : ((close - lowMin) / (highMax - lowMin)) * 100;
    kValues.push(k);
  }

  for (let i = 0; i < kValues.length; i++) {
    if (i < kPeriod - 1 + dPeriod - 1) {
      dValues.push(null);
      continue;
    }
    const slice = kValues.slice(i - dPeriod + 1, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    dValues.push(sum / dPeriod);
  }

  return { kValues, dValues };
}

function findSupportResistance(klines) {
  const supports = [];
  const resistances = [];
  const len = klines.length;
  for (let i = 2; i < len - 2; i++) {
    const lows = klines.slice(i - 2, i + 3).map(k => k.low);
    const highs = klines.slice(i - 2, i + 3).map(k => k.high);
    if (klines[i].low === Math.min(...lows)) supports.push(klines[i].low);
    if (klines[i].high === Math.max(...highs)) resistances.push(klines[i].high);
  }
  const uniqSupports = [...new Set(supports)].sort((a, b) => a - b).slice(0, 3);
  const uniqResistances = [...new Set(resistances)].sort((a, b) => b - a).slice(0, 3);
  return { supports: uniqSupports, resistances: uniqResistances };
}

// --- Дополнительные функции для анализа ---

function isVolumeDecreasing(currentVolume, prevVolume) {
  if (prevVolume == null) return false;
  return currentVolume < prevVolume * 0.8;
}

function detectCandlePattern(candle) {
  const { open, close, high, low } = candle;
  const body = Math.abs(close - open);
  const candleRange = high - low;
  if (candleRange === 0) return null;
  const upperShadow = high - Math.max(open, close);
  const lowerShadow = Math.min(open, close) - low;

  if (
    body <= candleRange * 0.3 &&
    lowerShadow >= body * 2 &&
    upperShadow <= body * 0.5 &&
    close > open
  ) {
    return 'Молот (bullish reversal)';
  }

  if (
    body <= candleRange * 0.3 &&
    lowerShadow >= body * 2 &&
    upperShadow <= body * 0.5 &&
    close < open
  ) {
    return 'Повешенный (bearish reversal)';
  }

  return null;
}

function detectRSIDivergence(prevPrice, prevRSI, currPrice, currRSI) {
  if (prevPrice == null || prevRSI == null) return null;

  if (currPrice < prevPrice && currRSI > prevRSI) {
    return 'Бычья дивергенция RSI (возможен разворот вверх)';
  }
  if (currPrice > prevPrice && currRSI < prevRSI) {
    return 'Медвежья дивергенция RSI (возможен разворот вниз)';
  }
  return null;
}

function checkBreakoutWithRetest(prices, level, isSupport) {
  if (prices.length < 3) return false;
  const [curr, prev, prev2] = prices;

  if (isSupport) {
    return prev2 > level && prev < level && curr > level;
  } else {
    return prev2 < level && prev > level && curr < level;
  }
}

// Новая функция для формирования подробной рекомендации
function generateDetailedRecommendation(price, sma5, rsiVal, candlePattern) {
  const priceAboveSMA = sma5 !== null && price > sma5;
  const rsiOverbought = rsiVal !== null && rsiVal > 70;
  const rsiOversold = rsiVal !== null && rsiVal < 30;

  let recommendation = '';

  if (priceAboveSMA && !rsiOverbought && candlePattern && candlePattern.includes('Молот')) {
    recommendation =
      'Если цена находится выше скользящей средней, RSI показывает, что рынок не перекуплен, а на графике виден "бычий" свечной паттерн, это может указывать на то, что цена, скорее всего, пойдет вверх.';
  } else if (!priceAboveSMA && rsiOverbought && candlePattern && candlePattern.includes('Повешенный')) {
    recommendation =
      'Если цена находится ниже скользящей средней, RSI показывает перекупленность, и виден "медвежий" паттерн, это может указывать на то, что цена, скорее всего, пойдет вниз.';
  } else if (priceAboveSMA && rsiOversold) {
    recommendation =
      'Цена выше скользящей средней, но RSI показывает перепроданность, возможен разворот вверх.';
  } else if (!priceAboveSMA && rsiOverbought) {
    recommendation =
      'Цена ниже скользящей средней, RSI показывает перекупленность, возможен разворот вниз.';
  } else {
    recommendation =
      'Ситуация неоднозначна, рекомендуется дождаться подтверждающих сигналов перед принятием решения.';
  }

  return recommendation;
}

function analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances) {
  const last = klines.length - 1;
  const price = klines[last].close;
  const volume = klines[last].volume;
  const prevVolume = last > 0 ? klines[last - 1].volume : null;
  const prevPrice = last > 0 ? klines[last - 1].close : null;
  const prevRSI = last > 0 ? rsi[last - 1] : null;
  const candle = klines[last];

  let text = '';

  // Тренд по SMA
  if (sma5[last] !== null && sma15[last] !== null) {
    if (sma5[last] > sma15[last]) {
      text += `📈 Текущий тренд восходящий: SMA(5) (${sma5[last].toFixed(5)}) выше SMA(15) (${sma15[last].toFixed(5)}).\n`;
    } else if (sma5[last] < sma15[last]) {
      text += `📉 Текущий тренд нисходящий: SMA(5) (${sma5[last].toFixed(5)}) ниже SMA(15) (${sma15[last].toFixed(5)}).\n`;
    } else {
      text += `➖ Тренд не выражен: SMA(5) и SMA(15) близки друг к другу.\n`;
    }
  } else {
    text += `⚠️ Недостаточно данных для оценки тренда по SMA.\n`;
  }

  // RSI
  if (rsi[last] !== null) {
    const rsiVal = rsi[last];
    if (rsiVal > 70) {
      text += `🚦 RSI высокий (${rsiVal.toFixed(1)}), рынок перекуплен, возможен откат вниз.\n`;
    } else if (rsiVal < 30) {
      text += `🚦 RSI низкий (${rsiVal.toFixed(1)}), рынок перепродан, возможен отскок вверх.\n`;
    } else {
      text += `⚪ RSI в нейтральной зоне (${rsiVal.toFixed(1)}), явных сигналов нет.\n`;
    }
  } else {
    text += `⚠️ Недостаточно данных для анализа RSI.\n`;
  }

  // MACD
  if (macd.macdLine[last] !== null && macd.signalLine[last] !== null) {
    if (macd.macdLine[last] > macd.signalLine[last]) {
      text += `🐂 MACD показывает бычий сигнал (линия MACD выше сигнальной).\n`;
    } else if (macd.macdLine[last] < macd.signalLine[last]) {
      text += `🐻 MACD показывает медвежий сигнал (линия MACD ниже сигнальной).\n`;
    } else {
      text += `⚪ MACD не даёт явных сигналов.\n`;
    }
  } else {
    text += `⚠️ Недостаточно данных для анализа MACD.\n`;
  }

  // Стохастик
  if (stochastic.kValues[last] !== null && stochastic.dValues[last] !== null) {
    const k = stochastic.kValues[last];
    const d = stochastic.dValues[last];
    const kPrev = stochastic.kValues[last - 1];
    const dPrev = stochastic.dValues[last - 1];

    if (k < 20) {
      if (kPrev !== null && dPrev !== null && k > d && kPrev <= dPrev) {
        text += `🔄 Стохастик в зоне перепроданности с пересечением %K снизу вверх — сигнал на покупку.\n`;
      } else {
        text += `⚠️ Стохастик в зоне перепроданности — возможен разворот вверх.\n`;
      }
    } else if (k > 80) {
      if (kPrev !== null && dPrev !== null && k < d && kPrev >= dPrev) {
        text += `🔄 Стохастик в зоне перекупленности с пересечением %K сверху вниз — сигнал на продажу.\n`;
      } else {
        text += `⚠️ Стохастик в зоне перекупленности — возможен разворот вниз.\n`;
      }
    } else {
      if (k > d) {
        text += `🐂 Стохастик даёт бычий сигнал.\n`;
      } else if (k < d) {
        text += `🐻 Стохастик даёт медвежий сигнал.\n`;
      } else {
        text += `⚪ Стохастик не даёт явных сигналов.\n`;
      }
    }
  } else {
    text += `⚠️ Недостаточно данных для анализа Стохастика.\n`;
  }

  // Объём
  if (isVolumeDecreasing(volume, prevVolume)) {
    text += `📉 Объём снижается, что может указывать на слабость текущего движения.\n`;
  } else {
    text += `📈 Объём стабильный или растущий, поддерживает текущий тренд.\n`;
  }

  // Свечной паттерн
  const candlePattern = detectCandlePattern(candle);
  if (candlePattern) {
    text += `🕯️ Обнаружен свечной паттерн: ${candlePattern}.\n`;
  }

  // Дивергенция RSI
  const divergence = detectRSIDivergence(prevPrice, prevRSI, price, rsi[last]);
  if (divergence) {
    text += `📊 Обнаружена дивергенция RSI: ${divergence}.\n`;
  }

  // Уровни поддержки и сопротивления
  if (supports.length > 0) {
    text += `🟩 Уровни поддержки: ${supports.map(p => p.toFixed(5)).join(', ')}.\n`;
  }
  if (resistances.length > 0) {
    text += `🟥 Уровни сопротивления: ${resistances.map(p => p.toFixed(5)).join(', ')}.\n`;
  }

  const threshold = 0.0015;
  const closeSupports = supports.filter(s => Math.abs(price - s) / s < threshold);
  const closeResistances = resistances.filter(r => Math.abs(price - r) / r < threshold);

  if (closeSupports.length > 0) {
    text += `🔔 Цена близка к поддержке около ${closeSupports[0].toFixed(5)}, возможен отскок вверх.\n`;
  }
  if (closeResistances.length > 0) {
    text += `🔔 Цена близка к сопротивлению около ${closeResistances[0].toFixed(5)}, возможен откат вниз.\n`;
  }

  // Пробой и ретест
  const lastPrices = klines.slice(-3).map(c => c.close);
  if (supports.length > 0 && checkBreakoutWithRetest(lastPrices, supports[0], true)) {
    text += `🚀 Пробой и ретест поддержки ${supports[0].toFixed(5)} с подтверждением — сильный сигнал к покупке.\n`;
  }
  if (resistances.length > 0 && checkBreakoutWithRetest(lastPrices, resistances[0], false)) {
    text += `⚠️ Пробой и ретест сопротивления ${resistances[0].toFixed(5)} с подтверждением — сильный сигнал к продаже.\n`;
  }

  // Итоговые выводы (обновлённые)
  text += '\n📌 Рекомендация:\n';
  text += generateDetailedRecommendation(price, sma5[last], rsi[last], candlePattern);

  return text;
}

// --- Функция генерации графика ---
async function generateChartImage(klines, sma5, sma15, supports, resistances, pair, timeframeLabel) {
  const labels = klines.map(k => new Date(k.openTime).toISOString().substr(11, 5)); // HH:MM
  const closePrices = klines.map(k => k.close);

  const supportAnnotations = supports.map((s, i) => ({
    type: 'line',
    yMin: s,
    yMax: s,
    borderColor: 'green',
    borderWidth: 2,
    borderDash: [6, 6],
    label: {
      content: `Поддержка ${i + 1} (${s.toFixed(5)})`,
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
      content: `Сопротивление ${i + 1} (${r.toFixed(5)})`,
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
          label: 'Цена Close',
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
          text: `Аналитика по паре ${displayNames[pair]} — Таймфрейм: ${timeframeLabel}`,
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
          title: { display: true, text: 'Цена' },
          beginAtZero: false,
        },
        x: {
          title: { display: true, text: 'Время (UTC)' },
          ticks: {
            maxTicksLimit: 15,
          }
        },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

// --- Telegram Bot ---

const historyData = {}; // { 'EURUSD_1m': [klines...] }

bot.start((ctx) => {
  ctx.session = {};

  // Функция для группировки массива по n элементов
  function chunkArray(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }

  const mainButtons = pairsMain.map(p => displayNames[p]);
  const otcButtons = pairsOTC.map(p => displayNames[p]);

  // Разбиваем на строки по 2 кнопки
  const mainKeyboard = chunkArray(mainButtons, 2);
  const otcKeyboard = chunkArray(otcButtons, 2);

  // Объединяем main и otc по строкам, чтобы получить 2 колонки:
  const maxRows = Math.max(mainKeyboard.length, otcKeyboard.length);
  const keyboardFinal = [];

  for (let i = 0; i < maxRows; i++) {
    const leftButtons = mainKeyboard[i] || [];
    const rightButtons = otcKeyboard[i] || [];

    // Добавим пустые элементы, если меньше 2 кнопок, для выравнивания
    while (leftButtons.length < 2) leftButtons.push(' ');
    while (rightButtons.length < 2) rightButtons.push(' ');

    // Добавляем 2 строки на каждый i (по 2 кнопки main и 2 кнопки otc)
    keyboardFinal.push([leftButtons[0], rightButtons[0]]);
    keyboardFinal.push([leftButtons[1], rightButtons[1]]);
  }

  // Создаём inline клавиатуру из keyboardFinal
  const inlineButtons = keyboardFinal.map(row =>
    row.map(text => Markup.button.callback(text.trim(), text.trim()))
  );

  ctx.reply(
    'Привет! Выберите валютную пару:',
    Markup.inlineKeyboard(inlineButtons)
  );
});

// Обработка нажатий inline кнопок с валютными парами
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;

  // Проверим, является ли data валютной парой или таймфреймом
  // Сначала проверим валютную пару
  const pair = Object.entries(displayNames).find(([, name]) => name === data)?.[0];
  if (pair) {
    ctx.session.pair = pair;
    await ctx.answerCbQuery();
    // Теперь показываем inline-клавиатуру с таймфреймами
    const tfButtons = timeframes.map(tf => Markup.button.callback(tf.label, tf.label));
    // Разобьём по 2 в ряд
    function chunkArray(arr, size) {
      const result = [];
      for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
      }
      return result;
    }
    const inlineTfButtons = chunkArray(tfButtons, 2);
    await ctx.editMessageText('Выберите таймфрейм:', Markup.inlineKeyboard(inlineTfButtons));
    return;
  }

  // Если это не пара, проверим таймфрейм
  const tf = timeframes.find(t => t.label === data);
  if (tf) {
    ctx.session.timeframe = tf;

    if (!ctx.session.pair) {
      await ctx.answerCbQuery('Пожалуйста, сначала выберите валютную пару.');
      return;
    }

    await ctx.answerCbQuery();

    await ctx.editMessageText(`Начинаю анализ ${displayNames[ctx.session.pair]} на таймфрейме ${tf.label}...`);

    const key = `${ctx.session.pair}_${tf.value}`;
    const now = Date.now();
    const klines = generateFakeOHLCFromTime(now - tf.minutes * 60 * 1000 * 100, 100, tf.minutes, ctx.session.pair);
    historyData[key] = klines;

    const closes = klines.map(k => k.close);
    const sma5 = calculateSMA(closes, 5);
    const sma15 = calculateSMA(closes, 15);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const stochastic = calculateStochastic(klines);
    const { supports, resistances } = findSupportResistance(klines);

    // Генерируем график
    try {
      const imageBuffer = await generateChartImage(klines, sma5, sma15, supports, resistances, ctx.session.pair, tf.label);
      await ctx.replyWithPhoto({ source: imageBuffer });
    } catch (e) {
      console.error('Ошибка генерации графика:', e);
      await ctx.reply('Ошибка при генерации графика.');
    }

    // Анализ и рекомендации
    const analysisText = analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances);
    await ctx.reply(analysisText);

    // Сброс сессии для новой пары
    ctx.session = {};
    return;
  }

  // Если не распознано
  await ctx.answerCbQuery('Неизвестная команда');
});

bot.launch();
console.log('Бот запущен и готов к работе');
