import { Telegraf } from 'telegraf';
import { SMA, RSI, Stochastic, MACD } from 'technicalindicators';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

// Инициализация бота с токеном из переменной окружения
const bot = new Telegraf(process.env.BOT_TOKEN);

// Фейковая функция получения свечей (замените на реальный источник)
async function fetchCandles(symbol, timeframe) {
  const lengths = { '1m': 100, '5m': 50, '15m': 30, '1h': 20, '1d': 15 };
  const length = lengths[timeframe] || 50;

  const candles = [];
  let basePrice = 50000;
  for (let i = 0; i < length; i++) {
    const open = basePrice + (Math.random() - 0.5) * 500;
    const close = open + (Math.random() - 0.5) * 300;
    const high = Math.max(open, close) + Math.random() * 200;
    const low = Math.min(open, close) - Math.random() * 200;
    candles.push({ open, high, low, close });
    basePrice = close;
  }
  return candles;
}

function findSupportResistance(candles) {
  const supports = [];
  const resistances = [];

  for (let i = 1; i < candles.length - 1; i++) {
    if (candles[i].low < candles[i - 1].low && candles[i].low < candles[i + 1].low) {
      supports.push(candles[i].low);
    }
    if (candles[i].high > candles[i - 1].high && candles[i].high > candles[i + 1].high) {
      resistances.push(candles[i].high);
    }
  }
  return { supports, resistances };
}

function analyzeTrend(sma5, sma15) {
  if (sma5.length === 0 || sma15.length === 0) return 'Тренд: недостаточно данных';

  const lastSMA5 = sma5[sma5.length - 1];
  const lastSMA15 = sma15[sma15.length - 1];

  if (lastSMA5 > lastSMA15) return 'Тренд: бычий (восходящий)';
  if (lastSMA5 < lastSMA15) return 'Тренд: медвежий (нисходящий)';
  return 'Тренд: неопределённый';
}

function analyzeIndicators(rsi, stochasticK, macd) {
  if (rsi.length === 0 || stochasticK.length === 0 || macd.length === 0) {
    return 'Недостаточно данных для анализа индикаторов';
  }

  const rsiLast = rsi[rsi.length - 1];
  let rsiSignal = '';
  if (rsiLast > 70) rsiSignal = `RSI: перекупленность (${rsiLast.toFixed(1)}) — возможна коррекция`;
  else if (rsiLast < 30) rsiSignal = `RSI: перепроданность (${rsiLast.toFixed(1)}) — возможен рост`;
  else rsiSignal = `RSI: нейтрально (${rsiLast.toFixed(1)})`;

  const k = stochasticK[stochasticK.length - 1];
  let stochasticSignal = '';
  if (k > 80) stochasticSignal = `Стохастик: перекупленность (${k.toFixed(1)})`;
  else if (k < 20) stochasticSignal = `Стохастик: перепроданность (${k.toFixed(1)})`;
  else stochasticSignal = `Стохастик: нейтрально (${k.toFixed(1)})`;

  const macdVal = macd[macd.length - 1];
  const macdDiff = macdVal.MACD - macdVal.signal;
  let macdSignal = '';
  if (macdDiff > 0) macdSignal = `MACD: бычий сигнал (${macdVal.MACD.toFixed(3)} > ${macdVal.signal.toFixed(3)})`;
  else macdSignal = `MACD: медвежий сигнал (${macdVal.MACD.toFixed(3)} < ${macdVal.signal.toFixed(3)})`;

  return [rsiSignal, stochasticSignal, macdSignal].join('\n');
}

function generateTradeRecommendations(trend, rsi, stochasticK, macd, closes, levels) {
  if (rsi.length === 0 || stochasticK.length === 0 || macd.length === 0) {
    return 'Недостаточно данных для рекомендаций.';
  }

  const lastClose = closes[closes.length - 1];
  const rsiLast = rsi[rsi.length - 1];
  const stochasticLast = stochasticK[stochasticK.length - 1];
  const macdLast = macd[macd.length - 1];

  const nearSupport = levels.supports.length > 0 && levels.supports.some(level => Math.abs(lastClose - level) / level < 0.01);
  const nearResistance = levels.resistances.length > 0 && levels.resistances.some(level => Math.abs(lastClose - level) / level < 0.01);

  const buySignal =
    trend.includes('бычий') &&
    rsiLast < 30 &&
    stochasticLast < 20 &&
    macdLast.MACD > macdLast.signal &&
    nearSupport;

  const sellSignal =
    trend.includes('медвежий') &&
    rsiLast > 70 &&
    stochasticLast > 80 &&
    macdLast.MACD < macdLast.signal &&
    nearResistance;

  if (buySignal) {
    return 'Рекомендация: Покупать (Long) — тренд восходящий, индикаторы перепроданы, цена у поддержки.';
  }
  if (sellSignal) {
    return 'Рекомендация: Продавать (Short) — тренд нисходящий, индикаторы перекуплены, цена у сопротивления.';
  }

  if (trend.includes('бычий')) {
    return 'Рекомендация: В целом тренд восходящий, но индикаторы не показывают явных сигналов покупки. Рекомендуется подождать подтверждения или входить с осторожностью.';
  }
  if (trend.includes('медвежий')) {
    return 'Рекомендация: В целом тренд нисходящий, но индикаторы не показывают явных сигналов продажи. Рекомендуется подождать подтверждения или входить с осторожностью.';
  }
  return 'Рекомендация: Тренд неопределённый, рекомендуется воздержаться от сделок.';
}

