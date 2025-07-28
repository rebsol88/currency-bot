import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import fetch from 'node-fetch'; // если в среде Node.js v18+ - можно использовать глобальный fetch

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
    // Убираем OTC пары
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

// --- Получение реальных котировок с Dukascopy ---
// API Dukascopy для свечей (пример):  
// https://www.dukascopy.com/datafeed/EURUSD/2023/04/27/01h_ticks.bi5  
// Но удобнее использовать сервис https://www.dukascopy.com/datafeed/ с историей.
// Для простоты возьмём публичный API с https://www.dukascopy.com/datafeed/ (формат OHLC в JSON нет, но можно получить свечи в CSV или bi5)

// Для демонстрации — используем сторонний API для получения OHLC с Dukascopy через https://api-fxtrade.oanda.com/v3/instruments/{instrument}/candles (требуется ключ) — но у нас нет ключа.

// Поэтому сделаем запрос к Dukascopy с помощью их датафида для 1-мин свечей (нужно распарсить bi5 файлы) — сложновато.

// Для упрощения — воспользуемся бесплатным API https://fcsapi.com/api-v3/forex/candles (требует ключ, но есть бесплатный)

// Но чтобы сразу вставить в бота, сделаем fetch к публичному API с Yahoo Finance (пример) или exchangerate.host для курсов,
// но там нет OHLC.

// В итоге для демонстрации возьмём public API https://api.binance.com/api/v3/klines?symbol=EURUSDT&interval=1m&limit=100

// Преобразуем пары в формат Binance (например, EURUSD → EURUSDT), но Binance не торгует USD, а USDT.

// Чтобы получить котировки с Dukascopy, проще использовать сторонний сервис, например https://www.dukascopy.com/swiss/english/marketwatch/historical/ с парсингом или кешированием.

// В итоге, ниже функция получения OHLC с Dukascopy через https://www.dukascopy.com/datafeed/ с кешированием и парсингом CSV (упрощённо).

// Для примера реализуем функцию fetchDukascopyOHLC с кешем, которая загружает 100 последних 1-мин свечей.

// Пары Dukascopy пишутся с заглавными буквами и слешем, например EUR/USD → EURUSD

// URL для 1-мин свечей: https://www.dukascopy.com/datafeed/EURUSD/2023/04/27/01h_ticks.bi5 — сложный формат.

// Поэтому возьмём альтернативу — https://www.dukascopy.com/datafeed/EURUSD/2023/04/27/01h_ticks.bi5 — бинарный формат bi5, требует распаковки.

// Для упрощения — воспользуемся https://www.dukascopy.com/datafeed/EURUSD/2023/06/01/1min_ticks.bi5 — но парсинг bi5 вне рамок.

// В итоге заменим generateFakeOHLCFromTime на функцию с запросом к https://api.exchangerate.host/timeseries с курсами.

// --- Получение OHLC по API exchangerate.host (работает без ключа) ---

async function fetchOHLC(pair, timeframe, count) {
  // pair: EURUSD → EUR/USD
  const from = pair.slice(0, 3);
  const to = pair.slice(3, 6);
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - count * timeframe * 60 * 1000);

  // exchangerate.host не предоставляет OHLC, только курсы по дням, поэтому сделаем запрос по дням и сгенерируем OHLC из курсов
  // Для demo — запросим исторические курсы с daily resolution:
  // https://api.exchangerate.host/timeseries?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&base=FROM&symbols=TO

  // Но нет минутных данных, только дневные.

  // Поэтому для демонстрации будем использовать fake OHLC с реальными ценами close за дни.

  // Для более точных данных — нужен платный API.

  // Для демонстрации — сгенерируем OHLC на основе дневных курсов с exchangerate.host

  const startDateStr = startDate.toISOString().slice(0, 10);
  const endDateStr = endDate.toISOString().slice(0, 10);

  const url = `https://api.exchangerate.host/timeseries?start_date=${startDateStr}&end_date=${endDateStr}&base=${from}&symbols=${to}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Ошибка запроса курсов: ${res.status}`);

    const json = await res.json();
    if (!json.rates) throw new Error('Нет данных курсов');

    // Преобразуем в массив { date, rate }
    const ratesArr = Object.entries(json.rates)
      .map(([date, obj]) => ({ date, rate: obj[to] }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Сгенерируем OHLC из дневных курсов (close = rate, open = предыдущий close, high/low ± небольшой разброс)
    const ohlc = [];

    for (let i = 0; i < ratesArr.length; i++) {
      const open = i === 0 ? ratesArr[i].rate : ratesArr[i - 1].rate;
      const close = ratesArr[i].rate;
      const high = Math.max(open, close) * (1 + 0.002);
      const low = Math.min(open, close) * (1 - 0.002);
      const openTime = new Date(ratesArr[i].date).getTime();
      const closeTime = openTime + 24 * 60 * 60 * 1000 - 1;

      ohlc.push({
        openTime,
        open,
        high,
        low,
        close,
        closeTime,
        volume: 1000, // фиктивный объём
      });
    }

    return ohlc.slice(-count);
  } catch (e) {
    console.error('Ошибка получения OHLC:', e);
    return null;
  }
}

