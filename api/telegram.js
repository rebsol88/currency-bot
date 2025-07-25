import { Telegraf, Markup } from 'telegraf';
import { session } from 'telegraf-session-local'; // Добавляем модуль для сессий
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';
import axios from 'axios';

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const ALPHA_VANTAGE_API_KEY = '58LT2IYE0RQUOX8Z'; // Ваш ключ от Alpha Vantage
const bot = new Telegraf(BOT_TOKEN);

// Настройка сессий с использованием telegraf-session-local
const LocalSession = session({
  database: 'sessions.json', // Файл для хранения сессий (можно убрать для хранения в памяти)
});
bot.use(LocalSession.middleware());

// Регистрируем плагин аннотаций для Chart.js
Chart.register(annotationPlugin);

// --- Многоязычные тексты и данные ---
const languages = {
  ru: {
    texts: {
      chooseLanguage: 'Выберите язык / Choose language',
      choosePair: 'Выберите валютную пару:',
      chooseTimeframe: 'Выберите таймфрейм:',
      pleaseChoosePairFirst: 'Пожалуйста, сначала выберите валютную пару.',
      analysisStarting: (pair, timeframe) =>
        `Начинаю анализ для ${pair} на таймфрейме ${timeframe}...`,
      resistance: 'Сопротивление',
      support: 'Поддержка',
      trend: 'Тренд',
      volatility: 'Волатильность',
      prediction: 'Прогноз на следующую свечу',
      unknownCmd: 'Неизвестная команда. Пожалуйста, выберите валютную пару или таймфрейм.',
    },
    pairsMain: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'],
    pairsOTC: ['EURUSD-OTC', 'GBPUSD-OTC', 'USDJPY-OTC'],
    timeframes: [
      { label: '1 минута', value: '1m', interval: '1min' },
      { label: '5 минут', value: '5m', interval: '5min' },
      { label: '15 минут', value: '15m', interval: '15min' },
      { label: '1 час', value: '1h', interval: '60min' },
    ],
  },
  en: {
    texts: {
      chooseLanguage: 'Choose language / Выберите язык',
      choosePair: 'Choose a currency pair:',
      chooseTimeframe: 'Choose a timeframe:',
      pleaseChoosePairFirst: 'Please choose a currency pair first.',
      analysisStarting: (pair, timeframe) =>
        `Starting analysis for ${pair} on ${timeframe} timeframe...`,
      resistance: 'Resistance',
      support: 'Support',
      trend: 'Trend',
      volatility: 'Volatility',
      prediction: 'Prediction for the next candle',
      unknownCmd: 'Unknown command. Please choose a currency pair or timeframe.',
    },
    pairsMain: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'],
    pairsOTC: ['EURUSD-OTC', 'GBPUSD-OTC', 'USDJPY-OTC'],
    timeframes: [
      { label: '1 minute', value: '1m', interval: '1min' },
      { label: '5 minutes', value: '5m', interval: '5min' },
      { label: '15 minutes', value: '15m', interval: '15min' },
      { label: '1 hour', value: '1h', interval: '60min' },
    ],
  },
};

// Отображаемые имена для валютных пар
const displayNames = {
  EURUSD: { ru: 'EUR/USD', en: 'EUR/USD' },
  GBPUSD: { ru: 'GBP/USD', en: 'GBP/USD' },
  USDJPY: { ru: 'USD/JPY', en: 'USD/JPY' },
  AUDUSD: { ru: 'AUD/USD', en: 'AUD/USD' },
  'EURUSD-OTC': { ru: 'EUR/USD (OTC)', en: 'EUR/USD (OTC)' },
  'GBPUSD-OTC': { ru: 'GBP/USD (OTC)', en: 'GBP/USD (OTC)' },
  'USDJPY-OTC': { ru: 'USD/JPY (OTC)', en: 'USD/JPY (OTC)' },
};

// Базовые значения цен для OTC-пар (для синтетических данных)
const otcBasePrices = {
  'EURUSD-OTC': 1.05,
  'GBPUSD-OTC': 1.25,
  'USDJPY-OTC': 135.0,
};

