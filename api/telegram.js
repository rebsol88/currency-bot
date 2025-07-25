import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';
import axios from 'axios';

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
});

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
    pairsOTC: [
      'OTC_EURAUD', 'OTC_EURCAD', 'OTC_EURCHF', 'OTC_EURJPY',
      'OTC_EURNZD', 'OTC_EURUSD', 'OTC_GBPCHF', 'OTC_GBPJPY',
      'OTC_GBPNZD', 'OTC_GBPUSD', 'OTC_USDCAD', 'OTC_USDCHF',
      'OTC_USDJPY', 'OTC_USDNZD', 'OTC_AUDCAD', 'OTC_AUDCHF',
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

// --- Получение реальных данных через Binance API (или другого провайдера) ---
async function fetchRealOHLC(pair, timeframe, limit = 100) {
  try {
    const symbol = pair.replace('/', ''); // Например, EURUSD -> EURUSD (нужно адаптировать под API)
    const interval = timeframe.value;
    const response = await axios.get(`https://api.binance.com/api/v3/klines`, {
      params: {
        symbol: 'BTCUSDT', // Замените на реальную пару, если есть доступ к форекс API
        interval: interval,
        limit: limit,
      },
    });

    return response.data.map(candle => ({
      openTime: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      closeTime: candle[6],
    }));
  } catch (error) {
    console.error('Ошибка при получении данных:', error);
    return null;
  }
}

// --- Генерация данных для OTC (Pocket Option стиль) ---
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

  const volatility = pair.startsWith('OTC_') ? 0.005 : 0.0018;
  const data = [];
  let time = startTimeMs;

  for (let i = 0; i < count; i++) {
    const trend = Math.sin(i / 10) * volatility * 0.5;
    const randChange = (Math.random() - 0.5) * volatility * 1.5;
    const open = price;
    price = Math.max(0.01, price + trend + randChange);
    const close = price;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;

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

function detectCandlePattern(candle, lang) {
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
    return lang === 'ru' ? 'Молот (bullish reversal)' : 'Hammer (bullish reversal)';
  }

  if (
    body <= candleRange * 0.3 &&
    lowerShadow >= body * 2 &&
    upperShadow <= body * 0.5 &&
    close < open
  ) {
    return lang === 'ru' ? 'Повешенный (bearish reversal)' : 'Hanging Man (bearish reversal)';
  }

  return null;
}

function detectRSIDivergence(prevPrice, prevRSI, currPrice, currRSI, lang) {
  if (prevPrice == null || prevRSI == null) return null;

  if (currPrice < prevPrice && currRSI > prevRSI) {
    return lang === 'ru'
      ? 'Бычья дивергенция RSI (возможен разворот вверх)'
      : 'Bullish RSI divergence (possible upward reversal)';
  }
  if (currPrice > prevPrice && currRSI < prevRSI) {
    return lang === 'ru'
      ? 'Медвежья дивергенция RSI (возможен разворот вниз)'
      : 'Bearish RSI divergence (possible downward reversal)';
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

function generateDetailedRecommendation(price, sma5, rsiVal, candlePattern, lang) {
  const priceAboveSMA = sma5 !== null && price > sma5;
  const rsiOverbought = rsiVal !== null && rsiVal > 70;
  const rsiOversold = rsiVal !== null && rsiVal < 30;

  const texts = languages[lang].texts;

  let emoji = '❓';
  let recommendation = '';

  if (priceAboveSMA && !rsiOverbought && candlePattern && candlePattern.includes('Молот')) {
    emoji = '📈🛠️';
    recommendation =
      (lang === 'ru'
        ? `Цена торгуется выше 50-периодной скользящей средней (${sma5.toFixed(5)}), что подтверждает восходящий тренд. RSI (${rsiVal.toFixed(1)}) находится в комфортной зоне без признаков перекупленности.\nОбнаружен свечной паттерн "Молот" — сильный сигнал бычьего разворота.\n\nРекомендуется рассматривать покупки с целью продолжения роста цены. Целями могут стать ближайшие уровни сопротивления. Следует контролировать объём и динамику RSI для своевременного управления рисками.`
        : `Price trades above the 50-period moving average (${sma5.toFixed(5)}), confirming an uptrend. RSI (${rsiVal.toFixed(1)}) is in a comfortable zone without signs of overbought.\nHammer candle pattern detected — a strong bullish reversal signal.\n\nConsider buying to continue the price rise. Targets may be the nearest resistance levels. Monitor volume and RSI dynamics for timely risk management.`)
  } else if (!priceAboveSMA && rsiOverbought && candlePattern && candlePattern.includes('Повешенный')) {
    emoji = '📉⚠️';
    recommendation =
      (lang === 'ru'
        ? `Цена находится ниже 50-периодной скользящей средней (${sma5?.toFixed(5) || 'N/A'}), что указывает на нисходящий тренд. RSI (${rsiVal.toFixed(1)}) показывает перекупленность рынка.\nСвечной паттерн "Повешенный" сигнализирует о возможном развороте вниз.\n\nРекомендуется рассматривать продажи с целью снижения цены к ближайшим уровням поддержки. Важно следить за подтверждающими сигналами и объёмом для подтверждения силы движения.`
        : `Price is below the 50-period moving average (${sma5?.toFixed(5) || 'N/A'}), indicating a downtrend. RSI (${rsiVal.toFixed(1)}) shows an overbought market.\nHanging Man candle pattern signals a possible reversal down.\n\nConsider selling to lower price to nearest support levels. Important to watch confirming signals and volume to confirm strength of movement.`)
  } else if (priceAboveSMA && rsiOversold) {
    emoji = '🔄📊';
    recommendation =
      (lang === 'ru'
        ? `Цена выше скользящей средней (${sma5.toFixed(5)}), но RSI (${rsiVal.toFixed(1)}) указывает на перепроданность.\nЭто часто предвещает продолжение восходящего тренда после краткосрочной коррекции.\n\nРекомендуется искать точки входа в покупки с целью возврата к тренду. Следует контролировать формирование свечных паттернов и объём для подтверждения разворота.`
        : `Price is above the moving average (${sma5.toFixed(5)}), but RSI (${rsiVal.toFixed(1)}) indicates oversold.\nThis often predicts continuation of uptrend after a short correction.\n\nLook for buying entry points aiming to return to the trend. Monitor candle patterns and volume to confirm reversal.`)
  } else if (!priceAboveSMA && rsiOverbought) {
    emoji = '⚠️📉';
    recommendation =
      (lang === 'ru'
        ? `Цена торгуется ниже скользящей средней (${sma5?.toFixed(5) || 'N/A'}), а RSI (${rsiVal.toFixed(1)}) сигнализирует о перекупленности.\nЭто может означать скорую коррекцию или разворот вниз.\n\nРекомендуется рассматривать продажи с целью снижения цены к уровням поддержки, но важно контролировать сигналы объёма и свечных паттернов для подтверждения.`
        : `Price trades below the moving average (${sma5?.toFixed(5) || 'N/A'}), and RSI (${rsiVal.toFixed(1)}) signals overbought.\nThis may mean an imminent correction or reversal down.\n\nConsider selling aiming price down to support levels, but carefully control volume signals and candle patterns for confirmation.`)
  } else if (priceAboveSMA && !rsiOverbought && !rsiOversold) {
    emoji = '📈🔍';
    recommendation =
      (lang === 'ru'
        ? `Цена выше скользящей средней (${sma5.toFixed(5)}), что указывает на восходящий тренд.\nRSI (${rsiVal.toFixed(1)}) находится в нейтральной зоне, подтверждая баланс спроса и предложения.\n\nОжидается дальнейшее движение вверх с возможными краткосрочными коррекциями. Рекомендуется искать точки для входа в покупки на откатах, учитывая уровни поддержки.`
        : `Price is above the moving average (${sma5.toFixed(5)}), indicating an uptrend.\nRSI (${rsiVal.toFixed(1)}) is in a neutral zone, confirming balance of supply and demand.\n\nFurther upward movement is expected with possible short corrections. Look for buying entries on pullbacks, considering support levels.`)
  } else if (!priceAboveSMA && !rsiOverbought && !rsiOversold) {
    emoji = '📉🔍';
    recommendation =
      (lang === 'ru'
        ? `Цена ниже скользящей средней (${sma5?.toFixed(5) || 'N/A'}), что указывает на нисходящий тренд.\nRSI (${rsiVal.toFixed(1)}) нейтрален, что говорит о равновесии между покупателями и продавцами.\n\nОжидается продолжение снижения с возможными откатами. Рекомендуется рассматривать продажи на откатах с контролем уровней сопротивления.`
        : `Price is below the moving average (${sma5?.toFixed(5) || 'N/A'}), indicating a downtrend.\nRSI (${rsiVal.toFixed(1)}) is neutral, indicating balance between buyers and sellers.\n\nFurther decline expected with possible pullbacks. Consider selling on pullbacks with resistance level control.`)
  } else if (candlePattern) {
    emoji = '🕯️';
    recommendation =
      (lang === 'ru'
        ? `Обнаружен свечной паттерн "${candlePattern}", который может указывать на разворот или продолжение тренда.\n\nРекомендуется учитывать этот сигнал в сочетании с текущим трендом и индикаторами для принятия решения.`
        : `Candle pattern "${candlePattern}" detected, which may indicate trend reversal or continuation.\n\nConsider this signal in combination with current trend and indicators for decision making.`)
  } else {
    if (priceAboveSMA) {
      emoji = '📈➡️';
      recommendation =
        (lang === 'ru'
          ? `Цена находится выше скользящей средней (${sma5.toFixed(5)}), что говорит о восходящем тренде.\nRSI (${rsiVal !== null ? rsiVal.toFixed(1) : 'N/A'}) не показывает экстремальных значений.\n\nРекомендуется рассматривать покупки с целями на ближайших уровнях сопротивления и контролем рисков.`
          : `Price is above the moving average (${sma5.toFixed(5)}), indicating an uptrend.\nRSI (${rsiVal !== null ? rsiVal.toFixed(1) : 'N/A'}) shows no extreme values.\n\nConsider buying with targets at nearest resistance levels and risk management.`)
    } else {
      emoji = '📉➡️';
      recommendation =
        (lang === 'ru'
          ? `Цена находится ниже скользящей средней (${sma5 !== null ? sma5.toFixed(5) : 'N/A'}), что говорит о нисходящем тренде.\nRSI (${rsiVal !== null ? rsiVal.toFixed(1) : 'N/A'}) не показывает экстремальных значений.\n\nРекомендуется рассматривать продажи с целями на ближайших уровнях поддержки и контролем рисков.`
          : `Price is below the moving average (${sma5 !== null ? sma5.toFixed(5) : 'N/A'}), indicating a downtrend.\nRSI (${rsiVal !== null ? rsiVal.toFixed(1) : 'N/A'}) shows no extreme values.\n\nConsider selling with targets at nearest support levels and risk management.`)
    }
  }

  return `${emoji} ${texts.recommendationPrefix}:\n${recommendation}\n\n⚠️ ${
    lang === 'ru'
      ? 'Важно помнить, что эти индикаторы не являются гарантией будущих движений цены, и всегда следует проводить дополнительный анализ, прежде чем принимать торговые решения.'
      : 'Remember, these indicators are not guarantees of future price movements, and additional analysis should always be performed before making trading decisions.'
  }`;
}

function analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, lang) {
  const texts = languages[lang].texts;
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
      text += `📈 ${texts.trendUp}: SMA(5) (${sma5[last].toFixed(5)}) > SMA(15) (${sma15[last].toFixed(5)}).\n`;
    } else if (sma5[last] < sma15[last]) {
      text += `📉 ${texts.trendDown}: SMA(5) (${sma5[last].toFixed(5)}) < SMA(15) (${sma15[last].toFixed(5)}).\n`;
    } else {
      text += `➖ ${texts.trendNone}: SMA(5) и SMA(15) близки.\n`;
    }
  } else {
    text += `⚠️ ${lang === 'ru' ? 'Недостаточно данных для оценки тренда по SMA.' : 'Not enough data to evaluate SMA trend.'}\n`;
  }

  // RSI
  if (rsi[last] !== null) {
    const rsiVal = rsi[last];
    if (rsiVal > 70) {
      text += `🚦 RSI высокий (${rsiVal.toFixed(1)}), ${lang === 'ru' ? 'рынок перекуплен, возможен откат вниз.' : 'market is overbought, possible pullback down.'}\n`;
    } else if (rsiVal < 30) {
      text += `🚦 RSI низкий (${rsiVal.toFixed(1)}), ${lang === 'ru' ? 'рынок перепродан, возможен отскок вверх.' : 'market is oversold, possible bounce up.'}\n`;
    } else {
      text += `⚪ RSI в нейтральной зоне (${rsiVal.toFixed(1)}).\n`;
    }
  } else {
    text += `⚠️ ${lang === 'ru' ? 'Недостаточно данных для анализа RSI.' : 'Not enough data to analyze RSI.'}\n`;
  }

  // MACD
  if (macd.macdLine[last] !== null && macd.signalLine[last] !== null) {
    if (macd.macdLine[last] > macd.signalLine[last]) {
      text += `🐂 MACD ${lang === 'ru' ? 'показывает бычий сигнал' : 'shows bullish signal'}.\n`;
    } else if (macd.macdLine[last] < macd.signalLine[last]) {
      text += `🐻 MACD ${lang === 'ru' ? 'показывает медвежий сигнал' : 'shows bearish signal'}.\n`;
    } else {
      text += `⚪ MACD ${lang === 'ru' ? 'не даёт явных сигналов' : 'gives no clear signals'}.\n`;
    }
  } else {
    text += `⚠️ ${lang === 'ru' ? 'Недостаточно данных для анализа MACD.' : 'Not enough data to analyze MACD.'}\n`;
  }

  // Стохастик
  if (stochastic.kValues[last] !== null && stochastic.dValues[last] !== null) {
    const k = stochastic.kValues[last];
    const d = stochastic.dValues[last];
    const kPrev = stochastic.kValues[last - 1];
    const dPrev = stochastic.dValues[last - 1];

    if (k < 20) {
      if (kPrev !== null && dPrev !== null && k > d && kPrev <= dPrev) {
        text += `🔄 Стохастик ${lang === 'ru' ? 'в зоне перепроданности с пересечением %K снизу вверх — сигнал на покупку.' : 'in oversold zone with %K crossing up — buy signal.'}\n`;
      } else {
        text += `⚠️ Стохастик ${lang === 'ru' ? 'в зоне перепроданности.' : 'in oversold zone.'}\n`;
      }
    } else if (k > 80) {
      if (kPrev !== null && dPrev !== null && k < d && kPrev >= dPrev) {
        text += `🔄 Стохастик ${lang === 'ru' ? 'в зоне перекупленности с пересечением %K сверху вниз — сигнал на продажу.' : 'in overbought zone with %K crossing down — sell signal.'}\n`;
      } else {
        text += `⚠️ Стохастик ${lang === 'ru' ? 'в зоне перекупленности.' : 'in overbought zone.'}\n`;
      }
    } else {
      text += `⚪ Стохастик в нейтральной зоне (K: ${k.toFixed(1)}, D: ${d.toFixed(1)}).\n`;
    }
  } else {
    text += `⚠️ ${lang === 'ru' ? 'Недостаточно данных для анализа стохастика.' : 'Not enough data to analyze Stochastic.'}\n`;
  }

  // Объём
  if (isVolumeDecreasing(volume, prevVolume)) {
    text += `📉 ${texts.volumeDecreasing}\n`;
  } else {
    text += `📊 ${texts.volumeIncreasing}\n`;
  }

  // Свечные паттерны
  const candlePattern = detectCandlePattern(candle, lang);
  if (candlePattern) {
    text += `🕯️ ${texts.candlePatternDetected}: ${candlePattern}.\n`;
  }

  // Дивергенция RSI
  const divergence = detectRSIDivergence(prevPrice, prevRSI, price, rsi[last], lang);
  if (divergence) {
    text += `🔄 ${texts.divergenceDetected}: ${divergence}\n`;
  }

  // Уровни поддержки и сопротивления
  if (supports.length > 0) {
    const closestSupport = supports[supports.length - 1];
    if (price < closestSupport * 1.02) {
      text += `🟢 ${texts.closeToSupport} ${closestSupport.toFixed(5)}.\n`;
    }
  }
  if (resistances.length > 0) {
    const closestResistance = resistances[0];
    if (price > closestResistance * 0.98) {
      text += `🔴 ${texts.closeToResistance} ${closestResistance.toFixed(5)}.\n`;
    }
  }

  // Пробой с ретестом
  const last3Prices = klines.slice(-3).map(k => k.close);
  if (supports.length > 0) {
    const closestSupport = supports[supports.length - 1];
    if (checkBreakoutWithRetest(last3Prices, closestSupport, true)) {
      text += `📈 ${texts.breakoutSupport}\n`;
    }
  }
  if (resistances.length > 0) {
    const closestResistance = resistances[0];
    if (checkBreakoutWithRetest(last3Prices, closestResistance, false)) {
      text += `📉 ${texts.breakoutResistance}\n`;
    }
  }

  // Рекомендация
  text += `\n${generateDetailedRecommendation(price, sma5[last], rsi[last], candlePattern, lang)}`;

  return text;
}

