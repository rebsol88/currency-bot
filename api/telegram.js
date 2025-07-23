import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';

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

// Ваши языки, пары, отображения и индикаторы без изменений...

// --- Новое ---
// Данные для подключения к WebSocket (взято из AppData)
const WS_SERVERS = [
  'wss://api-msk.po.market',
  'wss://api-spb.po.market',
  'wss://api-eu.po.market',
  'wss://api-us-south.po.market',
  'wss://api-us-north.po.market',
];

// Ваш uid и userSecret из CountersServiceApp
const USER_ID = 91717690;
const USER_SECRET = 'eea7f7588a9a0d84b68e0010a0026544';

// Хранилище котировок: { 'EURUSD_1m': [klines...] }
const historyData = {};

// WebSocket подключение и подписка
let ws;
let wsConnected = false;
let wsQueue = []; // очередь запросов, если WS не готов

function connectWebSocket() {
  // Выбираем сервер (например, первый)
  const url = WS_SERVERS[0];
  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log('WebSocket connected:', url);
    wsConnected = true;

    // Отправляем аутентификацию
    ws.send(JSON.stringify({
      action: 'auth',
      userId: USER_ID,
      token: USER_SECRET,
    }));

    // Обрабатываем очередь подписок
    while (wsQueue.length > 0) {
      const msg = wsQueue.shift();
      ws.send(JSON.stringify(msg));
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      // Обработка входящих данных с котировками
      if (data.type === 'ohlc') {
        // Пример формата: { type: 'ohlc', pair: 'EURUSD', timeframe: '1m', klines: [...] }
        const key = `${data.pair}_${data.timeframe}`;
        historyData[key] = data.klines;
      }
      // Можно добавить обработку других типов сообщений при необходимости
    } catch (e) {
      console.error('WS message parse error:', e);
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected, reconnecting...');
    wsConnected = false;
    setTimeout(connectWebSocket, 5000);
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
    ws.close();
  };
}

// Функция подписки на котировки пары и таймфрейма
function subscribePairTimeframe(pair, timeframe) {
  const msg = {
    action: 'subscribe_ohlc',
    pair,
    timeframe,
  };
  if (wsConnected) {
    ws.send(JSON.stringify(msg));
  } else {
    wsQueue.push(msg);
  }
}

// --- Замена генерации фейковых данных ---
// Теперь данные берутся из historyData, если есть, иначе ждем или сообщаем ошибку
async function getRealOHLC(pair, timeframe, count = 100) {
  const key = `${pair}_${timeframe}`;
  let klines = historyData[key];
  if (!klines || klines.length < count) {
    // Ждем данные с WS (максимум 5 секунд)
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 500));
      klines = historyData[key];
      if (klines && klines.length >= count) break;
    }
  }
  if (!klines || klines.length === 0) {
    throw new Error('Нет данных по котировкам для ' + key);
  }
  // Возвращаем последние count свечей
  return klines.slice(-count);
}

// --- В обработчике выбора таймфрейма заменяем генерацию ---
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

    try {
      // Подписываемся на реальные котировки
      subscribePairTimeframe(ctx.session.pair, tf.value);

      // Получаем реальные данные (ждем, если надо)
      const klines = await getRealOHLC(ctx.session.pair, tf.value, 100);
      historyData[`${ctx.session.pair}_${tf.value}`] = klines; // сохраняем

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
      console.error('Ошибка получения или анализа данных:', e);
      await ctx.reply(langData.texts.errorGeneratingChart);
    }
    return;
  }

  await ctx.answerCbQuery(langData.texts.unknownCmd);
});

// Запускаем WebSocket при старте бота
connectWebSocket();

bot.launch();
console.log('Бот запущен и готов к работе');