async function generateChartImage(candles, symbol, timeframe, levels, sma5, sma15) {
  const width = 800;
  const height = 400;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

  const closes = candles.map(c => c.close);
  const labels = candles.map((_, i) => i + 1);

  const sma5Full = Array(closes.length - sma5.length).fill(null).concat(sma5);
  const sma15Full = Array(closes.length - sma15.length).fill(null).concat(sma15);

  const datasets = [
    {
      label: 'Цена (Close)',
      data: closes,
      borderColor: 'blue',
      fill: false,
      pointRadius: 0,
      borderWidth: 1.5,
    },
    {
      label: 'SMA 5',
      data: sma5Full,
      borderColor: 'green',
      fill: false,
      pointRadius: 0,
      borderWidth: 1.5,
    },
    {
      label: 'SMA 15',
      data: sma15Full,
      borderColor: 'red',
      fill: false,
      pointRadius: 0,
      borderWidth: 1.5,
    },
  ];

  const supportLines = levels.supports.length > 0 ? levels.supports.map(level => ({
    label: 'Поддержка',
    data: Array(closes.length).fill(level),
    borderColor: 'darkgreen',
    borderDash: [5, 5],
    fill: false,
    pointRadius: 0,
    borderWidth: 1,
  })) : [];

  const resistanceLines = levels.resistances.length > 0 ? levels.resistances.map(level => ({
    label: 'Сопротивление',
    data: Array(closes.length).fill(level),
    borderColor: 'darkred',
    borderDash: [5, 5],
    fill: false,
    pointRadius: 0,
    borderWidth: 1,
  })) : [];

  datasets.push(...supportLines, ...resistanceLines);

  const configuration = {
    type: 'line',
    data: {
      labels,
      datasets,
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `${symbol} — Таймфрейм: ${timeframe}`,
          font: { size: 18 },
        },
        legend: { display: true },
      },
      scales: {
        x: { display: false },
        y: { beginAtZero: false },
      },
      elements: {
        line: { tension: 0 },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

// Обработка команды /analyze
bot.command('analyze', async (ctx) => {
  try {
    const args = ctx.message?.text?.split(' ') || [];
    const symbol = args[1] ? args[1].toUpperCase() : 'BTCUSDT';
    const timeframe = args[2] ? args[2].toLowerCase() : '1m';

    const candles = await fetchCandles(symbol, timeframe);
    if (!candles || candles.length === 0) {
      return ctx.reply('Не удалось получить данные по свечам.');
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    const sma5 = SMA.calculate({ period: 5, values: closes });
    const sma15 = SMA.calculate({ period: 15, values: closes });
    const rsi = RSI.calculate({ period: 14, values: closes });

    const stochastic = Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
      signalPeriod: 3,
    });
    const stochasticK = stochastic.length ? stochastic.map(s => s.k) : [];

    const macd = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });

    const levels = findSupportResistance(candles);

    const trend = analyzeTrend(sma5, sma15);
    const indicatorsAnalysis = analyzeIndicators(rsi, stochasticK, macd);
    const recommendation = generateTradeRecommendations(trend, rsi, stochasticK, macd, closes, levels);

    const analysisText = `${trend}\n\n${indicatorsAnalysis}\n\n` +
      `Поддержка: ${levels.supports.length ? levels.supports.map(l => l.toFixed(2)).join(', ') : 'нет'}\n` +
      `Сопротивление: ${levels.resistances.length ? levels.resistances.map(l => l.toFixed(2)).join(', ') : 'нет'}\n\n` +
      `${recommendation}`;

    const chartBuffer = await generateChartImage(candles, symbol, timeframe, levels, sma5, sma15);

    await ctx.replyWithPhoto(
      { source: chartBuffer },
      { caption: analysisText }
    );
  } catch (error) {
    console.error(error);
    await ctx.reply('Ошибка при анализе данных.');
  }
});

// Экспорт webhook handler для Vercel
export default bot.webhookCallback('/api/telegram');
