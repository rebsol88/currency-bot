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
  // ... другие тексты, если нужно
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

// --- Здесь идут все ваши функции генерации данных, индикаторов, анализа и генерации графика без изменений ---
// Для краткости не повторяю их полностью, вставьте сюда ваши функции из исходного кода,
// например: getBasePrice, generateFakeOHLCFromTime, calculateSMA, calculateRSI, calculateEMA, calculateMACD,
// calculateStochastic, findSupportResistance, isVolumeDecreasing, detectCandlePattern, detectRSIDivergence,
// checkBreakoutWithRetest, generateDetailedRecommendation, analyzeIndicators, generateChartImage

// Ниже — полный код с добавлением поддержки языков и переключением текста:

// --- Telegram Bot ---

const historyData = {}; // { 'EURUSD_1m': [klines...] }

// Функция для группировки массива по n элементов
function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

bot.start(async (ctx) => {
  ctx.session = {};
  // Предложить выбор языка
  await ctx.reply(
    texts.start.ru + '\n' + texts.start.en,
    Markup.inlineKeyboard([
      [Markup.button.callback('🇷🇺 Русский', 'lang_ru'), Markup.button.callback('🇬🇧 English', 'lang_en')],
    ])
  );
});

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;

  // Обработка выбора языка
  if (data === 'lang_ru' || data === 'lang_en') {
    const lang = data === 'lang_ru' ? 'ru' : 'en';
    ctx.session.language = lang;
    await ctx.answerCbQuery();

    // После выбора языка — показать пары
    const langPairsMain = pairsMain.map(p => getDisplayName(p, lang));
    const langPairsOTC = pairsOTC.map(p => getDisplayName(p, lang));

    const mainKeyboard = chunkArray(langPairsMain, 2);
    const otcKeyboard = chunkArray(langPairsOTC, 2);

    const maxRows = Math.max(mainKeyboard.length, otcKeyboard.length);
    const keyboardFinal = [];

    for (let i = 0; i < maxRows; i++) {
      const leftButtons = mainKeyboard[i] || [];
      const rightButtons = otcKeyboard[i] || [];

      while (leftButtons.length < 2) leftButtons.push(' ');
      while (rightButtons.length < 2) rightButtons.push(' ');

      keyboardFinal.push([leftButtons[0], rightButtons[0]]);
      keyboardFinal.push([leftButtons[1], rightButtons[1]]);
    }

    const inlineButtons = keyboardFinal.map(row =>
      row.map(text => Markup.button.callback(text.trim(), text.trim()))
    );

    await ctx.editMessageText(t(ctx, 'choosePair'), Markup.inlineKeyboard(inlineButtons));
    return;
  }

  // Проверим, является ли data валютной парой (на выбранном языке)
  const lang = ctx.session.language || 'ru';

  // Найдем пару по названию на выбранном языке
  const pairEntry = Object.entries(displayNames).find(
    ([key, names]) => names[lang] === data
  );
  if (pairEntry) {
    const pair = pairEntry[0];
    ctx.session.pair = pair;
    await ctx.answerCbQuery();

    // Показываем таймфреймы на выбранном языке
    const tfButtons = timeframes.map(tf =>
      Markup.button.callback(getTimeframeLabel(tf, lang), getTimeframeLabel(tf, lang))
    );
    const inlineTfButtons = chunkArray(tfButtons, 2);

    await ctx.editMessageText(t(ctx, 'chooseTimeframe'), Markup.inlineKeyboard(inlineTfButtons));
    return;
  }

  // Проверим таймфрейм (на выбранном языке)
  const tf = timeframes.find(tf => getTimeframeLabel(tf, lang) === data);
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

    const closes = klines.map(k => k.close);
    const sma5 = calculateSMA(closes, 5);
    const sma15 = calculateSMA(closes, 15);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const stochastic = calculateStochastic(klines);
    const { supports, resistances } = findSupportResistance(klines);

    // Генерируем график
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

    // Анализ и рекомендации
    // Для анализа и рекомендаций можно добавить локализацию текста внутри функций, если потребуется.
    // Пока анализ возвращает на русском, можно добавить перевод или оставить так.
    const analysisText = analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, lang);
    await ctx.reply(analysisText);

    // Сброс сессии, кроме языка
    ctx.session.pair = null;
    ctx.session.timeframe = null;
    return;
  }

  // Если не распознано
  await ctx.answerCbQuery(t(ctx, 'unknownCommand'));
});

