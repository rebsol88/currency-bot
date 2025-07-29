import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import axios from 'axios';
import * as cheerio from 'cheerio';  // <-- исправлено здесь

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

// Новые пары из onlinesignals.pro (без OTC)
const pairs = [
  "ALL", "EURUSD", "GBPUSD", "EURGBP", "GBPJPY", "EURJPY", "USDJPY",
  "AUDCAD", "NZDUSD", "USDCHF", "XAUUSD", "XAGUSD", "AUDUSD",
  "USDCAD", "AUDJPY", "GBPCAD", "GBPCHF", "GBPAUD", "EURAUD",
  "USDNOK", "EURNZD", "USDSEK"
];

// Таймфреймы как на сайте
const timeframes = [
  { label: 'Все таймфреймы', value: 'ALL' },
  { label: 'TF M5', value: '5' },
  { label: 'TF M15', value: '15' },
  { label: 'TF M30', value: '30' },
  { label: 'TF H1', value: '60' }
];

// Тексты (только русский для упрощения)
const texts = {
  choosePair: 'Выберите валютную пару:',
  chooseTimeframe: 'Выберите таймфрейм:',
  analysisStarting: (pair, tf) => `Начинаю анализ ${pair} на таймфрейме ${tf}...`,
  unknownCmd: 'Неизвестная команда',
  pleaseChoosePairFirst: 'Пожалуйста, сначала выберите валютную пару.',
  errorFetchingSignals: 'Ошибка при получении данных с сайта.',
  noSignalsFound: 'Сигналы по выбранным параметрам не найдены.',
  nextAnalysis: 'Следующий анализ',
};

// --- Функция парсинга сигналов с сайта onlinesignals.pro ---
async function fetchSignals(pair, tf) {
  try {
    // Загружаем страницу с сигналами
    const url = 'https://onlinesignals.pro/active-signals'; // пример URL
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const $ = cheerio.load(data);

    // Таблица с сигналами имеет id="status"
    // Каждая строка — tr, колонки — td, порядок колонок примерно:
    // [0] Пара, [1] Время, [2] Экспирация, [3] Вход, [4] Тип сделки, [5] Стратегия, [6] Мартингейл

    const signals = [];

    $('#status tr').each((i, el) => {
      const tds = $(el).find('td');
      if (tds.length < 7) return;

      const symbol = $(tds[0]).text().trim();
      const time = $(tds[1]).text().trim();
      const expiry = $(tds[2]).text().trim();
      const entry = $(tds[3]).text().trim();
      const dealType = $(tds[4]).text().trim();
      const strategy = $(tds[5]).text().trim();
      const martingale = $(tds[6]).text().trim();

      // Фильтруем по валютной паре и таймфрейму
      // Для таймфрейма на сайте нет явного поля — будем считать, что сигналы для всех таймфреймов (т.к. нет данных)
      // Можно добавить фильтр по symbol, если pair != ALL
      if ((pair === 'ALL' || symbol === pair) && (tf === 'ALL' || true)) {
        signals.push({ symbol, time, expiry, entry, dealType, strategy, martingale });
      }
    });

    if (signals.length === 0) {
      return texts.noSignalsFound;
    }

    // Формируем текст с анализом по сигналам (пример)
    let message = `Анализ сигналов для ${pair} на таймфрейме ${tf}:\n\n`;

    signals.forEach((s, idx) => {
      message += `#${idx + 1} ${s.symbol} | Время: ${s.time} | Экспирация: ${s.expiry}\nВход: ${s.entry} | Тип: ${s.dealType}\nСтратегия: ${s.strategy} | Мартингейл: ${s.martingale}\n\n`;
    });

    message += '⚠️ Это не торговые сигналы, а аналитическая сводка с сайта onlinesignals.pro';

    return message;

  } catch (e) {
    console.error(e);
    return texts.errorFetchingSignals;
  }
}

// --- Функции для генерации графиков и анализа (оставляем из вашего кода) ---

// ... (копируйте сюда ваши функции generateFakeOHLCFromTime, calculateSMA, calculateRSI, calculateEMA, calculateMACD, calculateStochastic, findSupportResistance, analyzeIndicators, generateChartImage) ...