// --- Функции для получения данных ---
async function fetchData(pair, timeframe) {
  if (pair.includes('-OTC')) {
    return generateOTCData(pair, timeframe);
  }
  try {
    const symbol = pair.replace('/', '');
    const interval = timeframe.interval;
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await axios.get(url);
    const data = response.data[`Time Series (${interval})`];
    if (!data) {
      throw new Error('No data available');
    }
    const candles = Object.entries(data)
      .map(([time, values]) => ({
        time: new Date(time).getTime() / 1000,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
      }))
      .sort((a, b) => a.time - b.time);
    return candles.slice(-50); // Ограничиваем до 50 свечей для анализа
  } catch (error) {
    console.error(`Error fetching data for ${pair}:`, error.message);
    return generateFallbackData(pair, timeframe);
  }
}

function generateOTCData(pair, timeframe) {
  const basePrice = otcBasePrices[pair] || 1.0;
  const candles = [];
  const volatilityMultiplier = {
    '1min': 0.0003,
    '5min': 0.0005,
    '15min': 0.0008,
    '60min': 0.001,
  }[timeframe.interval];

  let currentPrice = basePrice;
  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = {
    '1min': 60,
    '5min': 300,
    '15min': 900,
    '60min': 3600,
  }[timeframe.interval];

  for (let i = 50; i >= 0; i--) {
    const time = now - i * intervalSeconds;
    const variation = (Math.random() - 0.5) * 2 * volatilityMultiplier;
    currentPrice += variation;

    const open = currentPrice + (Math.random() - 0.5) * volatilityMultiplier;
    const close = currentPrice + (Math.random() - 0.5) * volatilityMultiplier;
    const high = Math.max(open, close) + Math.random() * volatilityMultiplier;
    const low = Math.min(open, close) - Math.random() * volatilityMultiplier;

    candles.push({
      time,
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
    });
  }
  return candles;
}

function generateFallbackData(pair, timeframe) {
  return generateOTCData(pair, timeframe); // Используем ту же логику для запасных данных
}

// --- Анализ данных и прогнозы ---
function analyzeData(candles) {
  if (!candles || candles.length === 0) {
    return { resistance: 0, support: 0, trend: 'N/A', volatility: 0, prediction: 'N/A' };
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  const resistance = Math.max(...highs.slice(-20));
  const support = Math.min(...lows.slice(-20));

  const lastCloses = closes.slice(-5);
  const trend = lastCloses.every((c, i) => i === 0 || c > lastCloses[i - 1])
    ? 'Bullish'
    : lastCloses.every((c, i) => i === 0 || c < lastCloses[i - 1])
    ? 'Bearish'
    : 'Sideways';

  const volatility = (
    (Math.max(...highs.slice(-10)) - Math.min(...lows.slice(-10))) /
    closes[closes.length - 1]
  ).toFixed(4);

  const lastClose = closes[closes.length - 1];
  const prediction =
    trend === 'Bullish'
      ? (lastClose * 1.002).toFixed(5)
      : trend === 'Bearish'
      ? (lastClose * 0.998).toFixed(5)
      : lastClose.toFixed(5);

  return { resistance, support, trend, volatility, prediction };
}

// --- Генерация графика ---
async function generateChart(candles, pair, timeframe, lang) {
  if (!candles || candles.length === 0) {
    return null;
  }
  const width = 800;
  const height = 600;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const resistance = Math.max(...highs.slice(-20));
  const support = Math.min(...lows.slice(-20));

  const configuration = {
    type: 'candlestick',
    data: {
      datasets: [
        {
          label: pair,
          data: candles.map((c) => ({
            x: new Date(c.time * 1000),
            o: c.open,
            h: c.high,
            l: c.low,
            c: c.close,
          })),
          borderColor: 'rgba(0, 0, 0, 1)',
          backgroundColor: candles.map((c) =>
            c.close > c.open ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)'
          ),
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: timeframe.value === '1m' ? 'minute' : timeframe.value === '1h' ? 'hour' : 'minute',
          },
          title: { display: true, text: 'Time' },
        },
        y: {
          title: { display: true, text: 'Price' },
          beginAtZero: false,
        },
      },
      plugins: {
        title: {
          display: true,
          text: `${pair} - ${timeframe.label}`,
        },
        annotation: {
          annotations: {
            resistance: {
              type: 'line',
              mode: 'horizontal',
              scaleID: 'y',
              value: resistance,
              borderColor: 'red',
              borderWidth: 2,
              label: {
                content: lang === 'ru' ? 'Сопротивление' : 'Resistance',
                enabled: true,
                position: 'right',
              },
            },
            support: {
              type: 'line',
              mode: 'horizontal',
              scaleID: 'y',
              value: support,
              borderColor: 'green',
              borderWidth: 2,
              label: {
                content: lang === 'ru' ? 'Поддержка' : 'Support',
                enabled: true,
                position: 'right',
              },
            },
          },
        },
      },
    },
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  return buffer;
}