// --- Ниже добавьте необходимые изменения в функции analyzeIndicators и generateDetailedRecommendation
// чтобы они учитывали lang и возвращали текст на нужном языке.
// Для примера, ниже показано, как можно передать lang и возвращать текст на русском или английском.

// Пример изменения analyzeIndicators с поддержкой языка:

function analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, lang = 'ru') {
  const last = klines.length - 1;
  const price = klines[last].close;
  const volume = klines[last].volume;
  const prevVolume = last > 0 ? klines[last - 1].volume : null;
  const prevPrice = last > 0 ? klines[last - 1].close : null;
  const prevRSI = last > 0 ? rsi[last - 1] : null;
  const candle = klines[last];

  // Перевод эмодзи и текста по языку
  const tTexts = {
    ru: {
      trendUp: `📈 Текущий тренд восходящий: SMA(5) (${sma5[last].toFixed(5)}) выше SMA(15) (${sma15[last].toFixed(5)}).\n`,
      trendDown: `📉 Текущий тренд нисходящий: SMA(5) (${sma5[last].toFixed(5)}) ниже SMA(15) (${sma15[last].toFixed(5)}).\n`,
      trendFlat: `➖ Тренд не выражен: SMA(5) и SMA(15) близки друг к другу.\n`,
      rsiHigh: `🚦 RSI высокий (${rsi[last].toFixed(1)}), рынок перекуплен, возможен откат вниз.\n`,
      rsiLow: `🚦 RSI низкий (${rsi[last].toFixed(1)}), рынок перепродан, возможен отскок вверх.\n`,
      rsiNeutral: `⚪ RSI в нейтральной зоне (${rsi[last].toFixed(1)}).\n`,
      macdBull: `🐂 MACD показывает бычий сигнал (линия MACD выше сигнальной).\n`,
      macdBear: `🐻 MACD показывает медвежий сигнал (линия MACD ниже сигнальной).\n`,
      macdNeutral: `⚪ MACD не даёт явных сигналов.\n`,
      stochasticBuy: `🔄 Стохастик в зоне перепроданности с пересечением %K снизу вверх — сигнал на покупку.\n`,
      stochasticSell: `🔄 Стохастик в зоне перекупленности с пересечением %K сверху вниз — сигнал на продажу.\n`,
      stochasticNeutral: `⚪ Стохастик не даёт явных сигналов.\n`,
      volumeDown: `📉 Объём снижается, что может указывать на слабость текущего движения.\n`,
      volumeUp: `📈 Объём стабильный или растущий, поддерживает текущий тренд.\n`,
      candlePattern: `🕯️ Обнаружен свечной паттерн: `,
      divergence: `📊 Обнаружена дивергенция RSI: `,
      supports: `🟩 Уровни поддержки: `,
      resistances: `🟥 Уровни сопротивления: `,
      closeSupport: `🔔 Цена близка к поддержке около `,
      closeResistance: `🔔 Цена близка к сопротивлению около `,
      breakoutSupport: `🚀 Пробой и ретест поддержки `,
      breakoutResistance: `⚠️ Пробой и ретест сопротивления `,
      strongBuy: ` с подтверждением — сильный сигнал к покупке.\n`,
      strongSell: ` с подтверждением — сильный сигнал к продаже.\n`,
    },
    en: {
      trendUp: `📈 Current trend is upward: SMA(5) (${sma5[last].toFixed(5)}) above SMA(15) (${sma15[last].toFixed(5)}).\n`,
      trendDown: `📉 Current trend is downward: SMA(5) (${sma5[last].toFixed(5)}) below SMA(15) (${sma15[last].toFixed(5)}).\n`,
      trendFlat: `➖ Trend is not clear: SMA(5) and SMA(15) are close.\n`,
      rsiHigh: `🚦 RSI is high (${rsi[last].toFixed(1)}), market is overbought, possible pullback down.\n`,
      rsiLow: `🚦 RSI is low (${rsi[last].toFixed(1)}), market is oversold, possible bounce up.\n`,
      rsiNeutral: `⚪ RSI is in neutral zone (${rsi[last].toFixed(1)}).\n`,
      macdBull: `🐂 MACD shows bullish signal (MACD line above signal line).\n`,
      macdBear: `🐻 MACD shows bearish signal (MACD line below signal line).\n`,
      macdNeutral: `⚪ MACD gives no clear signals.\n`,
      stochasticBuy: `🔄 Stochastic in oversold zone with %K crossing up — buy signal.\n`,
      stochasticSell: `🔄 Stochastic in overbought zone with %K crossing down — sell signal.\n`,
      stochasticNeutral: `⚪ Stochastic gives no clear signals.\n`,
      volumeDown: `📉 Volume is decreasing, which may indicate weakness of the current move.\n`,
      volumeUp: `📈 Volume is stable or increasing, supporting the current trend.\n`,
      candlePattern: `🕯️ Candle pattern detected: `,
      divergence: `📊 RSI divergence detected: `,
      supports: `🟩 Support levels: `,
      resistances: `🟥 Resistance levels: `,
      closeSupport: `🔔 Price is close to support around `,
      closeResistance: `🔔 Price is close to resistance around `,
      breakoutSupport: `🚀 Breakout and retest of support `,
      breakoutResistance: `⚠️ Breakout and retest of resistance `,
      strongBuy: ` confirmed — strong buy signal.\n`,
      strongSell: ` confirmed — strong sell signal.\n`,
    },
  };

  let text = '';

  // Тренд по SMA
  if (sma5[last] !== null && sma15[last] !== null) {
    if (sma5[last] > sma15[last]) {
      text += tTexts[lang].trendUp;
    } else if (sma5[last] < sma15[last]) {
      text += tTexts[lang].trendDown;
    } else {
      text += tTexts[lang].trendFlat;
    }
  } else {
    text += lang === 'ru' ? '⚠️ Недостаточно данных для оценки тренда по SMA.\n' : '⚠️ Not enough data to evaluate SMA trend.\n';
  }

  // RSI
  if (rsi[last] !== null) {
    const rsiVal = rsi[last];
    if (rsiVal > 70) {
      text += tTexts[lang].rsiHigh;
    } else if (rsiVal < 30) {
      text += tTexts[lang].rsiLow;
    } else {
      text += tTexts[lang].rsiNeutral;
    }
  } else {
    text += lang === 'ru' ? '⚠️ Недостаточно данных для анализа RSI.\n' : '⚠️ Not enough data to analyze RSI.\n';
  }

  // MACD
  if (macd.macdLine[last] !== null && macd.signalLine[last] !== null) {
    if (macd.macdLine[last] > macd.signalLine[last]) {
      text += tTexts[lang].macdBull;
    } else if (macd.macdLine[last] < macd.signalLine[last]) {
      text += tTexts[lang].macdBear;
    } else {
      text += tTexts[lang].macdNeutral;
    }
  } else {
    text += lang === 'ru' ? '⚠️ Недостаточно данных для анализа MACD.\n' : '⚠️ Not enough data to analyze MACD.\n';
  }

  // Стохастик
  if (stochastic.kValues[last] !== null && stochastic.dValues[last] !== null) {
    const k = stochastic.kValues[last];
    const d = stochastic.dValues[last];
    const kPrev = stochastic.kValues[last - 1];
    const dPrev = stochastic.dValues[last - 1];

    if (k < 20) {
      if (kPrev !== null && dPrev !== null && k > d && kPrev <= dPrev) {
        text += tTexts[lang].stochasticBuy;
      } else {
        text += lang === 'ru' ? '⚠️ Стохастик в зоне перепроданности.\n' : '⚠️ Stochastic in oversold zone.\n';
      }
    } else if (k > 80) {
      if (kPrev !== null && dPrev !== null && k < d && kPrev >= dPrev) {
        text += tTexts[lang].stochasticSell;
      } else {
        text += lang === 'ru' ? '⚠️ Стохастик в зоне перекупленности.\n' : '⚠️ Stochastic in overbought zone.\n';
      }
    } else {
      if (k > d) {
        text += lang === 'ru' ? '🐂 Стохастик даёт бычий сигнал.\n' : '🐂 Stochastic gives a bullish signal.\n';
      } else if (k < d) {
        text += lang === 'ru' ? '🐻 Стохастик даёт медвежий сигнал.\n' : '🐻 Stochastic gives a bearish signal.\n';
      } else {
        text += tTexts[lang].stochasticNeutral;
      }
    }
  } else {
    text += lang === 'ru' ? '⚠️ Недостаточно данных для анализа Стохастика.\n' : '⚠️ Not enough data to analyze Stochastic.\n';
  }

  // Объём
  if (isVolumeDecreasing(volume, prevVolume)) {
    text += tTexts[lang].volumeDown;
  } else {
    text += tTexts[lang].volumeUp;
  }

  // Свечной паттерн
  const candlePattern = detectCandlePattern(candle);
  if (candlePattern) {
    text += tTexts[lang].candlePattern + candlePattern + '.\n';
  }

  // Дивергенция RSI
  const divergence = detectRSIDivergence(prevPrice, prevRSI, price, rsi[last]);
  if (divergence) {
    text += tTexts[lang].divergence + divergence + '.\n';
  }

  // Уровни поддержки и сопротивления
  if (supports.length > 0) {
    text += tTexts[lang].supports + supports.map(p => p.toFixed(5)).join(', ') + '.\n';
  }
  if (resistances.length > 0) {
    text += tTexts[lang].resistances + resistances.map(p => p.toFixed(5)).join(', ') + '.\n';
  }

  const threshold = 0.0015;
  const closeSupports = supports.filter(s => Math.abs(price - s) / s < threshold);
  const closeResistances = resistances.filter(r => Math.abs(price - r) / r < threshold);

  if (closeSupports.length > 0) {
    text += tTexts[lang].closeSupport + closeSupports[0].toFixed(5) + (lang === 'ru' ? ', возможен отскок вверх.\n' : ', possible bounce up.\n');
  }
  if (closeResistances.length > 0) {
    text += tTexts[lang].closeResistance + closeResistances[0].toFixed(5) + (lang === 'ru' ? ', возможен откат вниз.\n' : ', possible pullback down.\n');
  }

  // Пробой и ретест
  const lastPrices = klines.slice(-3).map(c => c.close);
  if (supports.length > 0 && checkBreakoutWithRetest(lastPrices, supports[0], true)) {
    text += tTexts[lang].breakoutSupport + supports[0].toFixed(5) + tTexts[lang].strongBuy;
  }
  if (resistances.length > 0 && checkBreakoutWithRetest(lastPrices, resistances[0], false)) {
    text += tTexts[lang].breakoutResistance + resistances[0].toFixed(5) + tTexts[lang].strongSell;
  }

  // Итоговые выводы с подробной рекомендацией с обязательным направлением
  text += '\n' + generateDetailedRecommendationLang(price, sma5[last], rsi[last], candlePattern, lang);

  return text;
}

