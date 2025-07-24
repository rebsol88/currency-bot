import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import WebSocket from 'ws';

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

// --- Конфигурация PocketOption из вашего ChatAppConfig ---
const ChatAppConfig = {
  chatURL: 'https://chat-po.site/cabinet/js/app.js?v=267',
  userId: 91717690,
  userSecret: 'eea7f7588a9a0d84b68e0010a0026544',
  baseUrl: 'https://chat-po.site',
  cabinetUrl: 'https://cntly.co/ru',
  cabinetServerUrl: 'https://cntly.co',
  // ...
};

// --- Функция получения свечей с PocketOption через WebSocket (по документации https://lu-yi-hsun.github.io/pocketoptionapi) ---
function connectPocketOptionWS() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://api.pocketoption.com/api/v1/ws');

    ws.on('open', () => {
      // Авторизация
      ws.send(JSON.stringify({
        name: 'auth',
        userId: ChatAppConfig.userId,
        userSecret: ChatAppConfig.userSecret,
        version: 1,
      }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.name === 'auth') {
          if (msg.success) {
            resolve(ws);
          } else {
            reject(new Error('Authentication failed'));
          }
        }
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    });

    ws.on('error', (err) => reject(err));
  });
}

/**
 * Запрашивает свечи с PocketOption WS
 * @param {string} symbol - символ, например 'EURUSD'
 * @param {string} timeframe - таймфрейм, например '1m'
 * @param {number} count - сколько свечей получить
 * @returns {Promise<Array>} массив свечей с полями {openTime, open, high, low, close, closeTime, volume}
 */
async function getPocketOptionCandles(symbol, timeframe, count = 100) {
  const ws = await connectPocketOptionWS();

  return new Promise((resolve, reject) => {
    let receivedCandles = null;

    function onMessage(data) {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.name === 'candles') {
          if (msg.symbol === symbol && msg.timeframe === timeframe && Array.isArray(msg.candles)) {
            receivedCandles = msg.candles.slice(-count).map(c => ({
              openTime: c.time * 1000,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              closeTime: c.time * 1000 + timeframeToMs(timeframe) - 1,
              volume: c.volume,
            }));
            ws.removeListener('message', onMessage);
            ws.close();
            resolve(receivedCandles);
          }
        }
      } catch (e) {
        // ignore JSON parse errors
      }
    }

    ws.on('message', onMessage);

    // Запрос подписки на свечи
    ws.send(JSON.stringify({
      name: 'candles.subscribe',
      symbol,
      timeframe,
    }));

    // Таймаут на получение данных
    setTimeout(() => {
      if (!receivedCandles) {
        ws.removeListener('message', onMessage);
        ws.close();
        reject(new Error('Timeout waiting for candles'));
      }
    }, 7000);
  });
}

function timeframeToMs(tf) {
  if (tf.endsWith('m')) return parseInt(tf) * 60 * 1000;
  if (tf.endsWith('h')) return parseInt(tf) * 60 * 60 * 1000;
  if (tf.endsWith('d')) return parseInt(tf) * 24 * 60 * 60 * 1000;
  return 60000; // default 1m
}

// --- Ваши языковые данные и функции (оставлены без изменений) ---

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

// --- Здесь вставьте все ваши функции индикаторов, анализа и генерации графика без изменений ---
// (calculateSMA, calculateRSI, calculateEMA, calculateMACD, calculateStochastic, findSupportResistance, 
// isVolumeDecreasing, detectCandlePattern, detectRSIDivergence, checkBreakoutWithRetest, generateDetailedRecommendation, analyzeIndicators, generateChartImage)

// Для краткости не дублирую их здесь — используйте ваш исходный код без изменений.

// --- Вспомогательная функция для разбивки массива на чанки ---
function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

const historyData = {}; // Кэш исторических данных

// Функция для вывода выбора валютных пар (используется при старте и при "Следующий анализ")
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

  if (data === 'next_analysis') {
    await ctx.answerCbQuery();
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
    try {
      // Получаем реальные свечи с PocketOption API
      const klines = await getPocketOptionCandles(ctx.session.pair, tf.value, 100);
      historyData[key] = klines;

      const closes = klines.map(k => k.close);
      const sma5 = calculateSMA(closes, 5);
      const sma15 = calculateSMA(closes, 15);
      const rsi = calculateRSI(closes, 14);
      const macd = calculateMACD(closes);
      const stochastic = calculateStochastic(klines);
      const { supports, resistances } = findSupportResistance(klines);

      const imageBuffer = await generateChartImage(klines, sma5, sma15, supports, resistances, ctx.session.pair, tf.label, lang);
      await ctx.replyWithPhoto({ source: imageBuffer });

      const analysisText = analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, lang);
      await ctx.reply(analysisText, Markup.inlineKeyboard([
        Markup.button.callback(langData.texts.nextAnalysis, 'next_analysis')
      ]));
    } catch (e) {
      console.error('Ошибка получения или обработки данных PocketOption:', e);
      await ctx.reply(langData.texts.errorGeneratingChart);
    }
    return;
  }

  await ctx.answerCbQuery(langData.texts.unknownCmd);
});

bot.launch();
console.log('Бот запущен и готов к работе');