// --- Выполнение анализа и отправка результата ---
async function performAnalysis(ctx) {
  const { selectedPair, selectedTimeframe, lang } = ctx.session;
  const texts = languages[lang].texts;
  const pairDisplay = displayNames[selectedPair][lang];

  try {
    const candles = await fetchData(selectedPair, selectedTimeframe);
    const analysis = analyzeData(candles);
    const chartBuffer = await generateChart(candles, pairDisplay, selectedTimeframe, lang);

    let message = `${texts.analysisStarting(pairDisplay, selectedTimeframe.label)}\n\n`;
    message += `${texts.resistance}: ${analysis.resistance.toFixed(5)}\n`;
    message += `${texts.support}: ${analysis.support.toFixed(5)}\n`;
    message += `${texts.trend}: ${analysis.trend}\n`;
    message += `${texts.volatility}: ${(analysis.volatility * 100).toFixed(2)}%\n`;
    message += `${texts.prediction}: ${analysis.prediction}\n`;

    if (chartBuffer) {
      await ctx.replyWithPhoto({ source: chartBuffer }, { caption: message });
    } else {
      await ctx.reply(message);
    }
  } catch (error) {
    console.error('Analysis error:', error);
    await ctx.reply(`Error during analysis: ${error.message}`);
  }
}

// --- Обработчики команд бота ---
bot.start((ctx) => {
  const keyboard = Markup.keyboard([
    ['Русский', 'English'],
  ]).resize();
  ctx.reply(languages.ru.texts.chooseLanguage, keyboard);
});

bot.hears(['Русский', 'English'], (ctx) => {
  const lang = ctx.message.text === 'Русский' ? 'ru' : 'en';
  // Убедимся, что session существует
  if (!ctx.session) {
    ctx.session = {};
  }
  ctx.session.lang = lang;
  const texts = languages[lang].texts;
  const pairs = [...languages[lang].pairsMain, ...languages[lang].pairsOTC];
  const keyboard = Markup.keyboard(
    pairs.map((p) => displayNames[p][lang])
  ).resize();
  ctx.reply(texts.choosePair, keyboard);
});

bot.on('text', async (ctx) => {
  // Проверяем, существует ли session и lang
  if (!ctx.session) {
    ctx.session = {};
  }
  if (!ctx.session.lang) {
    ctx.reply(languages.ru.texts.chooseLanguage);
    return;
  }
  const lang = ctx.session.lang;
  const texts = languages[lang].texts;
  const inputText = ctx.message.text;

  // Проверяем, выбрана ли валютная пара
  const allPairs = [...languages[lang].pairsMain, ...languages[lang].pairsOTC];
  const selectedPair = allPairs.find((p) => displayNames[p][lang] === inputText);
  if (selectedPair) {
    ctx.session.selectedPair = selectedPair;
    const keyboard = Markup.keyboard(
      languages[lang].timeframes.map((tf) => tf.label)
    ).resize();
    ctx.reply(texts.chooseTimeframe, keyboard);
    return;
  }

  // Проверяем, выбран ли таймфрейм
  const selectedTimeframe = languages[lang].timeframes.find(
    (tf) => tf.label === inputText
  );
  if (selectedTimeframe) {
    if (!ctx.session.selectedPair) {
      ctx.reply(texts.pleaseChoosePairFirst);
      return;
    }
    ctx.session.selectedTimeframe = selectedTimeframe;
    await ctx.reply(
      texts.analysisStarting(
        displayNames[ctx.session.selectedPair][lang],
        selectedTimeframe.label
      )
    );
    await performAnalysis(ctx);
    return;
  }

  ctx.reply(texts.unknownCmd);
});

// --- Запуск бота ---
bot.launch().then(() => {
  console.log('Bot started successfully');
}).catch((err) => {
  console.error('Failed to start bot:', err);
});

// Обработка graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
