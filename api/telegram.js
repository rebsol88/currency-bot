import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import WebSocket from 'ws';
import axios from 'axios';
import cheerio from 'cheerio';

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const PO_EMAIL = 'shustry_boy@mail.ru';
const PO_PASSWORD = 'do23_d3DnN1cs_';
const PO_WS_SERVER = 'wss://ws.pocketoption.com/websocket';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// --- Инициализация chartJSNodeCanvas с регистрацией плагина annotation ---
const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  chartCallback: (ChartJS) => {
    ChartJS.register(annotationPlugin);
  },
});

// --- Языковые данные и отображение пар (объединены и расширены для полного набора) ---
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
      waitingForData: 'Ожидаю данные котировок...',
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
      waitingForData: 'Waiting for quote data...',
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

// --- Утилиты ---
function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// --- Индикаторы и анализ (взяты из первого бота, без изменений) ---
// calculateSMA, calculateRSI, calculateEMA, calculateMACD, calculateStochastic, findSupportResistance,
// isVolumeDecreasing, detectCandlePattern, detectRSIDivergence, checkBreakoutWithRetest,
// generateDetailedRecommendation, analyzeIndicators
// (Вставь сюда весь код функций индикаторов и анализа из твоего первого бота без изменений)

// --- Функция генерации графика (из первого бота, без изменений) ---
// generateChartImage

// --- Формирование свечей из тиков ---
// Важное изменение: тики приходят с полями price и timestamp (мс).
// Таймфреймы — в минутах (1,5,15,60,240,1440)
function buildCandles(ticks, timeframeMin) {
  if (!ticks.length) return [];

  const candles = [];
  const timeframeMs = timeframeMin * 60 * 1000;

  let candle = null;

  for (const tick of ticks) {
    const time = tick.timestamp;
    const candleTime = time - (time % timeframeMs);

    if (!candle || candle.time !== candleTime) {
      if (candle) candles.push(candle);
      candle = {
        openTime: candleTime,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: 0, // Пока нет объёма в тиках, можно считать 1 тик = 1 объем
      };
    } else {
      candle.high = Math.max(candle.high, tick.price);
      candle.low = Math.min(candle.low, tick.price);
      candle.close = tick.price;
      candle.volume += 1;
    }
  }

  if (candle) candles.push(candle);

  return candles;
}

// --- Авторизация Pocket Option ---
async function loginPocketOption() {
  try {
    const loginPageResp = await axios.get('https://cntly.co/ru/login/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      withCredentials: true,
    });
    const cookies = loginPageResp.headers['set-cookie'] || [];
    const cookieString = cookies.map(c => c.split(';')[0]).join('; ');

    const $ = cheerio.load(loginPageResp.data);
    const csrfToken = $('input[name=csrf_token]').attr('value') || '';

    const params = new URLSearchParams();
    params.append('email', PO_EMAIL);
    params.append('password', PO_PASSWORD);
    if (csrfToken) params.append('csrf_token', csrfToken);
    params.append('submit', 'Войти');

    const loginResp = await axios.post('https://cntly.co/ru/login/', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Cookie': cookieString,
        'Referer': 'https://cntly.co/ru/login/',
      },
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400,
      withCredentials: true,
    });

    let finalHtml = '';
    if (loginResp.status === 302 && loginResp.headers.location) {
      const redirectUrl = loginResp.headers.location.startsWith('http')
        ? loginResp.headers.location
        : 'https://cntly.co' + loginResp.headers.location;
      const finalResp = await axios.get(redirectUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Cookie': cookieString,
          'Referer': 'https://cntly.co/ru/login/',
        },
        withCredentials: true,
      });
      finalHtml = finalResp.data;
    } else {
      finalHtml = loginResp.data;
    }

    const $$ = cheerio.load(finalHtml);
    let userId = null;
    let userSecret = null;

    $$('script').each((i, el) => {
      const scriptText = $$(el).html() || '';
      if (scriptText.includes('userSecret')) {
        const userIdMatch = scriptText.match(/"userId"\s*:\s*"?(\d+)"?/);
        const userSecretMatch = scriptText.match(/"userSecret"\s*:\s*"([a-f0-9]+)"/i);
        if (userIdMatch && userSecretMatch) {
          userId = userIdMatch[1];
          userSecret = userSecretMatch[1];
        }
      }
    });

    if (!userId || !userSecret) {
      throw new Error('Не удалось получить userId или userSecret из страницы после логина');
    }

    return { cookieString, userSecret, userId };
  } catch (e) {
    console.error('Login error:', e.message);
    throw e;
  }
}

