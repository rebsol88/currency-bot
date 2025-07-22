import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const bot = new Telegraf(BOT_TOKEN);
bot.use(session()); // обязательно подключить middleware session до обработчиков

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
  { label: '1 минута', value: '1m', minutes: 1 },
  { label: '5 минут', value: '5m', minutes: 5 },
  { label: '15 минут', value: '15m', minutes: 15 },
  { label: '1 час', value: '1h', minutes: 60 },
  { label: '4 часа', value: '4h', minutes: 240 },
  { label: '1 день', value: '1d', minutes: 1440 },
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

// --- Отображаемые имена пар для кнопок ---
const displayNames = {
  EURUSD: 'EUR/USD', USDJPY: 'USD/JPY', GBPUSD: 'GBP/USD', USDCHF: 'USD/CHF',
  AUDUSD: 'AUD/USD', USDCAD: 'USD/CAD', NZDUSD: 'NZD/USD', EURGBP: 'EUR/GBP',
  EURJPY: 'EUR/JPY', GBPJPY: 'GBP/JPY', CHFJPY: 'CHF/JPY', AUDJPY: 'AUD/JPY',
  EURCHF: 'EUR/CHF', EURCAD: 'EUR/CAD', AUDCAD: 'AUD/CAD', NZDJPY: 'NZD/JPY',
  OTC_EURAUD: 'OTC EUR/AUD', OTC_EURCAD: 'OTC EUR/CAD', OTC_EURCHF: 'OTC EUR/CHF', OTC_EURJPY: 'OTC EUR/JPY',
  OTC_EURNZD: 'OTC EUR/NZD', OTC_EURUSD: 'OTC EUR/USD', OTC_GBPCHF: 'OTC GBP/CHF', OTC_GBPJPY: 'OTC GBP/JPY',
  OTC_GBPNZD: 'OTC GBP/NZD', OTC_GBPUSD: 'OTC GBP/USD', OTC_USDCAD: 'OTC USD/CAD', OTC_USDCHF: 'OTC USD/CHF',
  OTC_USDJPY: 'OTC USD/JPY', OTC_USDNZD: 'OTC USD/NZD', OTC_AUDCAD: 'OTC AUD/CAD', OTC_AUDCHF: 'OTC AUD/CHF',
};

// --- Генерация OHLC ---

function getBasePrice(pair) {
  if (pair.startsWith('OTC_')) {
    return 1.2 + (Math.random() - 0.5) * 0.3;
  } else {
    return 1 + (Math.random() - 0.5) * 0.5;
  }
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

    data.push({
      openTime: time,
      open,
      high,
      low,
      close,
      closeTime: time + intervalMinutes * 60 * 1000 - 1,
    });
    time += intervalMinutes * 60 * 1000;
  }
  return data;
}

// --- Функции индикаторов ---

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

function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  const ema = [];
  ema[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const emaFast = calculateEMA(data, fastPeriod);
  const emaSlow = calculateEMA(data, slowPeriod);
  const macdLine = emaFast.map((val, idx) => val - emaSlow[idx]);
  const signalLine = calculateEMA(macdLine.slice(slowPeriod - 1), signalPeriod);
  // Сдвигаем signalLine, чтобы выровнять по длине с macdLine:
  const signalLineFull = Array(slowPeriod - 1 + signalPeriod - 1).fill(null).concat(signalLine);
  const histogram = macdLine.map((val, idx) =>
    (val !== null && signalLineFull[idx] !== null) ? val - signalLineFull[idx] : null
  );
  return { macdLine, signalLine: signalLineFull, histogram };
}

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
    const k = ((close - lowMin) / (highMax - lowMin)) * 100;
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

function findSupportResistance(klines) {
  // Простая реализация: берем локальные минимумы/максимумы за последние 50 свечей
  const supports = [];
  const resistances = [];
  const len = klines.length;
  for (let i = 2; i < len - 2; i++) {
    const lows = klines.slice(i - 2, i + 3).map(k => k.low);
    const highs = klines.slice(i - 2, i + 3).map(k => k.high);
    if (klines[i].low === Math.min(...lows)) supports.push(klines[i].low);
    if (klines[i].high === Math.max(...highs)) resistances.push(klines[i].high);
  }
  // Оставим максимум 3 поддержки и сопротивления, уникальные и отсортированные
  const uniqSupports = [...new Set(supports)].sort((a, b) => a - b).slice(0, 3);
  const uniqResistances = [...new Set(resistances)].sort((a, b) => b - a).slice(0, 3);
  return { supports: uniqSupports, resistances: uniqResistances };
}

function analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances) {
  let text = '';

  const last = klines.length - 1;
  if (sma5[last] !== null && sma15[last] !== null) {
    if (sma5[last] > sma15[last]) text += 'SMA5 выше SMA15 — восходящий тренд.\n';
    else text += 'SMA5 ниже SMA15 — нисходящий тренд.\n';
  }

  if (rsi[last] !== null) {
    if (rsi[last] > 70) text += 'RSI выше 70 — перекупленность.\n';
    else if (rsi[last] < 30) text += 'RSI ниже 30 — перепроданность.\n';
  }

  if (macd.macdLine[last] !== null && macd.signalLine[last] !== null) {
    if (macd.macdLine[last] > macd.signalLine[last]) text += 'MACD — бычий сигнал.\n';
    else text += 'MACD — медвежий сигнал.\n';
  }

  if (stochastic.kValues[last] !== null && stochastic.dValues[last] !== null) {
    if (stochastic.kValues[last] > stochastic.dValues[last]) text += 'Stochastic — бычий сигнал.\n';
    else text += 'Stochastic — медвежий сигнал.\n';
  }

  if (supports.length) text += `Поддержки: ${supports.map(p => p.toFixed(5)).join(', ')}.\n`;
  if (resistances.length) text += `Сопротивления: ${resistances.map(p => p.toFixed(5)).join(', ')}.\n`;

  return text || 'Нет достаточных данных для анализа.';
}

// --- Функция отрисовки графика ---

async function drawChart(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, timeframeMinutes) {
  const labels = klines.map(k => {
    const d = new Date(k.openTime);
    return d.toISOString().substr(11, 5);
  });
  const closes = klines.map(k => k.close);

  const isOneMinute = timeframeMinutes === 1;

  const datasets = [
    {
      label: 'Цена Close',
      data: closes,
      borderColor: 'black',
      borderWidth: 1,
      fill: false,
      pointRadius: 0,
      yAxisID: 'y',
    },
    {
      label: 'SMA 5',
      data: sma5,
      borderColor: 'green',
      borderWidth: 2,
      fill: false,
      spanGaps: true,
      pointRadius: 0,
      yAxisID: 'y',
    },
    {
      label: 'SMA 15',
      data: sma15,
      borderColor: 'red',
      borderWidth: 2,
      fill: false,
      spanGaps: true,
      pointRadius: 0,
      yAxisID: 'y',
    },
  ];

  if (!isOneMinute) {
    datasets.push(
      {
        label: 'RSI',
        data: rsi,
        borderColor: 'blue',
        borderWidth: 1,
        fill: false,
        yAxisID: 'yRSI',
        spanGaps: true,
        pointRadius: 0,
      },
      {
        label: 'MACD',
        data: macd.macdLine,
        borderColor: 'purple',
        borderWidth: 1,
        fill: false,
        yAxisID: 'yMACD',
        spanGaps: true,
        pointRadius: 0,
      },
      {
        label: 'MACD Signal',
        data: macd.signalLine,
        borderColor: 'orange',
        borderWidth: 1,
        fill: false,
        yAxisID: 'yMACD',
        spanGaps: true,
        pointRadius: 0,
      },
      {
        label: 'Stochastic %K',
        data: stochastic.kValues,
        borderColor: 'cyan',
        borderWidth: 1,
        fill: false,
        yAxisID: 'yStoch',
        spanGaps: true,
        pointRadius: 0,
      },
      {
        label: 'Stochastic %D',
        data: stochastic.dValues,
        borderColor: 'magenta',
        borderWidth: 1,
        fill: false,
        yAxisID: 'yStoch',
        spanGaps: true,
        pointRadius: 0,
      }
    );
  }

  const configuration = {
    type: 'line',
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: false,
      interaction: { mode: 'index', intersect: false },
      stacked: false,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Аналитика по выбранной паре' },
        annotation: {
          annotations: {
            ...supports.reduce((acc, price, idx) => {
              acc[`support${idx}`] = {
                type: 'line',
                yMin: price,
                yMax: price,
                borderColor: 'green',
                borderWidth: 1,
                borderDash: [6, 4],
                label: {
                  content: `Поддержка ${idx + 1}`,
                  enabled: true,
                  position: 'start',
                  backgroundColor: 'green',
                  color: 'white',
                },
                yScaleID: 'y',
              };
              return acc;
            }, {}),
            ...resistances.reduce((acc, price, idx) => {
              acc[`resistance${idx}`] = {
                type: 'line',
                yMin: price,
                yMax: price,
                borderColor: 'red',
                borderWidth: 1,
                borderDash: [6, 4],
                label: {
                  content: `Сопротивление ${idx + 1}`,
                  enabled: true,
                  position: 'start',
                  backgroundColor: 'red',
                  color: 'white',
                },
                yScaleID: 'y',
              };
              return acc;
            }, {}),
          },
        },
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: { display: true, text: 'Цена' },
          ticks: { beginAtZero: false },
          grid: { drawOnChartArea: true },
          min: Math.min(...closes) * 0.995,
          max: Math.max(...closes) * 1.005,
        },
        yRSI: {
          type: 'linear',
          display: !isOneMinute,
          position: 'right',
          title: { display: true, text: 'RSI' },
          min: 0,
          max: 100,
          grid: { drawOnChartArea: false },
          offset: true,
        },
        yMACD: {
          type: 'linear',
          display: !isOneMinute,
          position: 'right',
          title: { display: true, text: 'MACD' },
          grid: { drawOnChartArea: false },
          offset: true,
        },
        yStoch: {
          type: 'linear',
          display: !isOneMinute,
          position: 'right',
          title: { display: true, text: 'Stochastic' },
          min: 0,
          max: 100,
          grid: { drawOnChartArea: false },
          offset: true,
        },
        x: {
          display: true,
          title: { display: true, text: 'Время (UTC)' },
          ticks: { maxRotation: 90, minRotation: 45 },
        },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

// --- Telegram Bot ---

bot.start(async (ctx) => {
  if (!ctx.session) ctx.session = {};

  // Левая колонка — основные пары
  const mainButtons = pairsMain.map(p => Markup.button.callback(displayNames[p], `pair_${p}`));

  // Правая колонка — заголовок OTC (неактивная кнопка) + кнопки OTC
  const otcHeader = [Markup.button.callback('OTC', 'noop')];
  const otcButtons = pairsOTC.map(p => Markup.button.callback(displayNames[p], `pair_${p}`));

  const maxRows = Math.max(mainButtons.length, otcButtons.length + 1);

  const keyboard = [];

  for (let i = 0; i < maxRows; i++) {
    const row = [];
    row.push(i < mainButtons.length ? mainButtons[i] : Markup.button.callback(' ', 'noop'));
    if (i === 0) {
      row.push(otcHeader[0]);
    } else {
      row.push(otcButtons[i - 1] ?? Markup.button.callback(' ', 'noop'));
    }
    keyboard.push(row);
  }

  await ctx.reply(
    'Привет! Выберите валютную пару:',
    Markup.inlineKeyboard(keyboard)
  );
});

bot.action('noop', async (ctx) => {
  await ctx.answerCbQuery();
});

bot.action(/pair_(.+)/, async (ctx) => {
  if (!ctx.session) ctx.session = {};
  try {
    const pair = ctx.match[1];
    ctx.session.pair = pair;
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `Вы выбрали валютную пару: ${displayNames[pair] || pair}\nТеперь выберите таймфрейм:`,
      Markup.inlineKeyboard(
        timeframes.map(tf => Markup.button.callback(tf.label, `tf_${tf.value}`)),
        { columns: 3 }
      )
    );
  } catch (error) {
    console.error('Ошибка в обработчике выбора пары:', error);
    await ctx.reply('Произошла ошибка, попробуйте ещё раз.');
  }
});

