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

const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  chartCallback: (ChartJS) => {
    ChartJS.register(annotationPlugin);
  },
});

// --- Языковые данные ---
const languages = {
  ru: {
    name: 'Русский',
    pairsMain: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD'],
    pairsOTC: ['EURJPY', 'GBPJPY', 'EURGBP', 'EURCHF', 'AUDJPY', 'CHFJPY', 'AUDCAD'],
    timeframes: [
      { label: '1 мин', value: '1m' },
      { label: '5 мин', value: '5m' },
      { label: '15 мин', value: '15m' },
      { label: '1 час', value: '1h' },
      { label: '4 часа', value: '4h' },
      { label: '1 день', value: '1d' },
    ],
    texts: {
      chooseLanguage: 'Выберите язык / Choose language',
      choosePair: 'Выберите валютную пару',
      chooseTimeframe: 'Выберите таймфрейм',
      analysisStarting: (pair, tf) => `Анализ для ${pair} на таймфрейме ${tf}`,
      errorGeneratingChart: 'Ошибка при генерации графика',
      nextAnalysis: 'Следующий анализ',
      pleaseChoosePairFirst: 'Пожалуйста, сначала выберите валютную пару',
      unknownCmd: 'Неизвестная команда',
      jsonData: 'Данные в JSON формате:\n',
    },
  },
  en: {
    name: 'English',
    pairsMain: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD'],
    pairsOTC: ['EURJPY', 'GBPJPY', 'EURGBP', 'EURCHF', 'AUDJPY', 'CHFJPY', 'AUDCAD'],
    timeframes: [
      { label: '1 min', value: '1m' },
      { label: '5 min', value: '5m' },
      { label: '15 min', value: '15m' },
      { label: '1 hour', value: '1h' },
      { label: '4 hours', value: '4h' },
      { label: '1 day', value: '1d' },
    ],
    texts: {
      chooseLanguage: 'Выберите язык / Choose language',
      choosePair: 'Choose currency pair',
      chooseTimeframe: 'Choose timeframe',
      analysisStarting: (pair, tf) => `Analysis for ${pair} on timeframe ${tf}`,
      errorGeneratingChart: 'Error generating chart',
      nextAnalysis: 'Next analysis',
      pleaseChoosePairFirst: 'Please choose a currency pair first',
      unknownCmd: 'Unknown command',
      jsonData: 'Data in JSON format:\n',
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

// --- Аналитические функции (заглушки) ---
function calculateSMA(closes, period) {
  const sma = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      sma.push(null);
      continue;
    }
    const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}
function calculateRSI(closes, period) {
  return []; // заглушка
}
function calculateMACD(closes) {
  return { macd: [], signal: [], histogram: [] }; // заглушка
}
function calculateStochastic(klines) {
  return { k: [], d: [] }; // заглушка
}
function findSupportResistance(klines) {
  return { supports: [], resistances: [] }; // заглушка
}
async function generateChartImage(klines, sma5, sma15, supports, resistances, pair, timeframe, lang) {
  const labels = klines.map(k => new Date(k.openTime).toLocaleString());
  const closeData = klines.map(k => k.close);
  const sma5Data = sma5;
  const sma15Data = sma15;

  const config = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Close',
          data: closeData,
          borderColor: 'blue',
          fill: false,
          tension: 0.1,
        },
        {
          label: 'SMA 5',
          data: sma5Data,
          borderColor: 'green',
          fill: false,
          spanGaps: true,
          tension: 0.1,
        },
        {
          label: 'SMA 15',
          data: sma15Data,
          borderColor: 'red',
          fill: false,
          spanGaps: true,
          tension: 0.1,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `${pair} - ${timeframe}`,
          font: { size: 20 },
        },
      },
      scales: {
        x: { display: false },
        y: { beginAtZero: false },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(config);
}
function analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, lang) {
  return lang === 'ru'
    ? `Аналитика для ${klines.length} свечей.\nSMA5 последняя: ${sma5[sma5.length - 1]?.toFixed(5) || 'N/A'}`
    : `Analysis for ${klines.length} candles.\nLast SMA5: ${sma5[sma5.length - 1]?.toFixed(5) || 'N/A'}`;
}

// --- Маппинг таймфреймов в секунды ---
const timeframeToSeconds = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

// --- Маппинг пары в формат Investing.com URL ---
function pairToInvestingUrl(pair) {
  const base = pair.slice(0, 3);
  const quote = pair.slice(3, 6);
  return `https://www.investing.com/currencies/${base.toLowerCase()}-${quote.toLowerCase()}`;
}

// --- Маппинг таймфрейма в параметр Investing.com ---
const timeframeMapInvesting = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
};

