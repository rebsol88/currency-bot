import { Telegraf, Markup, session } from 'telegraf';
import WebSocket from 'ws';
import axios from 'axios';

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';

// Ваши данные для логина Pocket Option
const PO_EMAIL = 'shustry_boy@mail.ru';
const PO_PASSWORD = 'do23_d3DnN1cs_';

// WS сервер Pocket Option (пример, может меняться)
const PO_WS_SERVER = 'wss://ws.pocketoption.com/websocket';

// --- Языковые данные ---
const languages = {
  ru: {
    name: 'Русский',
    pairsMain: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD'],
    pairsOTC: ['EURJPY', 'GBPJPY', 'EURGBP', 'EURCHF', 'AUDJPY', 'CHFJPY', 'AUDCAD'],
    timeframes: [
      { label: '1 мин', value: '1' },
      { label: '5 мин', value: '5' },
      { label: '15 мин', value: '15' },
      { label: '1 час', value: '60' },
      { label: '4 часа', value: '240' },
      { label: '1 день', value: 'D' },
    ],
    texts: {
      chooseLanguage: 'Выберите язык / Choose language',
      choosePair: 'Выберите валютную пару',
      chooseTimeframe: 'Выберите таймфрейм',
      analysisStarting: (pair, tf) => `Подписка на котировки для ${pair} (таймфрейм ${tf})`,
      errorGeneratingChart: 'Ошибка при получении данных',
      nextAnalysis: 'Следующий анализ',
      pleaseChoosePairFirst: 'Пожалуйста, сначала выберите валютную пару',
      unknownCmd: 'Неизвестная команда',
      priceUpdate: (pair, price) => `Текущая цена ${pair}: ${price}`,
    },
  },
  en: {
    name: 'English',
    pairsMain: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD'],
    pairsOTC: ['EURJPY', 'GBPJPY', 'EURGBP', 'EURCHF', 'AUDJPY', 'CHFJPY', 'AUDCAD'],
    timeframes: [
      { label: '1 min', value: '1' },
      { label: '5 min', value: '5' },
      { label: '15 min', value: '15' },
      { label: '1 hour', value: '60' },
      { label: '4 hours', value: '240' },
      { label: '1 day', value: 'D' },
    ],
    texts: {
      chooseLanguage: 'Choose language',
      choosePair: 'Choose currency pair',
      chooseTimeframe: 'Choose timeframe',
      analysisStarting: (pair, tf) => `Subscribed to quotes for ${pair} (timeframe ${tf})`,
      errorGeneratingChart: 'Error getting data',
      nextAnalysis: 'Next analysis',
      pleaseChoosePairFirst: 'Please choose a currency pair first',
      unknownCmd: 'Unknown command',
      priceUpdate: (pair, price) => `Current price ${pair}: ${price}`,
    },
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
  EURJPY: { ru: 'EUR/JPY', en: 'EUR/JPY' },
  GBPJPY: { ru: 'GBP/JPY', en: 'GBP/JPY' },
  EURGBP: { ru: 'EUR/GBP', en: 'EUR/GBP' },
  EURCHF: { ru: 'EUR/CHF', en: 'EUR/CHF' },
  AUDJPY: { ru: 'AUD/JPY', en: 'AUD/JPY' },
  CHFJPY: { ru: 'CHF/JPY', en: 'CHF/JPY' },
  AUDCAD: { ru: 'AUD/CAD', en: 'AUD/CAD' },
};

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// --- Авторизация и получение cookie, userSecret, uid с зеркала ---
import cheerio from 'cheerio';

async function loginPocketOption() {
  try {
    // Получаем страницу логина для сессии и возможного CSRF
    const loginPageResp = await axios.get('https://cntly.co/ru/login/', {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      withCredentials: true,
    });
    const cookies = loginPageResp.headers['set-cookie'] || [];
    const cookieString = cookies.map(c => c.split(';')[0]).join('; ');

    // Если нужен CSRF токен — парсим его (пример)
    const $ = cheerio.load(loginPageResp.data);
    const csrfToken = $('input[name=csrf_token]').attr('value') || '';

    // Логинимся POST запросом
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

    // Обработка редиректа после успешного логина
    let finalHtml = '';
    if (loginResp.status === 302 && loginResp.headers.location) {
      const redirectUrl = loginResp.headers.location.startsWith('http') ? loginResp.headers.location : 'https://cntly.co' + loginResp.headers.location;
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

    // Парсим userId и userSecret из скриптов страницы
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

      // Авторизация через WS (пример)
      const authMsg = {
        type: 'auth',
        uid: this.userId,
        userSecret: this.userSecret,
      };
      this.ws.send(JSON.stringify(authMsg));

      // Подписки
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

// --- Инициализация бота ---
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

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

let poWSClient = null;

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

  // Логинимся и создаём WS клиент
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

  // Выбор пары
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

    // Отправлять пользователю текущую цену по подписке
    const priceHandler = (msg) => {
      if (
        msg.type === 'ticker' &&
        msg.symbol === ctx.session.pair &&
        msg.price
      ) {
        ctx.reply(langData.texts.priceUpdate(displayNames[msg.symbol][lang], msg.price));
      }
    };

    poWSClient.addMessageHandler(priceHandler);

    return;
  }

  await ctx.answerCbQuery(langData.texts.unknownCmd);
});

bot.launch();
console.log('Бот запущен');
