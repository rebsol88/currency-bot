import { Telegraf, session } from 'telegraf';
import fetch from 'node-fetch';
import { createWorker } from 'tesseract.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import annotationPlugin from 'chartjs-plugin-annotation';

const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width, height,
  chartCallback: (ChartJS) => { ChartJS.register(annotationPlugin); }
});

const worker = createWorker();

async function initOCR() {
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
}
initOCR().catch(console.error);

async function recognizeText(buffer) {
  const { data: { text } } = await worker.recognize(buffer);
  return text;
}

function calculateSMA(data, period) {
  const sma = [];
  for (let i=0; i<data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
      continue;
    }
    const sum = data.slice(i-period+1, i+1).reduce((a,b) => a+b, 0);
    sma.push(sum/period);
  }
  return sma;
}

function buildOHLC(price, count=100) {
  const now = Date.now();
  const intervalMs = 3600000;
  let arr = [];
  for(let i=0; i<count; i++) {
    let time = now - intervalMs * (count - i);
    arr.push({
      openTime: time,
      open: price,
      high: price*1.001,
      low: price*0.999,
      close: price,
      volume: 100,
      closeTime: time + intervalMs - 1
    });
  }
  return arr;
}

async function generateChart(klines, sma5) {
  const labels = klines.map(k => new Date(k.openTime).toISOString().substr(11,5));
  const closePrices = klines.map(k => k.close);
  const config = {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Close Price', data: closePrices, borderColor: 'black', fill: false },
        { label: 'SMA 5', data: sma5, borderColor: 'limegreen', fill: false }
      ]
    },
    options: {
      responsive: false,
      plugins: { legend: { position: 'top' }},
      scales: { y: { beginAtZero: false }}
    }
  };
  return await chartJSNodeCanvas.renderToBuffer(config);
}

function parsePairAndPrice(text) {
  const pairMatch = text.toUpperCase().match(/([A-Z]{3})[\/\-]?([A-Z]{3})/);
  if(!pairMatch) return null;
  const pair = pairMatch[1] + pairMatch[2];
  const priceMatch = text.match(/\d+\.\d{3,6}/);
  if(!priceMatch) return null;
  const price = parseFloat(priceMatch[0]);
  return { pair, price };
}

bot.on('photo', async ctx => {
  try {
    await ctx.reply('Обрабатываю скриншот, подождите...');
    const photos = ctx.message.photo;
    const fileId = photos[photos.length-1].file_id;
    const fileUrl = await ctx.telegram.getFileLink(fileId);
    const resp = await fetch(fileUrl.href);
    const buffer = await resp.buffer();

    const text = await recognizeText(buffer);
    console.log('Распознанный текст:', text);

    const parsed = parsePairAndPrice(text);
    if(!parsed) {
      await ctx.reply('Невозможно распознать пару или цену. Попробуйте другой скриншот.');
      return;
    }
    const { pair, price } = parsed;
    await ctx.reply(`Пара: ${pair}, Цена: ${price}`);

    const klines = buildOHLC(price);
    const closes = klines.map(k => k.close);
    const sma5 = calculateSMA(closes, 5);
    const imgBuffer = await generateChart(klines, sma5);

    await ctx.replyWithPhoto({ source: imgBuffer }, { caption: `Анализ для ${pair}\nSMA(5): ${sma5[sma5.length-1]?.toFixed(5) || 'N/A'}` });

  } catch (e) {
    console.error(e);
    await ctx.reply('Ошибка при обработке изображения.');
  }
});

bot.start(ctx => ctx.reply('Привет! Отправьте скриншот графика с парой и ценой.'));

bot.launch();
console.log('Бот запущен');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