bot.action(/tf_(.+)/, async (ctx) => {
  if (!ctx.session) ctx.session = {};
  try {
    const tfValue = ctx.match[1];
    const tf = timeframes.find(t => t.value === tfValue);
    if (!tf) {
      await ctx.answerCbQuery('Неверный таймфрейм', { show_alert: true });
      return;
    }

    if (!ctx.session.pair) {
      await ctx.answerCbQuery('Сначала выберите валютную пару', { show_alert: true });
      return;
    }

    ctx.session.timeframe = tf;

    await ctx.answerCbQuery();
    await ctx.editMessageText(`Генерирую данные для пары ${displayNames[ctx.session.pair] || ctx.session.pair} и таймфрейма ${tf.label}...`);

    const now = Date.now();
    const msPerCandle = tf.minutes * 60 * 1000;

    const candlesNeeded = 50;
    const candlesFrom2Days = Math.floor((2 * 24 * 60) / tf.minutes);
    const candleCount = Math.max(candlesNeeded, candlesFrom2Days);

    const startTime = now - candleCount * msPerCandle;

    const klines = generateFakeOHLCFromTime(startTime, candleCount, tf.minutes, ctx.session.pair);
    const closes = klines.map(k => k.close);

    if (klines.length < 30) {
      await ctx.reply('Недостаточно данных для анализа (меньше 30 свечей). Попробуйте другой таймфрейм.');
      return;
    }

    const sma5 = calculateSMA(closes, 5);
    const sma15 = calculateSMA(closes, 15);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes, 12, 26, 9);
    const stochastic = calculateStochastic(klines, 14, 3);
    const { supports, resistances } = findSupportResistance(klines);

    const chartBuffer = await drawChart(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances, tf.minutes);

    const analysisText = analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances);

    await ctx.replyWithPhoto({ source: chartBuffer }, {
      caption: `Валютная пара: ${displayNames[ctx.session.pair] || ctx.session.pair}\nТаймфрейм: ${tf.label}\n\nАнализ и рекомендации:\n${analysisText}`
    });

    await ctx.reply('Для нового запроса используйте /start');
  } catch (error) {
    console.error('Ошибка в обработчике таймфрейма:', error);
    await ctx.reply('Произошла ошибка при генерации данных, попробуйте ещё раз.');
  }
});

bot.launch().then(() => {
  console.log('Бот запущен!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