// --- WS клиент Pocket Option ---
class PocketOptionWSClient {
  constructor(cookie, userSecret, userId, server) {
    this.cookie = cookie;
    this.userSecret = userSecret;
    this.userId = userId;
    this.server = server;
    this.ws = null;
    this.subscriptions = new Set();
    this.messageHandlers = [];
    this.isConnected = false;
  }

  connect() {
    this.ws = new WebSocket(this.server, {
      headers: {
        Origin: 'https://pocketoption.com',
        Cookie: this.cookie,
      },
    });

    this.ws.on('open', () => {
      this.isConnected = true;
      console.log('WS connected');

      const authMsg = {
        type: 'auth',
        uid: this.userId,
        userSecret: this.userSecret,
      };
      this.ws.send(JSON.stringify(authMsg));

      this.subscriptions.forEach(pair => this.subscribe(pair));
    });

    this.ws.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(data);
      } catch (e) {
        console.error('WS message parse error:', e);
        return;
      }
      this.messageHandlers.forEach(handler => handler(msg));
    });

    this.ws.on('close', () => {
      this.isConnected = false;
      console.log('WS disconnected, reconnecting in 5s');
      setTimeout(() => this.connect(), 5000);
    });

    this.ws.on('error', (err) => {
      console.error('WS error:', err);
      this.ws.close();
    });
  }

  subscribe(pair) {
    if (!this.isConnected) {
      this.subscriptions.add(pair);
      return;
    }
    const subMsg = {
      type: 'subscribe',
      channel: 'ticker',
      symbol: pair,
    };
    try {
      this.ws.send(JSON.stringify(subMsg));
      this.subscriptions.add(pair);
    } catch (e) {
      console.error('Error sending subscribe message:', e);
    }
  }

  addMessageHandler(handler) {
    this.messageHandlers.push(handler);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

// --- Анализ свечей ---
// Используем расширенный анализ из первого бота (analyzeIndicators и т.д.)
// Для простоты, можно использовать analyzeIndicators из первого бота, передавая свечи и индикаторы.

// --- Переменные для хранения данных ---
let poWSClient = null;

// Хранилище тиков и данных для каждого пользователя:
// { [userId]: { pair, timeframeMinutes, ticks: [], lastAnalysisTime } }
const userData = {};

// --- Отправка выбора валютных пар ---
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

  try {
    await ctx.editMessageText(langData.texts.choosePair, Markup.inlineKeyboard(keyboardFinal));
  } catch {
    await ctx.reply(langData.texts.choosePair, Markup.inlineKeyboard(keyboardFinal));
  }
}

// --- Обработка команд и действий бота ---
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
  ctx.session = ctx.session || {};
  ctx.session.lang = lang;
  ctx.session.pair = null;
  ctx.session.timeframe = null;
  await ctx.answerCbQuery();

  // Логинимся в Pocket Option и запускаем WS клиент
  try {
    const { cookieString, userSecret, userId } = await loginPocketOption();

    if (poWSClient) {
      poWSClient.close();
      poWSClient = null;
    }

    poWSClient = new PocketOptionWSClient(cookieString, userSecret, userId, PO_WS_SERVER);
    poWSClient.connect();

  } catch (e) {
    await ctx.reply('Ошибка авторизации Pocket Option, попробуйте позже');
    return;
  }

  await sendPairSelection(ctx, lang);
});