// --- Вспомогательная функция для разбивки массива на чанки ---
function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// --- Отправка выбора пары ---
async function sendPairSelection(ctx) {
  const buttons = pairs.map(p => Markup.button.callback(p, `pair_${p}`));
  const keyboard = chunkArray(buttons, 3);
  await ctx.editMessageText(texts.choosePair, Markup.inlineKeyboard(keyboard));
}

// --- Отправка выбора таймфрейма ---
async function sendTimeframeSelection(ctx) {
  const buttons = timeframes.map(tf => Markup.button.callback(tf.label, `tf_${tf.value}`));
  const keyboard = chunkArray(buttons, 3);
  await ctx.editMessageText(texts.chooseTimeframe, Markup.inlineKeyboard(keyboard));
}

// --- Обработка команды /start ---
bot.start(async (ctx) => {
  ctx.session = {};
  await ctx.reply(texts.choosePair, Markup.inlineKeyboard(chunkArray(pairs.map(p => Markup.button.callback(p, `pair_${p}`)), 3)));
});

// --- Обработка callback_query ---
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (data.startsWith('pair_')) {
    const pair = data.slice(5);
    ctx.session.pair = pair;
    await ctx.answerCbQuery();
    await sendTimeframeSelection(ctx);
    return;
  }
  if (data.startsWith('tf_')) {
    const tf = data.slice(3);
    if (!ctx.session.pair) {
      await ctx.answerCbQuery(texts.pleaseChoosePairFirst, { show_alert: true });
      return;
    }
    ctx.session.timeframe = tf;
    await ctx.answerCbQuery();
    await ctx.editMessageText(texts.analysisStarting(ctx.session.pair, tf));

    // Получаем сигналы с сайта (анализ, не просто сигналы)
    const analysisText = await fetchSignals(ctx.session.pair, tf);

    // Генерируем фейковые данные и график для визуализации (ваши функции)
    const now = Date.now();
    // Для примера используем 100 свечей с интервалом tf в минутах
    const intervalMinutes = timeframes.find(t => t.value === tf)?.value === 'ALL' ? 15 : parseInt(tf) || 15;
    const klines = generateFakeOHLCFromTime(now - intervalMinutes * 60 * 1000 * 100, 100, intervalMinutes, ctx.session.pair);

    const closes = klines.map(k => k.close);
    const sma5 = calculateSMA(closes, 5);
    const sma15 = calculateSMA(closes, 15);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const stochastic = calculateStochastic(klines);
    const { supports, resistances } = findSupportResistance(klines);

    const detailedAnalysis = analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, 'ru');

    try {
      const chartBuffer = await generateChartImage(klines, sma5, sma15, supports, resistances, ctx.session.pair, tf, 'ru');

      // Отправляем сначала текст с анализом с сайта, потом подробный анализ + график
      await ctx.reply(analysisText);
      await ctx.reply(detailedAnalysis);
      await ctx.replyWithPhoto({ source: chartBuffer });

      // Кнопка "Следующий анализ"
      const nextBtn = Markup.inlineKeyboard([
        Markup.button.callback(texts.nextAnalysis, 'next_analysis'),
      ]);
      await ctx.reply(texts.nextAnalysis, nextBtn);
    } catch (e) {
      console.error(e);
      await ctx.reply(texts.errorFetchingSignals);
    }
    return;
  }
  if (data === 'next_analysis') {
    ctx.session.pair = null;
    ctx.session.timeframe = null;
    await ctx.answerCbQuery();
    await sendPairSelection(ctx);
    return;
  }

  await ctx.answerCbQuery(texts.unknownCmd, { show_alert: true });
});

// --- Ваши функции генерации OHLC, индикаторов и анализа ---
// Вставьте сюда все ваши функции из оригинального кода (generateFakeOHLCFromTime, calculateSMA, calculateRSI, calculateEMA, calculateMACD, calculateStochastic, findSupportResistance, analyzeIndicators, generateChartImage)
// Для компактности не дублирую их здесь, но используйте их без изменений.

// --- Запуск бота ---
bot.launch();
console.log('Bot started');

// Обработка graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
