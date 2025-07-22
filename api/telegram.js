import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const pairs = [
  'EURUSD', 'USDJPY', 'GBPUSD', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP',
  'EURJPY', 'GBPJPY', 'CHFJPY', 'AUDJPY', 'EURCHF', 'EURCAD', 'AUDCAD', 'NZDJPY',
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

// --- Генерация OHLC ---

function getBasePrice(pair) {
  if (pair.startsWith('OTC_')) {
    return 1.2 + (Math.random() - 0.5) * 0.3;
  } else {
    return 1 + (Math.random() - 0.5) * 0.5;
  }
}

function generateFakeOHLC(count, intervalMinutes, pair) {
  const basePrice = getBasePrice(pair);
  let price = basePrice;

  const volatility = pair.startsWith('OTC_') ? 0.003 : 0.0018;
  const data = [];
  const startTime = new Date();
  startTime.setUTCHours(0, 0, 0, 0);
  let time = startTime.getTime();

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

// --- Индикаторы ---

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

function calculateRSI(data, period = 14) {
  const rsi = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    let gain = diff > 0 ? diff : 0;
    let loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }

  for (let i = 0; i < period; i++) rsi[i] = null;
  return rsi;
}

function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  function EMA(data, period) {
    const k = 2 / (period + 1);
    const ema = [];
    ema[0] = data[0];
    for (let i = 1; i < data.length; i++) {
      ema[i] = data[i] * k + ema[i - 1] * (1 - k);
    }
    return ema;
  }

  const emaFast = EMA(data, fastPeriod);
  const emaSlow = EMA(data, slowPeriod);
  const macdLine = emaFast.map((v, i) => (emaSlow[i] !== undefined ? v - emaSlow[i] : null));
  const signalLineRaw = EMA(macdLine.filter(v => v !== null), signalPeriod);
  const signalLine = Array(macdLine.length - signalLineRaw.length).fill(null).concat(signalLineRaw);
  const histogram = macdLine.map((v, i) => (v !== null && signalLine[i] !== null ? v - signalLine[i] : null));

  return { macdLine, signalLine, histogram };
}

function calculateStochastic(data, kPeriod = 14, dPeriod = 3) {
  const kValues = [];
  for (let i = 0; i < data.length; i++) {
    if (i < kPeriod - 1) {
      kValues.push(null);
      continue;
    }
    const slice = data.slice(i - kPeriod + 1, i + 1);
    const highMax = Math.max(...slice.map(c => c.high));
    const lowMin = Math.min(...slice.map(c => c.low));
    const close = data[i].close;
    const k = lowMin === highMax ? 0 : ((close - lowMin) / (highMax - lowMin)) * 100;
    kValues.push(k);
  }
  const dValuesRaw = calculateSMA(kValues.filter(v => v !== null), dPeriod);
  const dValues = Array(kValues.length - dValuesRaw.length).fill(null).concat(dValuesRaw);

  return { kValues, dValues };
}

// --- Линии поддержки и сопротивления ---

function findSupportResistance(data) {
  const supports = [];
  const resistances = [];
  for (let i = 2; i < data.length - 2; i++) {
    const lows = data.slice(i - 2, i + 3).map(c => c.low);
    const highs = data.slice(i - 2, i + 3).map(c => c.high);
    if (data[i].low === Math.min(...lows)) supports.push({ index: i, price: data[i].low });
    if (data[i].high === Math.max(...highs)) resistances.push({ index: i, price: data[i].high });
  }
  function frequentLevels(levels) {
    const rounded = levels.map(l => Math.round(l.price * 10000) / 10000);
    const counts = {};
    rounded.forEach(r => (counts[r] = (counts[r] || 0) + 1));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 3).map(s => parseFloat(s[0]));
  }
  return {
    supports: frequentLevels(supports),
    resistances: frequentLevels(resistances),
  };
}

// --- График ---

