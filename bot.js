import { Telegraf, session } from 'telegraf';
import fetch from 'node-fetch';
import { createWorker } from 'tesseract.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import annotationPlugin from 'chartjs-plugin-annotation';

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

// Инициализация OCR
const worker = createWorker();

async function initWorker() {
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
}
initWorker().catch(console.error);

// Функция распознавания текста из буфера
async function recognizeTextFromBuffer(buffer) {
  const { data: { text } } = await worker.recognize(buffer);
  return text;
}

// Аналитические функции (SMA для примера)
function calculateSMA(data, period) {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((a,b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

// Формируем упрощённые данные OHLC из цены
function buildSimpleOHLC(price, count = 100) {
  const now = Date.now();
  const intervalMs = 60 * 60 * 1000; // 1 час
  const data = [];
  for(let i = 0; i < count; i++) {
    const time = now - intervalMs * (count - i);
    data.push({
      openTime: time,
      open: price,
      high: price * 1.001,
      low: price * 0.999,
      close: price,
      volume: 100,
      closeTime: time + intervalMs - 1,
    });
  }
  return data;
}

// Генерация графика
async function generateChartImage(klines, sma5) {
  const labels = klines.map(k => new Date(k.openTime).toISOString().substr(11, 5));
  const closePrices = klines.map(k => k.close);

  const configuration = {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Close Price', data: closePrices, borderColor: 'black', fill: false },
        { label: 'SMA 5', data: sma5, borderColor: 'limegreen', fill: false },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { position: 'top' },
      },
      scales: {
        y: { beginAtZero: false },
      },
    },
  };
  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

// Простой парсер пары и цены из текста
function parsePriceAndPair(text) {
  const pairMatch = text.toUpperCase().match(/([A-Z]{3})[\/\-]?([A-Z]{3})/);
  if (!pairMatch) return null;
  const pair = pairMatch[1] + pairMatch[2];
  const priceMatch = text.match(/\d+\.\d{3,6}/);
  if (!priceMatch) return null;
  const price = parseFloat(priceMatch[0]);
  return { pair, price };
}

// Обработка фото от пользователя
bot.on('photo', async (ctx) => {
  try {
    await ctx.reply('Получаю ваш скриншот, обрабатываю — подождите пару секунд...');
    const photos = ctx.message.photo;
    const fileId = photos[photos.length - 1].file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await fetch(fileLink.href);
    const buffer = await response.buffer();

    const text = await recognizeTextFromBuffer(buffer);
    console.log('Распознанный текст:', text);

    const parsed = parsePriceAndPair(text);
    if (!parsed) {
      await ctx.reply('Не удалось распознать валютную пару или цену. Попробуйте отправить скриншот получше.');
      return;
    }
    const { pair, price } = parsed;

    await ctx.reply(`Ваша пара: ${pair}, цена: ${price}`);

    const klines = buildSimpleOHLC(price);
    const closes = klines.map(k => k.close);
    const sma5 = calculateSMA(closes, 5);

    const chartBuffer = await generateChartImage(klines, sma5);

    await ctx.replyWithPhoto({ source: chartBuffer }, {
      caption: `Анализ по паре ${pair} на основе скриншота.\nSMA(5) около ${sma5[sma5.length -1]?.toFixed(5) || 'N/A'}`,
    });

  } catch (error) {
    console.error('Ошибка обработки скриншота', error);
    await ctx.reply('Произошла ошибка при обработке скриншота.');
  }
});

bot.start(ctx => ctx.reply('Привет! Отправьте скриншот графика с котировками для анализа.'));

bot.launch();
console.log('Бот запущен');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