// --- Генерация графика ---
async function generateChart(klines, sma5, sma15, supports, resistances, lang) {
  const labels = klines.map(k => new Date(k.openTime).toLocaleTimeString());
  const closePrices = klines.map(k => k.close);

  const configuration = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: languages[lang].texts.priceLabel,
          data: closePrices,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: false,
        },
        {
          label: 'SMA(5)',
          data: sma5,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: false,
        },
        {
          label: 'SMA(15)',
          data: sma15,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: false,
        },
      ],
    },
    options: {
      responsive: false,
      scales: {
        x: {
          title: { display: true, text: languages[lang].texts.timeLabel },
        },
        y: {
          title: { display: true, text: languages[lang].texts.priceLabel },
        },
      },
      plugins: {
        annotation: {
          annotations: [
            ...supports.map((s, i) => ({
              type: 'line',
              mode: 'horizontal',
              scaleID: 'y',
              value: s,
              borderColor: 'rgba(0, 255, 0, 0.5)',
              borderWidth: 2,
              label: { content: `${languages[lang].texts.supportLabel} ${i + 1}`, enabled: true, position: 'right' },
            })),
            ...resistances.map((r, i) => ({
              type: 'line',
              mode: 'horizontal',
              scaleID: 'y',
              value: r,
              borderColor: 'rgba(255, 0, 0, 0.5)',
              borderWidth: 2,
              label: { content: `${languages[lang].texts.resistanceLabel} ${i + 1}`, enabled: true, position: 'right' },
            })),
          ],
        },
      },
    },
  };

  try {
    const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    return buffer;
  } catch (error) {
    console.error('Ошибка генерации графика:', error);
    return null;
  }
}

