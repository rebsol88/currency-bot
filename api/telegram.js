import { Telegraf, Markup } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

if (!process.env.BOT_TOKEN) {
  console.error('Ошибка: BOT_TOKEN не задана в переменных окружения');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const userSessions = new Map();

function parseAndValidateSymbol(text) {
  if (!text) return null;
  let cleaned = text.toUpperCase().replace(/\s+/g, '');
  let otc = false;
  if (cleaned.endsWith('OTC')) {
    otc = true;
    cleaned = cleaned.slice(0, -3);
  }
  const parts = cleaned.split('/');
  if (parts.length !== 2) return null;
  const [base, quote] = parts;
  if (!base.match(/^[A-Z]{3,}$/) || !quote.match(/^[A-Z]{3,}$/)) return null;
  return { base, quote, otc };
}

function getTimeframeKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('1 мин', 'tf_1m'), Markup.button.callback('5 мин', 'tf_5m')],
    [Markup.button.callback('15 мин', 'tf_15m'), Markup.button.callback('1 час', 'tf_1h')],
    [Markup.button.callback('4 часа', 'tf_4h'), Markup.button.callback('1 день', 'tf_1d')],
  ]);
}

function generateFakePriceData(timeframe) {
  const pointsMap = {
    '1m': 50,
    '5m': 50,
    '15m': 40,
    '1h': 30,
    '4h': 20,
    '1d': 15,
  };
  const count = pointsMap[timeframe] || 30;
  let basePrice = 1 + Math.random();

  const data = [];
  for (let i = 0; i < count; i++) {
    basePrice += (Math.random() - 0.5) * 0.02;
    basePrice = Math.max(0.5, basePrice);
    data.push(parseFloat(basePrice.toFixed(4)));
  }
  return data;
}

function calculateSMA(data, period) {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    sma.push(parseFloat((sum / period).toFixed(4)));
  }
  return sma;
}

function generateAnalysis(smaShort, smaLong) {
  const lastShort = smaShort.filter(v => v !== null).slice(-1)[0];
  const lastLong = smaLong.filter(v => v !== null).slice(-1)[0];

  if (lastShort === undefined || lastLong === undefined) {
    return 'Недостаточно данных для анализа.';
  }

  if (lastShort > lastLong) {
    return `Последние значения SMA(5): ${lastShort}\nSMA(15): ${lastLong}\nТренд восходящий. Рекомендуется рассматривать покупки.`;
  } else if (lastShort < lastLong) {
    return `Последние значения SMA(5): ${lastShort}\nSMA(15): ${lastLong}\nТренд нисходящий. Рекомендуется рассматривать продажи.`;
  } else {
    return `Последние значения SMA(5): ${lastShort}\nSMA(15): ${lastLong}\nТренд нейтральный. Рекомендуется подождать подтверждения.`;
  }
}

async function generateChart(prices, sma5, sma15) {
  const width = 700;
  const height = 400;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

  const labels = prices.map((_, i) => i + 1);

  const configuration = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Цена',
          data: prices,
          borderColor: 'blue',
          fill: false,
          tension: 0.1,
          pointRadius: 0,
        },
        {
          label: 'SMA 5',
          data: sma5,
          borderColor: 'green',
          fill: false,
          tension: 0.1,
          spanGaps: true,
          pointRadius: 0,
        },
        {
          label: 'SMA 15',
          data: sma15,
          borderColor: 'red',
          fill: false,
          tension: 0.1,
          spanGaps: true,
          pointRadius: 0,
        },
      ],
    },
    options: {
      plugins: {
        legend: { position: 'top' },
      },
      scales: {
        x: {
          title: { display: true, text: 'Период' },
        },
        y: {
          title: { display: true, text: 'Цена' },
          beginAtZero: false,
        },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

bot.start((ctx) => {
  ctx.reply('Привет! Введите валютную пару, например: AUD/CAD или AUD/CAD OTC');
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const symbol = parseAndValidateSymbol(text);
  if (!symbol) {
    return ctx.reply('Неверный формат валютной пары. Пример: AUD/CAD или AUD/CAD OTC');
  }
  userSessions.set(ctx.from.id, { symbol });
  await ctx.reply(
    `Вы выбрали пару: ${symbol.base}/${symbol.quote}${symbol.otc ? ' OTC' : ''}\nВыберите таймфрейм:`,
    getTimeframeKeyboard()
  );
});

bot.action(/tf_(.+)/, async (ctx) => {
  const timeframe = ctx.match[1];
  const session = userSessions.get(ctx.from.id);
  if (!session || !session.symbol) {
    return ctx.reply('Пожалуйста, сначала введите валютную пару.');
  }

  await ctx.answerCbQuery();

  const prices = generateFakePriceData(timeframe);
  const sma5 = calculateSMA(prices, 5);
  const sma15 = calculateSMA(prices, 15);

  const analysisText = generateAnalysis(sma5, sma15);

  const chartBuffer = await generateChart(prices, sma5, sma15);

  await ctx.reply(
    `Анализ для пары ${session.symbol.base}/${session.symbol.quote}${session.symbol.otc ? ' OTC' : ''} на таймфрейме ${timeframe}:\n\n${analysisText}`
  );

  await ctx.replyWithPhoto({ source: chartBuffer });

  userSessions.delete(ctx.from.id);
});

bot.launch().then(() => {
  console.log('Бот запущен');
});

// graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
