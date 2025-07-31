process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import WebSocket from 'ws';

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
// --- Валютные пары и таймфреймы ---
const pairs = [
  'EURUSD','GBPUSD','EURGBP','GBPJPY','EURJPY','USDJPY','AUDCAD','NZDUSD','USDCHF',
  'XAUUSD','XAGUSD','AUDUSD','USDCAD','AUDJPY','GBPCAD','GBPCHF','GBPAUD','EURAUD',
  'USDNOK','EURNZD','USDSEK'
];
const timeframes = [
  { label: '5 мин', value: '5', minutes: 5 },
  { label: '15 мин', value: '15', minutes: 15 },
  { label: '30 мин', value: '30', minutes: 30 },
  { label: '1 час', value: '60', minutes: 60 },
];
const languages = {
  ru: {
    name: 'Русский',
    pairs,
    timeframes,
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
    pairs,
    timeframes,
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
// Отображаемые имена пар
const displayNames = pairs.reduce((acc, p) => {
  acc[p] = { ru: p, en: p };
  return acc;
}, {});
// WebSocket подключение
const liveData = {};
const signalsSocket = new WebSocket('wss://onlinesignals.pro/', {
  rejectUnauthorized: false
});
signalsSocket.on('open', () => {
  console.log('[WS] Connected');
});
signalsSocket.on('message', (data) => {
  try {
    const msg = JSON.parse(data);
    if (!msg.data || !Array.isArray(msg.data)) return;
    if (msg.command === 'add_signal' || msg.command === 'add_history') {
      msg.data.forEach(item => {
        const key = `${item.symbol}_${item.tf}`;
        if (!liveData[key]) liveData[key] = { signals: [], history: [] };
        if (msg.command === 'add_signal') {
          liveData[key].signals.push(item);
          if (liveData[key].signals.length > 100) liveData[key].signals.shift();
        }
        if (msg.command === 'add_history') {
          liveData[key].history.push(item);
          if (liveData[key].history.length > 500) liveData[key].history.shift();
        }
      });
    }
  } catch (e) {
    console.error('[WS] Parse error', e);
  }
});
signalsSocket.on('close', () => console.log('[WS] Closed'));
signalsSocket.on('error', (err) => console.error('[WS] Error', err));
// Преобразование сигнала в OHLC
function convertSignalToKline(signal) {
  const dtStr = signal.candle.replace(/(\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2})/, '$1-$2-$3T$4:$5:00Z');
  const timestamp = new Date(dtStr).getTime();
  const price = parseFloat(signal.price);
  const tfMinutes = parseInt(signal.tf);
  return {
    openTime: timestamp,
    open: price,
    high: price,
    low: price,
    close: price,
    closeTime: timestamp + tfMinutes * 60 * 1000,
    volume: 0,
  };
}
// Фейковый генератор данных (для резерва)
function getBasePrice(pair) {
  if (pair.startsWith('OTC_')) return 1.2 + (Math.random() - 0.5) * 0.3;
  return 1 + (Math.random() - 0.5) * 0.5;
}
function generateFakeOHLCFromTime(startTimeMs, count, intervalMinutes, pair) {
  const basePrice = getBasePrice(pair);
  let price = basePrice;
  const volatility = pair.startsWith('OTC_') ? 0.003 : 0.0018;
  const data = [];
  let time = startTimeMs;
  for (let i = 0; i < count; i++) {
    const trend = Math.sin(i / 10) * volatility * 0.5;
    const randChange = (Math.random() - 0.5) * volatility;
    const open = price;
    price = Math.max(0.01, price + trend + randChange);
    const close = price;
    const high = Math.max(open, close) + Math.random() * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * 0.3;
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
// --- SMA ---
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
// --- RSI ---
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
// --- EMA ---
function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  const ema = [];
  ema[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}
// --- MACD ---
function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const emaFast = calculateEMA(data, fastPeriod);
  const emaSlow = calculateEMA(data, slowPeriod);
  const macdLine = emaFast.map((val, idx) => {
    if (val === null || emaSlow[idx] === null) return null;
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
// --- Стохастик ---
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
// --- Поиск уровней поддержки и сопротивления ---
function findSupportResistance(klines) {
  const supports = [];
  const resistances = [];
  for (let i = 2; i < klines.length - 2; i++) {
    const lows = klines.slice(i - 2, i + 3).map(k => k.low);
    const highs = klines.slice(i - 2, i + 3).map(k => k.high);
    if (klines[i].low === Math.min(...lows)) supports.push(klines[i].low);
    if (klines[i].high === Math.max(...highs)) resistances.push(klines[i].high);
  }
  const uniqSupports = [...new Set(supports)].sort((a, b) => a - b).slice(0, 3);
  const uniqResistances = [...new Set(resistances)].sort((a, b) => b - a).slice(0, 3);
  return { supports: uniqSupports, resistances: uniqResistances };
}
// --- Анализ индикаторов ---
function analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, lang) {
  const texts = languages[lang].texts;
  const last = klines.length - 1;
  const price = klines[last].close;
  let text = '';
  if (sma5[last] !== null && sma15[last] !== null) {
    if (sma5[last] > sma15[last]) {
      text += `📈 ${texts.trendUp}\n`;
    } else if (sma5[last] < sma15[last]) {
      text += `📉 ${texts.trendDown}\n`;
    } else {
      text += `➖ ${texts.trendNone}\n`;
    }
  } else {
    text += `⚠️ ${lang === 'ru' ? 'Недостаточно данных для оценки тренда по SMA.' : 'Not enough data for SMA trend.'}\n`;
  }
  if (rsi[last] !== null) {
    if (rsi[last] > 70) text += `🚦 RSI высокий (${rsi[last].toFixed(1)}), ${lang === 'ru' ? 'перекупленность.' : 'overbought.'}\n`;
    else if (rsi[last] < 30) text += `🚦 RSI низкий (${rsi[last].toFixed(1)}), ${lang === 'ru' ? 'перепроданность.' : 'oversold.'}\n`;
    else text += `⚪ RSI нейтральный (${rsi[last].toFixed(1)}).\n`;
  }
  return text;
}
// --- Генерация графика ---
async function generateChartImage(klines, sma5, sma15, supports, resistances, pair, timeframeLabel, lang) {
  const labels = klines.map(k => new Date(k.openTime).toISOString().substr(11, 5));
  const closePrices = klines.map(k => k.close);
  const texts = languages[lang].texts;
  const supportAnnotations = supports.map((s, i) => ({
    type: 'line',
    yMin: s,
    yMax: s,
    borderColor: 'green',
    borderWidth: 2,
    borderDash: [6, 6],
    label: {
      content: `${texts.supportLabel} ${i + 1} (${s.toFixed(5)})`,
      enabled: true,
      position: 'start',
      backgroundColor: 'green',
      color: 'white',
      font: { size: 12 },
    },
  }));
  const resistanceAnnotations = resistances.map((r, i) => ({
    type: 'line',
    yMin: r,
    yMax: r,
    borderColor: 'red',
    borderWidth: 2,
    borderDash: [6, 6],
    label: {
      content: `${texts.resistanceLabel} ${i + 1} (${r.toFixed(5)})`,
      enabled: true,
      position: 'start',
      backgroundColor: 'red',
      color: 'white',
      font: { size: 12 },
    },
  }));
  const config = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: lang === 'ru' ? 'Цена Close' : 'Close Price',
          data: closePrices,
          borderColor: 'black',
          fill: false,
          tension: 0.3,
          borderWidth: 1.5,
          pointRadius: 0,
        },
        {
          label: 'SMA 5',
          data: sma5,
          borderColor: 'limegreen',
          fill: false,
          tension: 0.3,
          borderWidth: 1.5,
          pointRadius: 0,
        },
        {
          label: 'SMA 15',
          data: sma15,
          borderColor: 'red',
          fill: false,
          tension: 0.3,
          borderWidth: 1.5,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: `${lang === 'ru' ? 'Аналитика по паре' : 'Analysis for pair'} ${pair} — ${lang === 'ru' ? 'Таймфрейм' : 'Timeframe'}: ${timeframeLabel}`,
          font: { size: 18, weight: 'bold' },
        },
        legend: { position: 'top', labels: { font: { size: 14 } } },
        annotation: { annotations: [...supportAnnotations, ...resistanceAnnotations] },
      },
      scales: {
        y: { title: { display: true, text: texts.priceLabel }, beginAtZero: false },
        x: { title: { display: true, text: texts.timeLabel }, ticks: { maxTicksLimit: 15 } },
      },
    },
  };
  return await chartJSNodeCanvas.renderToBuffer(config);
}
// Вспомогательная функция для разбивки массива на чанки
function chunkArray(arr, size) {
  const result = [];
  for(let i=0; i<arr.length; i+=size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
// Отправка выбора валютной пары
async function sendPairSelection(ctx, lang) {
  const langData = languages[lang];
  const buttons = langData.pairs.map(p => Markup.button.callback(displayNames[p][lang], displayNames[p][lang]));
  const keyboard = chunkArray(buttons, 2);
  await ctx.editMessageText(langData.texts.choosePair, Markup.inlineKeyboard(keyboard));
}
// Получение данных для анализа
async function getKlines(pair, timeframe) {
  const key = `${pair}_${timeframe.value}`;
  if(liveData[key] && liveData[key].signals.length > 30) {
    const klines = liveData[key].signals.map(convertSignalToKline).sort((a,b) => a.openTime - b.openTime);
    return klines;
  }
  else {
    const now = Date.now();
    return generateFakeOHLCFromTime(now - timeframe.minutes * 60 * 1000 * 100, 100, timeframe.minutes, pair);
  }
}
// Обработка команд бота
bot.start(async ctx => {
  ctx.session = {};
  const buttons = [
    Markup.button.callback(languages.ru.name, 'lang_ru'),
    Markup.button.callback(languages.en.name, 'lang_en'),
  ];
  await ctx.reply(languages.ru.texts.chooseLanguage, Markup.inlineKeyboard(buttons));
});
bot.action(/lang_(.+)/, async ctx => {
  const lang = ctx.match[1];
  if(!languages[lang]){
    await ctx.answerCbQuery('Unsupported language');
    return;
  }
  ctx.session.lang = lang;
  await ctx.answerCbQuery();
  await sendPairSelection(ctx, lang);
});
bot.on('callback_query', async ctx => {
  const data = ctx.callbackQuery.data;
  const lang = ctx.session.lang || 'ru';
  const langData = languages[lang];
  if(data === 'noop') {
    await ctx.answerCbQuery();
    return;
  }
  if(data === 'next_analysis'){
    await ctx.answerCbQuery();
    ctx.session.pair = null;
    ctx.session.timeframe = null;
    await sendPairSelection(ctx, lang);
    return;
  }
  // Проверяем валютную пару
  if (pairs.includes(data)) {
    ctx.session.pair = data;
    await ctx.answerCbQuery();
    const tfButtons = langData.timeframes.map(tf => Markup.button.callback(tf.label, tf.value));
    const keyboard = chunkArray(tfButtons, 2);
    await ctx.editMessageText(langData.texts.chooseTimeframe, Markup.inlineKeyboard(keyboard));
    return;
  }
  // Проверяем таймфрейм
  const tf = langData.timeframes.find(t => t.value === data);
  if (tf) {
    if (!ctx.session.pair) {
      await ctx.answerCbQuery(langData.texts.pleaseChoosePairFirst);
      return;
    }
    ctx.session.timeframe = tf;
    await ctx.answerCbQuery();
    await ctx.editMessageText(langData.texts.analysisStarting(displayNames[ctx.session.pair][lang], tf.label));
    try {
      const klines = await getKlines(ctx.session.pair, tf);
      const closes = klines.map(k => k.close);
      const sma5 = calculateSMA(closes, 5);
      const sma15 = calculateSMA(closes, 15);
      const rsi = calculateRSI(closes, 14);
      const macd = calculateMACD(closes);
      const stochastic = calculateStochastic(klines);
      const { supports, resistances } = findSupportResistance(klines);
      const analysisText = analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, lang);
      const chartBuffer = await generateChartImage(klines, sma5, sma15, supports, resistances, ctx.session.pair, tf.label, lang);
      await ctx.replyWithPhoto({ source: chartBuffer }, { caption: analysisText });
      const nextBtn = Markup.inlineKeyboard([Markup.button.callback(langData.texts.nextAnalysis, 'next_analysis')]);
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