bot.on('callback_query', async (ctx) => {
  ctx.session = ctx.session || {};
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

  // Выбор валютной пары
  const pairEntry = Object.entries(displayNames).find(([, names]) => names[lang] === data);
  if (pairEntry) {
    const pair = pairEntry[0];
    ctx.session.pair = pair;
    ctx.session.timeframe = null;
    await ctx.answerCbQuery();

    const tfButtons = langData.timeframes.map(tf => Markup.button.callback(tf.label, tf.label));
    const inlineTfButtons = chunkArray(tfButtons, 2);

    try {
      await ctx.editMessageText(langData.texts.chooseTimeframe, Markup.inlineKeyboard(inlineTfButtons));
    } catch {
      await ctx.reply(langData.texts.chooseTimeframe, Markup.inlineKeyboard(inlineTfButtons));
    }
    return;
  }

  // Выбор таймфрейма
  const tf = langData.timeframes.find(t => t.label === data);
  if (tf) {
    if (!ctx.session.pair) {
      await ctx.answerCbQuery(langData.texts.pleaseChoosePairFirst);
      return;
    }
    ctx.session.timeframe = tf;
    await ctx.answerCbQuery();

    try {
      await ctx.editMessageText(langData.texts.analysisStarting(displayNames[ctx.session.pair][lang], tf.label));
    } catch {
      await ctx.reply(langData.texts.analysisStarting(displayNames[ctx.session.pair][lang], tf.label));
    }

    if (!poWSClient || !poWSClient.isConnected) {
      await ctx.reply('WebSocket не подключен, попробуйте выбрать язык заново');
      return;
    }

    // Подписка на котировки через WS
    poWSClient.subscribe(ctx.session.pair);

    // Сохраняем для пользователя данные для анализа
    userData[ctx.from.id] = {
      pair: ctx.session.pair,
      timeframeMinutes: tf.minutes,
      ticks: [],
      lastAnalysisTime: 0,
      lang,
      tfLabel: tf.label,
    };

    // Обработчик цен для анализа — один на WS клиент, фильтруем по userData
    // Чтобы не накапливать обработчиков, добавим один, если его ещё нет
    if (!poWSClient._hasPriceHandler) {
      poWSClient._hasPriceHandler = true;

      poWSClient.addMessageHandler(async (msg) => {
        if (msg.type === 'ticker' && msg.symbol && msg.price && msg.timestamp) {
          // Обновляем данные для всех пользователей, подписанных на эту пару
          for (const [userId, udata] of Object.entries(userData)) {
            if (udata.pair === msg.symbol) {
              udata.ticks.push({ price: msg.price, timestamp: msg.timestamp });

              // Ограничиваем количество тиков (например, последние 1000)
              if (udata.ticks.length > 1000) udata.ticks.shift();

              // Формируем свечи из тиков
              const candles = buildCandles(udata.ticks, udata.timeframeMinutes);

              // Анализируем не чаще 30 секунд и если свечей достаточно
              const now = Date.now();
              if (now - udata.lastAnalysisTime > 30 * 1000 && candles.length >= 20) {
                udata.lastAnalysisTime = now;

                // Вычисляем индикаторы
                const closes = candles.map(c => c.close);
                const sma5 = calculateSMA(closes, 5);
                const sma15 = calculateSMA(closes, 15);
                const rsi = calculateRSI(closes, 14);
                const macd = calculateMACD(closes);
                const stochastic = calculateStochastic(candles);
                const { supports, resistances } = findSupportResistance(candles);

                // Генерируем график
                let imageBuffer;
                try {
                  imageBuffer = await generateChartImage(
                    candles,
                    sma5,
                    sma15,
                    supports,
                    resistances,
                    udata.pair,
                    udata.tfLabel,
                    udata.lang
                  );
                } catch (e) {
                  console.error('Ошибка генерации графика:', e);
                }

                // Анализ текста
                const analysisText = analyzeIndicators(
                  candles,
                  sma5,
                  sma15,
                  rsi,
                  macd,
                  stochastic,
                  supports,
                  resistances,
                  udata.lang
                );

                // Отправляем результат пользователю
                try {
                  await bot.telegram.sendPhoto(
                    userId,
                    { source: imageBuffer },
                    { caption: `${languages[udata.lang].texts.analysisStarting(displayNames[udata.pair][udata.lang], udata.tfLabel)}` }
                  );
                  await bot.telegram.sendMessage(userId, analysisText, Markup.inlineKeyboard([
                    Markup.button.callback(languages[udata.lang].texts.nextAnalysis, 'next_analysis'),
                  ]));
                } catch (e) {
                  console.error('Ошибка отправки сообщения пользователю:', e);
                }
              }
            }
          }
        }
      });
    }

    return;
  }

  await ctx.answerCbQuery(langData.texts.unknownCmd);
});

bot.launch();
console.log('Бот запущен и готов к работе');