async function drawChart(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances) {
  const labels = klines.map(k => {
    const d = new Date(k.openTime);
    return d.toISOString().substr(11, 5);
  });
  const closes = klines.map(k => k.close);

  const configuration = {
    type: 'line',
    data: {
      labels,
      datasets: [
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
        },
      ],
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
          display: true,
          position: 'right',
          title: { display: true, text: 'RSI' },
          min: 0,
          max: 100,
          grid: { drawOnChartArea: false },
          offset: true,
        },
        yMACD: {
          type: 'linear',
          display: true,
          position: 'right',
          title: { display: true, text: 'MACD' },
          grid: { drawOnChartArea: false },
          offset: true,
        },
        yStoch: {
          type: 'linear',
          display: true,
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

// --- Анализ и рекомендации ---

function analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances) {
  let text = '';

  const last = klines.length - 1;
  const prev = last - 1;
  if (prev < 0) return 'Недостаточно данных для анализа.';

  const crossUp = sma5[prev] <= sma15[prev] && sma5[last] > sma15[last];
  const crossDown = sma5[prev] >= sma15[prev] && sma5[last] < sma15[last];

  if (crossUp) text += 'SMA(5) пересекла SMA(15) снизу вверх — сигнал на покупку.\n';
  else if (crossDown) text += 'SMA(5) пересекла SMA(15) сверху вниз — сигнал на продажу.\n';
  else {
    if (sma5[last] > sma15[last]) text += 'SMA(5) выше SMA(15) — возможен восходящий тренд.\n';
    else if (sma5[last] < sma15[last]) text += 'SMA(5) ниже SMA(15) — возможен нисходящий тренд.\n';
    else text += 'SMA(5) и SMA(15) близки — тренд не выражен.\n';
  }

  if (rsi[last] !== null) {
    if (rsi[last] > 70) text += `RSI = ${rsi[last].toFixed(1)} — перекупленность, возможен разворот вниз.\n`;
    else if (rsi[last] < 30) text += `RSI = ${rsi[last].toFixed(1)} — перепроданность, возможен разворот вверх.\n`;
    else text += `RSI = ${rsi[last].toFixed(1)} — нет явных сигналов по RSI.\n`;
  }

  if (macd.macdLine[last] !== null && macd.signalLine[last] !== null) {
    const macdDiffPrev = macd.macdLine[prev] - macd.signalLine[prev];
    const macdDiffCurr = macd.macdLine[last] - macd.signalLine[last];
    if (macdDiffPrev <= 0 && macdDiffCurr > 0) text += 'MACD пересек сигнальную линию снизу вверх — сигнал на покупку.\n';
    else if (macdDiffPrev >= 0 && macdDiffCurr < 0) text += 'MACD пересек сигнальную линию сверху вниз — сигнал на продажу.\n';
    else text += 'MACD не показывает явных сигналов.\n';
  }

  if (stochastic.kValues[last] !== null && stochastic.dValues[last] !== null) {
    const k = stochastic.kValues[last];
    const d = stochastic.dValues[last];
    if (k > 80 && d > 80 && k < d) text += 'Стохастик в зоне перекупленности и %K пересекает %D сверху вниз — сигнал на продажу.\n';
    else if (k < 20 && d < 20 && k > d) text += 'Стохастик в зоне перепроданности и %K пересекает %D снизу вверх — сигнал на покупку.\n';
    else text += 'Стохастик не показывает явных сигналов.\n';
  }

  const lastClose = klines[last].close;
  const nearSupport = supports.find(s => Math.abs(s - lastClose) / lastClose < 0.005);
  const nearResistance = resistances.find(r => Math.abs(r - lastClose) / lastClose < 0.005);

  if (nearSupport !== undefined) text += `Цена близка к уровню поддержки около ${nearSupport.toFixed(5)}.\n`;
  if (nearResistance !== undefined) text += `Цена близка к уровню сопротивления около ${nearResistance.toFixed(5)}.\n`;

  if (crossUp || (rsi[last] < 30 && stochastic.kValues[last] < 20)) {
    text += '\nРЕКОМЕНДАЦИЯ: Рассмотрите покупку — возможен рост цены.\n';
  } else if (crossDown || (rsi[last] > 70 && stochastic.kValues[last] > 80)) {
    text += '\nРЕКОМЕНДАЦИЯ: Рассмотрите продажу — возможен спад цены.\n';
  } else {
    text += '\nРЕКОМЕНДАЦИЯ: Рынок не определился, рекомендуем воздержаться от сделок или дождаться подтверждающих сигналов.\n';
  }

  return text;
}

// --- Telegram Bot ---

bot.start(async (ctx) => {
  ctx.session = {};
  await ctx.reply(
    'Привет! Выберите валютную пару:',
    Markup.inlineKeyboard(
      pairs.map(p => Markup.button.callback(p, `pair_${p}`)),
      { columns: 4 }
    )
  );
});

bot.action(/pair_(.+)/, async (ctx) => {
  try {
    const pair = ctx.match[1];
    ctx.session.pair = pair;
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `Вы выбрали валютную пару: ${pair}\nТеперь выберите таймфрейм:`,
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
    await ctx.editMessageText(`Генерирую данные для пары ${ctx.session.pair} и таймфрейма ${tf.label}...`);

    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const msSinceStart = now - startOfDay.getTime();
    const candleCount = Math.floor(msSinceStart / (tf.minutes * 60 * 1000));

    if (candleCount < 30) {
      await ctx.reply('Недостаточно данных за текущую сессию для выбранного таймфрейма (минимум 30 свечей).');
      return;
    }

    console.log(`Генерирую ${candleCount} свечей для пары ${ctx.session.pair} с таймфреймом ${tf.value}`);

    const klines = generateFakeOHLC(candleCount, tf.minutes, ctx.session.pair);
    const closes = klines.map(k => k.close);

    const sma5 = calculateSMA(closes, 5);
    const sma15 = calculateSMA(closes, 15);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes, 12, 26, 9);
    const stochastic = calculateStochastic(klines, 14, 3);
    const { supports, resistances } = findSupportResistance(klines);

    console.log('Начинаю генерацию графика...');
    const chartBuffer = await drawChart(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances);
    console.log('График сгенерирован, отправляю фото...');

    const analysisText = analyzeIndicators(klines, sma5, sma15, rsi, macd, stochastic, supports, resistances);

    await ctx.replyWithPhoto({ source: chartBuffer }, {
      caption: `Валютная пара: ${ctx.session.pair}\nТаймфрейм: ${tf.label}\n\nАнализ и рекомендации:\n${analysisText}`
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