// Аналогично изменяем generateDetailedRecommendation, чтобы поддерживать язык

function generateDetailedRecommendationLang(price, sma5, rsiVal, candlePattern, lang = 'ru') {
  const priceAboveSMA = sma5 !== null && price > sma5;
  const rsiOverbought = rsiVal !== null && rsiVal > 70;
  const rsiOversold = rsiVal !== null && rsiVal < 30;

  let emoji = '❓';
  let recommendation = '';

  if (lang === 'ru') {
    if (priceAboveSMA && !rsiOverbought && candlePattern && candlePattern.includes('Молот')) {
      emoji = '📈🛠️';
      recommendation =
        `Цена торгуется выше 50-периодной скользящей средней (${sma5.toFixed(5)}), ` +
        `что подтверждает восходящий тренд. RSI (${rsiVal.toFixed(1)}) находится в комфортной зоне без признаков перекупленности.\n` +
        `Обнаружен свечной паттерн "Молот" — сильный сигнал бычьего разворота.\n\n` +
        `Рекомендуется рассматривать покупки с целью продолжения роста цены. Целями могут стать ближайшие уровни сопротивления. ` +
        `Следует контролировать объём и динамику RSI для своевременного управления рисками.`;
    } else if (!priceAboveSMA && rsiOverbought && candlePattern && candlePattern.includes('Повешенный')) {
      emoji = '📉⚠️';
      recommendation =
        `Цена находится ниже 50-периодной скользящей средней (${sma5?.toFixed(5) || 'N/A'}), ` +
        `что указывает на нисходящий тренд. RSI (${rsiVal.toFixed(1)}) показывает перекупленность рынка.\n` +
        `Свечной паттерн "Повешенный" сигнализирует о возможном развороте вниз.\n\n` +
        `Рекомендуется рассматривать продажи с целью снижения цены к ближайшим уровням поддержки. ` +
        `Важно следить за подтверждающими сигналами и объёмом для подтверждения силы движения.`;
    } else if (priceAboveSMA && rsiOversold) {
      emoji = '🔄📊';
      recommendation =
        `Цена выше скользящей средней (${sma5.toFixed(5)}), но RSI (${rsiVal.toFixed(1)}) указывает на перепроданность.\n` +
        `Это часто предвещает продолжение восходящего тренда после краткосрочной коррекции.\n\n` +
        `Рекомендуется искать точки входа в покупки с целью возврата к тренду. ` +
        `Следует контролировать формирование свечных паттернов и объём для подтверждения разворота.`;
    } else if (!priceAboveSMA && rsiOverbought) {
      emoji = '⚠️📉';
      recommendation =
        `Цена торгуется ниже скользящей средней (${sma5?.toFixed(5) || 'N/A'}), а RSI (${rsiVal.toFixed(1)}) сигнализирует о перекупленности.\n` +
        `Это может означать скорую коррекцию или разворот вниз.\n\n` +
        `Рекомендуется рассматривать продажи с целью снижения цены к уровням поддержки, ` +
        `но важно контролировать сигналы объёма и свечных паттернов для подтверждения.`;
    } else if (priceAboveSMA && !rsiOverbought && !rsiOversold) {
      emoji = '📈🔍';
      recommendation =
        `Цена выше скользящей средней (${sma5.toFixed(5)}), что указывает на восходящий тренд.\n` +
        `RSI (${rsiVal.toFixed(1)}) находится в нейтральной зоне, подтверждая баланс спроса и предложения.\n\n` +
        `Ожидается дальнейшее движение вверх с возможными краткосрочными коррекциями. ` +
        `Рекомендуется искать точки для входа в покупки на откатах, учитывая уровни поддержки.`;
    } else if (!priceAboveSMA && !rsiOverbought && !rsiOversold) {
      emoji = '📉🔍';
      recommendation =
        `Цена ниже скользящей средней (${sma5?.toFixed(5) || 'N/A'}), что указывает на нисходящий тренд.\n` +
        `RSI (${rsiVal.toFixed(1)}) нейтрален, что говорит о равновесии между покупателями и продавцами.\n\n` +
        `Ожидается продолжение снижения с возможными откатами. ` +
        `Рекомендуется рассматривать продажи на откатах с контролем уровней сопротивления.`;
    } else if (candlePattern) {
      emoji = '🕯️';
      recommendation =
        `Обнаружен свечной паттерн "${candlePattern}", который может указывать на разворот или продолжение тренда.\n\n` +
        `Рекомендуется учитывать этот сигнал в сочетании с текущим трендом и индикаторами для принятия решения.`;
    } else {
      if (priceAboveSMA) {
        emoji = '📈➡️';
        recommendation =
          `Цена находится выше скользящей средней (${sma5.toFixed(5)}), что говорит о восходящем тренде.\n` +
          `RSI (${rsiVal !== null ? rsiVal.toFixed(1) : 'N/A'}) не показывает экстремальных значений.\n\n` +
          `Рекомендуется рассматривать покупки с целями на ближайших уровнях сопротивления и контролем рисков.`;
      } else {
        emoji = '📉➡️';
        recommendation =
          `Цена находится ниже скользящей средней (${sma5 !== null ? sma5.toFixed(5) : 'N/A'}), что говорит о нисходящем тренде.\n` +
          `RSI (${rsiVal !== null ? rsiVal.toFixed(1) : 'N/A'}) не показывает экстремальных значений.\n\n` +
          `Рекомендуется рассматривать продажи с целями на ближайших уровнях поддержки и контролем рисков.`;
      }
    }
  } else {
    // English
    if (priceAboveSMA && !rsiOverbought && candlePattern && candlePattern.includes('Молот')) {
      emoji = '📈🛠️';
      recommendation =
        `Price is above the 50-period moving average (${sma5.toFixed(5)}), ` +
        `confirming an uptrend. RSI (${rsiVal.toFixed(1)}) is in a comfortable zone without signs of overbought.\n` +
        `Detected "Hammer" candle pattern — a strong bullish reversal signal.\n\n` +
        `Consider buying with the target of continuing price growth. Targets may be the nearest resistance levels. ` +
        `Monitor volume and RSI dynamics for timely risk management.`;
    } else if (!priceAboveSMA && rsiOverbought && candlePattern && candlePattern.includes('Повешенный')) {
      emoji = '📉⚠️';
      recommendation =
        `Price is below the 50-period moving average (${sma5?.toFixed(5) || 'N/A'}), ` +
        `indicating a downtrend. RSI (${rsiVal.toFixed(1)}) shows an overbought market.\n` +
        `The "Hanging Man" candle pattern signals a possible downward reversal.\n\n` +
        `Consider selling with the aim of lowering the price to the nearest support levels. ` +
        `It is important to watch for confirming signals and volume to confirm the strength of the move.`;
    } else if (priceAboveSMA && rsiOversold) {
      emoji = '🔄📊';
      recommendation =
        `Price is above the moving average (${sma5.toFixed(5)}), but RSI (${rsiVal.toFixed(1)}) indicates oversold.\n` +
        `This often foretells continuation of the uptrend after a short-term correction.\n\n` +
        `Look for entry points to buy aiming to return to the trend. ` +
        `Control candle pattern formation and volume for reversal confirmation.`;
    } else if (!priceAboveSMA && rsiOverbought) {
      emoji = '⚠️📉';
      recommendation =
        `Price is below the moving average (${sma5?.toFixed(5) || 'N/A'}), and RSI (${rsiVal.toFixed(1)}) signals overbought.\n` +
        `This may mean an imminent correction or downward reversal.\n\n` +
        `Consider selling aiming to lower the price to support levels, ` +
        `but monitor volume and candle pattern signals for confirmation.`;
    } else if (priceAboveSMA && !rsiOverbought && !rsiOversold) {
      emoji = '📈🔍';
      recommendation =
        `Price is above the moving average (${sma5.toFixed(5)}), indicating an uptrend.\n` +
        `RSI (${rsiVal.toFixed(1)}) is in a neutral zone, confirming the balance of supply and demand.\n\n` +
        `Further upward movement is expected with possible short-term corrections. ` +
        `Look for entry points on pullbacks considering support levels.`;
    } else if (!priceAboveSMA && !rsiOverbought && !rsiOversold) {
      emoji = '📉🔍';
      recommendation =
        `Price is below the moving average (${sma5?.toFixed(5) || 'N/A'}), indicating a downtrend.\n` +
        `RSI (${rsiVal.toFixed(1)}) is neutral, indicating equilibrium between buyers and sellers.\n\n` +
        `Further decline is expected with possible pullbacks. ` +
        `Consider selling on pullbacks controlling resistance levels.`;
    } else if (candlePattern) {
      emoji = '🕯️';
      recommendation =
        `Detected candle pattern "${candlePattern}" which may indicate reversal or trend continuation.\n\n` +
        `Consider this signal in conjunction with current trend and indicators for decision making.`;
    } else {
      if (priceAboveSMA) {
        emoji = '📈➡️';
        recommendation =
          `Price is above the moving average (${sma5.toFixed(5)}), indicating an uptrend.\n` +
          `RSI (${rsiVal !== null ? rsiVal.toFixed(1) : 'N/A'}) shows no extreme values.\n\n` +
          `Consider buying targeting the nearest resistance levels and risk control.`;
      } else {
        emoji = '📉➡️';
        recommendation =
          `Price is below the moving average (${sma5 !== null ? sma5.toFixed(5) : 'N/A'}), indicating a downtrend.\n` +
          `RSI (${rsiVal !== null ? rsiVal.toFixed(1) : 'N/A'}) shows no extreme values.\n\n` +
          `Consider selling targeting the nearest support levels and risk control.`;
      }
    }
  }

  return `${emoji} Recommendation:\n${recommendation}\n\n⚠️ Remember, these indicators do not guarantee future price movements, ` +
    `and additional analysis should always be conducted before making trading decisions.`;
}

// --- Запуск бота ---
bot.launch();
console.log('Бот запущен и готов к работе');