// --- Логика бота ---
bot.start((ctx) => {
  ctx.session = ctx.session || {};
  ctx.reply(languages.en.texts.chooseLanguage, Markup.inlineKeyboard([
    Markup.button.callback('Русский', 'lang_ru'),
    Markup.button.callback('English', 'lang_en')
  ]));
});

// Обработка выбора языка
bot.action(/lang_(.+)/, (ctx) => {
  const lang = ctx.match[1];
  ctx.session.lang = lang;
  ctx.editMessageText(languages[lang].texts.choosePair, Markup.inlineKeyboard(
    languages[lang].pairsMain.map(pair => [
      Markup.button.callback(displayNames[pair][lang], `pair_${pair}`)
    ])
  ));
});

// Обработка выбора пары
bot.action(/pair_(.+)/, (ctx) => {
  const pair = ctx.match[1];
  ctx.session.pair = pair;
  const lang = ctx.session.lang || 'en';
  ctx.editMessageText(languages[lang].texts.chooseTimeframe, Markup.inlineKeyboard(
    languages[lang].timeframes.map(tf => [
      Markup.button.callback(tf.label, `tf_${tf.value}`)
    ])
  ));
});

// Обработка выбора таймфрейма и выполнение анализа
bot.action(/tf_(.+)/, async (ctx) => {
  const timeframeValue = ctx.match[1];
  const lang = ctx.session.lang || 'en';
  const pair = ctx.session.pair;
  if (!pair) {
    ctx.reply(languages[lang].texts.pleaseChoosePairFirst);
    return;
  }

  const timeframe = languages[lang].timeframes.find(tf => tf.value === timeframeValue);
  ctx.editMessageText(languages[lang].texts.analysisStarting(pair, timeframe.label));

  // Получение данных
  let klines;
  if (pair.startsWith('OTC_')) {
    const startTime = Date.now() - 100 * timeframe.minutes * 60 * 1000;
    klines = generateFakeOHLCFromTime(startTime, 100, timeframe.minutes, pair);
  } else {
    klines = await fetchRealOHLC(pair, timeframe);
    if (!klines) {
      klines = generateFakeOHLCFromTime(Date.now() - 100 * timeframe.minutes * 60 * 1000, 100, timeframe.minutes, pair);
    }
  }

  // Расчёт индикаторов
  const closePrices = klines.map(k => k.close);
  const sma5 = calculateSMA(closePrices, 5);
  const sma15 = calculateSMA(closePrices, 15);
  const rsi = calculateRSI(closePrices, 14);
  const macd = calculateMACD(closePrices);
  const stochastic = calculateStochastic(klines);
  const { supports, resistances } = findSupportResistance(klines);

  // Анализ
  const analysisText = analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, lang);

  // Генерация графика
  const chartBuffer = await generateChart(klines.slice(-20), sma5.slice(-20), sma15.slice(-20), supports, resistances, lang);
  if (chartBuffer) {
    await ctx.replyWithPhoto({ source: chartBuffer });
  } else {
    ctx.reply(languages[lang].texts.errorGeneratingChart);
  }

  // Отправка анализа
  ctx.reply(analysisText, Markup.inlineKeyboard([
    Markup.button.callback(languages[lang].texts.choosePair, 'back_to_pairs'),
    Markup.button.callback(languages[lang].texts.chooseTimeframe, 'back_to_timeframes')
  ]));
});

// Возврат к выбору пары
bot.action('back_to_pairs', (ctx) => {
  const lang = ctx.session.lang || 'en';
  ctx.editMessageText(languages[lang].texts.choosePair, Markup.inlineKeyboard(
    languages[lang].pairsMain.map(pair => [
      Markup.button.callback(displayNames[pair][lang], `pair_${pair}`)
    ])
  ));
});

// Возврат к выбору таймфрейма
bot.action('back_to_timeframes', (ctx) => {
  const lang = ctx.session.lang || 'en';
  ctx.editMessageText(languages[lang].texts.chooseTimeframe, Markup.inlineKeyboard(
    languages[lang].timeframes.map(tf => [
      Markup.button.callback(tf.label, `tf_${tf.value}`)
    ])
  ));
});

// Обработка неизвестных команд
bot.on('text', (ctx) => {
  const lang = ctx.session?.lang || 'en';
  ctx.reply(languages[lang].texts.unknownCmd);
});

// Запуск бота
bot.launch().then(() => {
  console.log('Bot started');
}).catch(err => {
  console.error('Failed to start bot:', err);
});
