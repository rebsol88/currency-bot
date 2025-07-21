import { Telegraf } from 'telegraf';
import axios from 'axios';
import {
  SMA,
  RSI,
  Stochastic,
  MACD,
} from 'technicalindicators';

const bot = new Telegraf(process.env.BOT_TOKEN);

// Заглушка получения свечей - замените на реальный источник
async function fetchCandles(symbol, timeframe) {
  const now = Date.now();
  const candles = [];
  for (let i = 100; i > 0; i--) {
    const close = 100 + Math.sin(i / 10) * 10 + Math.random() * 2;
    const high = close + Math.random() * 2;
    const low = close - Math.random() * 2;
    const open = close + (Math.random() - 0.5) * 2;
    candles.push({
      time: now - i * 60000,
      open,
      high,
      low,
      close,
      volume: 1000 + Math.random() * 100,
    });
  }
  return candles;
}

// Примитивный поиск уровней поддержки/сопротивления (локальные минимумы/максимумы)
function findSupportResistance(candles) {
  const closes = candles.map(c => c.close);
  const supports = [];
  const resistances = [];

  // Ищем локальные минимумы и максимумы
  for (let i = 2; i < closes.length - 2; i++) {
    if (
      closes[i] < closes[i - 1] &&
      closes[i] < closes[i + 1] &&
      closes[i] < closes[i - 2] &&
      closes[i] < closes[i + 2]
    ) {
      supports.push(closes[i]);
    }
    if (
      closes[i] > closes[i - 1] &&
      closes[i] > closes[i + 1] &&
      closes[i] > closes[i - 2] &&
      closes[i] > closes[i + 2]
    ) {
      resistances.push(closes[i]);
    }
  }

  // Возьмем по 2 наиболее значимых (например, самые низкие поддержки и самые высокие сопротивления)
  supports.sort((a, b) => a - b);
  resistances.sort((a, b) => b - a);

  return {
    supports: supports.slice(0, 2),
    resistances: resistances.slice(0, 2),
  };
}

// Анализ тренда по SMA
function analyzeTrend(smaShort, smaLong) {
  if (smaShort.length === 0 || smaLong.length === 0) return 'Нет данных для анализа тренда';

  const lastShort = smaShort[smaShort.length - 1];
  const lastLong = smaLong[smaLong.length - 1];

  if (lastShort > lastLong) return 'Тренд: бычий (рост)';
  if (lastShort < lastLong) return 'Тренд: медвежий (падение)';
  return 'Тренд: неопределённый';
}

// Анализ индикаторов
function analyzeIndicators(rsi, stochasticK, macd) {
  let rsiSignal = '';
  if (rsi[rsi.length - 1] > 70) rsiSignal = 'RSI: перекупленность (возможна коррекция)';
  else if (rsi[rsi.length - 1] < 30) rsiSignal = 'RSI: перепроданность (возможен рост)';
  else rsiSignal = `RSI: нейтрально (${rsi[rsi.length - 1].toFixed(1)})`;

  let stochasticSignal = '';
  const k = stochasticK[stochasticK.length - 1];
  if (k > 80) stochasticSignal = 'Стохастик: перекупленность';
  else if (k < 20) stochasticSignal = 'Стохастик: перепроданность';
  else stochasticSignal = `Стохастик: нейтрально (${k.toFixed(1)})`;

  let macdSignal = '';
  const macdVal = macd[macd.length - 1];
  if (macdVal.MACD > macdVal.signal) macdSignal = 'MACD: бычий сигнал';
  else macdSignal = 'MACD: медвежий сигнал';

  return [rsiSignal, stochasticSignal, macdSignal].join('\n');
}