// --- Индикаторы и функции анализа оставляем без изменений ---
// (вставьте сюда все функции calculateSMA, calculateRSI, calculateMACD, calculateStochastic, findSupportResistance,
// isVolumeDecreasing, detectCandlePattern, detectRSIDivergence, checkBreakoutWithRetest, generateDetailedRecommendation,
// analyzeIndicators, generateChartImage — как в вашем исходном коде, без изменений)

// Для краткости здесь не повторяю - вставьте ваши функции из исходного кода.

// --- Функция генерации фейковых данных убирается ---

// --- Telegram Bot ---

const historyData = {}; // { 'EURUSD_1m': [klines...] }

// Вспомогательная функция для разбивки массива на чанки
function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// Функция для вывода выбора валютных пар (используется при старте и при "Следующий анализ")
async function sendPairSelection(ctx, lang) {
  const langData = languages[lang];
  const mainButtons = langData.pairsMain.map(p => Markup.button.callback(displayNames[p][lang], displayNames[p][lang]));

  const mainKeyboard = chunkArray(mainButtons, 2);

  // OTC убраны, не добавляем

  await ctx.editMessageText(langData.texts.choosePair, Markup.inlineKeyboard(mainKeyboard));
}

// /start — выбор языка
bot.start(async (ctx) => {
  ctx.session = {};
  const buttons = [
    Markup.button.callback(languages.ru.name, 'lang_ru'),
    Markup.button.callback(languages.en.name, 'lang_en'),
  ];
  await ctx.reply(languages.ru.texts.chooseLanguage, Markup.inlineKeyboard(buttons));
});

// Обработка выбора языка
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

// Обработка нажатий inline кнопок с валютными парами и таймфреймами
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const lang = ctx.session.lang || 'ru'; // По умолчанию русский
  const langData = languages[lang];

  if (data === 'noop') {
    await ctx.answerCbQuery();
    return;
  }

  // Обработка кнопки "Следующий анализ" — возвращаем к выбору валютных пар
  if (data === 'next_analysis') {
    await ctx.answerCbQuery();
    // Очистим выбор пары и таймфрейма, чтобы пользователь мог выбрать заново
    ctx.session.pair = null;
    ctx.session.timeframe = null;
    await sendPairSelection(ctx, lang);
    return;
  }

  // Проверим, является ли data валютной парой
  const pairEntry = Object.entries(displayNames).find(([, names]) => names[lang] === data);
  if (pairEntry) {
    const pair = pairEntry[0];
    ctx.session.pair = pair;
    await ctx.answerCbQuery();

    // Показываем таймфреймы на выбранном языке
    const tfButtons = langData.timeframes.map(tf => Markup.button.callback(tf.label, tf.label));
    const inlineTfButtons = chunkArray(tfButtons, 2);

    await ctx.editMessageText(langData.texts.chooseTimeframe, Markup.inlineKeyboard(inlineTfButtons));
    return;
  }

  // Проверим, является ли data таймфреймом
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

    // Получаем реальные OHLC из exchangerate.host (с ограничениями)
    // Если нужно, замените fetchOHLC на вызов к реальному API с Dukascopy или другому
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
    // Добавляем кнопку "Следующий анализ" под текстом анализа (которая теперь возвращает к выбору пары)
    await ctx.reply(analysisText, Markup.inlineKeyboard([
      Markup.button.callback(langData.texts.nextAnalysis, 'next_analysis')
    ]));

    return;
  }

  // Неизвестная команда
  await ctx.answerCbQuery(langData.texts.unknownCmd);
});

bot.launch();
console.log('Бот запущен и готов к работе');