// --- Универсальная функция поиска curr_id ---
async function findCurrId($, pair) {
  // 1. Поиск pair_id = 12345;
  const scripts = $('script').get();
  for (const script of scripts) {
    const text = $(script).html();
    if (!text) continue;
    const match = text.match(/pair_id\s*=\s*(\d+)/);
    if (match) {
      return match[1];
    }
  }
  // 2. Поиск "pairId":12345 в JSON
  for (const script of scripts) {
    const text = $(script).html();
    if (!text) continue;
    const match = text.match(/"pairId"\s*:\s*(\d+)/);
    if (match) {
      return match[1];
    }
  }
  // 3. Поиск в meta-тегах
  const meta = $('meta[name="instrument_id"]');
  if (meta.length) {
    return meta.attr('content');
  }
  throw new Error('Cannot find curr_id for pair ' + pair);
}

// --- Функция получения исторических свечей с Investing.com ---
async function fetchRealOHLC(pair, timeframeValue, count = 100) {
  if (!timeframeMapInvesting[timeframeValue]) {
    throw new Error('Unsupported timeframe: ' + timeframeValue);
  }
  const url = pairToInvestingUrl(pair);
  const interval = timeframeMapInvesting[timeframeValue];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  const mainPageResponse = await axios.get(url, { headers });
  const $ = cheerio.load(mainPageResponse.data);

  const curr_id = await findCurrId($, pair);

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 365 * 24 * 3600 * 1000);

  function formatDate(d) {
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  const postUrl = 'https://www.investing.com/instruments/HistoricalDataAjax';

  const params = new URLSearchParams();
  params.append('curr_id', curr_id);
  params.append('st_date', formatDate(startDate));
  params.append('end_date', formatDate(endDate));
  params.append('interval', interval);
  params.append('sort_col', 'date');
  params.append('sort_ord', 'DESC');
  params.append('action', 'historical_data');

  const postHeaders = {
    ...headers,
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': url,
  };

  const response = await axios.post(postUrl, params.toString(), { headers: postHeaders });

  const $data = cheerio.load(response.data);

  const klines = [];
  $data('#curr_table tbody tr').each((i, el) => {
    if (i >= count) return false;
    const tds = $data(el).find('td');
    if (tds.length < 6) return;
    const dateStr = $data(tds[0]).text().trim();
    const openStr = $data(tds[1]).text().trim().replace(/,/g, '');
    const highStr = $data(tds[2]).text().trim().replace(/,/g, '');
    const lowStr = $data(tds[3]).text().trim().replace(/,/g, '');
    const closeStr = $data(tds[4]).text().trim().replace(/,/g, '');
    const volumeStr = $data(tds[5]).text().trim().replace(/,/g, '').replace(/K/g, '000').replace(/M/g, '000000');

    let openTime = Date.parse(dateStr);
    if (isNaN(openTime)) return;

    const tfSec = timeframeToSeconds[timeframeValue] || 60;
    const closeTime = openTime + tfSec * 1000 - 1;

    const open = parseFloat(openStr);
    const high = parseFloat(highStr);
    const low = parseFloat(lowStr);
    const close = parseFloat(closeStr);
    const volume = parseFloat(volumeStr) || 0;

    if ([open, high, low, close].some(isNaN)) return;

    klines.push({
      openTime,
      open,
      high,
      low,
      close,
      closeTime,
      volume,
    });
  });

  if (klines.length === 0) {
    throw new Error('No candle data parsed from Investing.com');
  }

  klines.sort((a, b) => a.openTime - b.openTime);

  return klines;
}

// --- Вспомогательные ---
function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

const historyData = {};

// --- Отправка выбора пары ---
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

// --- Обработчики бота ---
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

    const key = `${ctx.session.pair}_${tf.value}`;

    try {
      const klines = await fetchRealOHLC(ctx.session.pair, tf.value, 100);
      historyData[key] = klines;

      // Отправляем JSON данных в чат (с ограничением по длине)
      const jsonText = JSON.stringify(klines, null, 2);
      // Telegram ограничивает длину сообщения, разбиваем на части по 4000 символов
      const chunkSize = 4000;
      for (let i = 0; i < jsonText.length; i += chunkSize) {
        await ctx.reply(langData.texts.jsonData + '```\n' + jsonText.slice(i, i + chunkSize) + '\n```', { parse_mode: 'MarkdownV2' });
      }

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
      await ctx.reply(analysisText, Markup.inlineKeyboard([
        Markup.button.callback(langData.texts.nextAnalysis, 'next_analysis'),
      ]));
    } catch (e) {
      console.error('Ошибка получения данных с Investing.com:', e);
      await ctx.reply(langData.texts.errorGeneratingChart + '\n' + e.message);
    }
    return;
  }

  await ctx.answerCbQuery(langData.texts.unknownCmd);
});

// --- Запуск бота ---
bot.launch();
console.log('Бот запущен');
