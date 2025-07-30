import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import WebSocket from 'ws';

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const PO_SESSION_TOKEN = '66d566bf45f739b6cd9462819ae3b475'; // Вставьте сюда ваш sessionToken Pocket Option
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

// --- Ваши данные languages, displayNames и все функции анализа и генерации графика без изменений ---
// Вставьте сюда весь ваш код с languages, displayNames, индикаторами, анализом, генерацией графика и пр.
// (оставьте без изменений, как в вашем исходном коде)

// --- Функция получения реальных свечей с Pocket Option через WebSocket ---
function getPocketOptionCandles(pair, timeframe, count = 100) {
  return new Promise((resolve, reject) => {
    const tfMap = { '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440 };
    const tfMinutes = tfMap[timeframe];
    if (!tfMinutes) {
      reject(new Error('Unsupported timeframe'));
      return;
    }

    const ws = new WebSocket('wss://ws.pocketoption.com/socket.io/?EIO=3&transport=websocket');
    let isAuthorized = false;

    ws.on('open', () => {
      // Авторизация
      ws.send(JSON.stringify(['auth', { sessionToken: PO_SESSION_TOKEN }]));
    });

    ws.on('message', (data) => {
      try {
        const str = data.toString();
        if (str === '3' || str === '2') return; // heartbeat

        if (str.startsWith('42')) {
          const jsonStr = str.slice(2);
          const parsed = JSON.parse(jsonStr);
          const event = parsed[0];
          const payload = parsed[1];

          if (event === 'auth') {
            if (payload && payload.success) {
              isAuthorized = true;
              // Подписка на свечи
              ws.send(JSON.stringify(['candles.subscribe', { instrument: pair, timeframe: tfMinutes }]));
            } else {
              reject(new Error('Authorization failed'));
              ws.close();
            }
          } else if (event === 'candles') {
            if (Array.isArray(payload) && payload.length > 0) {
              const candles = payload
                .slice(-count)
                .map(c => ({
                  openTime: c.t,
                  open: c.o,
                  high: c.h,
                  low: c.l,
                  close: c.c,
                  closeTime: c.t + tfMinutes * 60 * 1000 - 1,
                  volume: c.v,
                }));
              resolve(candles);
              ws.close();
            }
          }
        }
      } catch (e) {
        reject(e);
        ws.close();
      }
    });

    ws.on('error', (err) => reject(err));
    ws.on('close', () => {
      if (!isAuthorized) reject(new Error('Connection closed before authorization'));
    });
  });
}

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

    try {
      // Если пара OTC, Pocket Option API не поддерживает, используем фейковые данные
      let klines;
      if (ctx.session.pair.startsWith('OTC_')) {
        const now = Date.now();
        klines = generateFakeOHLCFromTime(now - tf.minutes * 60 * 1000 * 100, 100, tf.minutes, ctx.session.pair);
      } else {
        klines = await getPocketOptionCandles(ctx.session.pair, tf.value, 100);
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

// Запуск бота
bot.launch();
console.log('Bot started');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