async function generateChartQuickChart(candles, symbol, timeframe, analysis, sma5, sma15) {
  const labels = candles.map(c => new Date(c.time).toLocaleTimeString());
  const prices = candles.map(c => c.close);

  // Преобразуем SMA в формат для графика (сдвинем, чтобы совпадали с ценами)
  // SMA короче, поэтому сделаем пустые значения в начале
  const sma5Full = Array(candles.length - sma5.length).fill(null).concat(sma5);
  const sma15Full = Array(candles.length - sma15.length).fill(null).concat(sma15);

  // Формируем аннотации для уровней поддержки и сопротивления
  const annotations = {};
  analysis.supports.forEach((level, i) => {
    annotations[`support${i}`] = {
      type: 'line',
      yMin: level,
      yMax: level,
      borderColor: 'green',
      borderWidth: 2,
      label: {
        content: `Support ${i + 1}`,
        enabled: true,
        position: 'start',
        backgroundColor: 'rgba(0,128,0,0.5)',
      },
    };
  });
  analysis.resistances.forEach((level, i) => {
    annotations[`resistance${i}`] = {
      type: 'line',
      yMin: level,
      yMax: level,
      borderColor: 'red',
      borderWidth: 2,
      label: {
        content: `Resistance ${i + 1}`,
        enabled: true,
        position: 'start',
        backgroundColor: 'rgba(255,0,0,0.5)',
      },
    };
  });

  const chartConfig = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `${symbol} Close Price`,
          data: prices,
          borderColor: 'rgba(33, 150, 243, 1)',
          backgroundColor: 'rgba(33, 150, 243, 0.2)',
          fill: true,
          tension: 0.1,
        },
        {
          label: 'SMA 5',
          data: sma5Full,
          borderColor: 'orange',
          fill: false,
          tension: 0.1,
        },
        {
          label: 'SMA 15',
          data: sma15Full,
          borderColor: 'purple',
          fill: false,
          tension: 0.1,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `${symbol} (${timeframe})`,
          font: { size: 18 },
        },
        annotation: {
          annotations,
        },
      },
      scales: {
        x: { display: true },
        y: { display: true },
      },
    },
  };

  const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
  const url = `https://quickchart.io/chart?c=${encodedConfig}&format=png&width=900&height=500`;

  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data, 'binary');
}

bot.command('analyze', async (ctx) => {
  try {
    const args = ctx.message.text.split(' ');
    const symbol = args[1] || 'BTCUSDT';
    const timeframe = args[2] || '1m';

    const candles = await fetchCandles(symbol, timeframe);
    if (!candles || candles.length === 0) {
      return ctx.reply('Не удалось получить данные по свечам.');
    }

    // Закрытия для индикаторов
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    // Индикаторы
    const sma5 = SMA.calculate({ period: 5, values: closes });
    const sma15 = SMA.calculate({ period: 15, values: closes });
    const rsi = RSI.calculate({ period: 14, values: closes });
    const stochasticInput = {
      high: highs,
      low: lows,
      close: closes,
      period: 14,
      signalPeriod: 3,
    };
    const stochastic = Stochastic.calculate(stochasticInput);
    const macdInput = {
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    };
    const macd = MACD.calculate(macdInput);

    // Уровни поддержки/сопротивления
    const levels = findSupportResistance(candles);

    // Анализ
    const trend = analyzeTrend(sma5, sma15);
    const indicatorsAnalysis = analyzeIndicators(rsi, stochastic.map(s => s.k), macd);

    const analysisText = `${trend}\n\n${indicatorsAnalysis}\n\n` +
      `Поддержка: ${levels.supports.map(l => l.toFixed(2)).join(', ')}\n` +
      `Сопротивление: ${levels.resistances.map(l => l.toFixed(2)).join(', ')}`;

    // Генерация графика
    const chartBuffer = await generateChartQuickChart(candles, symbol, timeframe, levels, sma5, sma15);

    await ctx.replyWithPhoto(
      { source: chartBuffer },
      { caption: analysisText, parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error(error);
    await ctx.reply('Ошибка при анализе данных.');
  }
});

bot.launch();

console.log('Бот запущен');
