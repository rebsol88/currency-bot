import { Telegraf, Markup, session } from 'telegraf';
import fetch from 'node-fetch';
import { createWorker } from 'tesseract.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';

// --- Настройки ---
const BOT_TOKEN = 'ВАШ_ТОКЕН_ЗДЕСЬ';

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

// OCR worker
const worker = createWorker({
  logger: m => console.log(m), // Уберите, если не нужно логирование
});

async function recognizeTextFromBuffer(buffer) {
  await worker.load();
  await worker.loadLanguage('eng');  // Можно добавить 'rus' если нужно русский
  await worker.initialize('eng');
  const { data: { text } } = await worker.recognize(buffer);
  await worker.terminate();
  return text;
}

// --- Аналитические функции (пример SMA) ---

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

// Добавьте сюда остальные функции анализа (RSI, MACD, Stochastic и т.п.) по аналогии с вашим кодом
// Чтобы не делать ответ слишком длинным, здесь пример SMA, остальные — из вашего кода

// --- Функция построения упрощенных OHLC из цены (для демонстрации) ---
function buildSimpleOHLC(price, count = 100) {
  const now = Date.now();
  const intervalMs = 60 * 60 * 1000; // 1 час, можно изменить под таймфрейм
  const data = [];
  for (let i = 0; i < count; i++) {
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

// --- Простая генерация графика (линейный график Close и SMA) ---
async function generateChartImage(klines, sma5) {
  const labels = klines.map(k => new Date(k.openTime).toISOString().substr(11, 5));
  const closePrices = klines.map(k => k.close);

  const configuration = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Close Price',
          data: closePrices,
          borderColor: 'black',
          fill: false,
        },
        {
          label: 'SMA 5',
          data: sma5,
          borderColor: 'limegreen',
          fill: false,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          position: 'top',
        },
      },
      scales: {
        y: { beginAtZero: false },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

// --- Парсер пары валют и цены из OCR текста ---
// Для демонстрации — очень простой парсер (вы можете усложнить)
function parsePriceAndPair(text) {
  // Пример парсинга валюной пары как "EURUSD" из текста (разрешим варианты EUR/USD, EUR-USD)
  const pairMatch = text.match(/([A-Z]{3})[\/\-]?([A-Z]{3})/);
  if (!pairMatch) return null;
  const pair = pairMatch[1] + pairMatch[2];

  // Найдем первое число с плавающей точкой, предположим цену
  const priceMatch = text.match(/\d+\.\d{3,6}/);
  if (!priceMatch) return null;

  const price = parseFloat(priceMatch[0]);
  return { pair, price };
}

// --- Бот принимает фото, анализирует и отвечает ---
bot.on('photo', async (ctx) => {
  try {
    await ctx.reply('Получаю ваш скриншот, обрабатываю — подождите пару секунд...');
    const photos = ctx.message.photo;
    const fileId = photos[photos.length - 1].file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await fetch(fileLink.href);
    const buffer = await response.buffer();

    const text = await recognizeTextFromBuffer(buffer);
    console.log('Распознанный текст с изображения:', text);

    const parsed = parsePriceAndPair(text);

    if (!parsed) {
      await ctx.reply('Не удалось распознать валютную пару или цену. Попробуйте другой скриншот.');
      return;
    }
    const { pair, price } = parsed;

    await ctx.reply(`Ваша пара: ${pair}, цена: ${price}`);

    // Формируем OHLC для дальнейшего анализа (простейшее заполнение)
    const klines = buildSimpleOHLC(price);

    // Анализируем (только SMA пример)
    const closes = klines.map(k => k.close);
    const sma5 = calculateSMA(closes, 5);

    // Генерируем график
    const chartBuffer = await generateChartImage(klines, sma5);

    // Отправляем график с комментом
    await ctx.replyWithPhoto({ source: chartBuffer }, {
      caption: `Анализ по паре ${pair} на основе присланного скриншота.\nSMA(5) около ${sma5[sma5.length -1]?.toFixed(5) || 'N/A'}`,
    });

  } catch (error) {
    console.error(error);
    await ctx.reply('Произошла ошибка при обработке скриншота.');
  }
});

// Старт и базовый обработчик команд
bot.start(ctx => ctx.reply('Привет! Отправьте мне скриншот графика с котировками, и я сделаю анализ.'));

// Запуск бота
bot.launch();
console.log('Бот запущен');

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
