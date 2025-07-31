import { Telegraf, session } from 'telegraf';
import fetch from 'node-fetch';
import Tesseract from 'tesseract.js'; // НЕ @tesseract.js!
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import annotationPlugin from 'chartjs-plugin-annotation';

const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const width = 800;
const height = 600;

const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width, height,
  chartCallback: ChartJS => ChartJS.register(annotationPlugin),
});

const worker = Tesseract.createWorker(); // без параметров!

(async () => {
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  console.log('OCR воркер готов');
})().catch(console.error);

async function recognizeText(buffer) {
  if (!worker) throw new Error('OCR worker не готов');
  const { data: { text } } = await worker.recognize(buffer);
  return text;
}

function parsePairAndPrice(text) {
  const pairMatch = text.toUpperCase().match(/([A-Z]{3})[\/\-]?([A-Z]{3})/);
  if (!pairMatch) return null;
  const pair = pairMatch[1] + pairMatch[2];
  const priceMatch = text.match(/\d+\.\d{3,6}/);
  if (!priceMatch) return null;
  const price = parseFloat(priceMatch[0]);
  return { pair, price };
}

bot.on('photo', async ctx => {
  try {
    await ctx.reply('Обрабатываю скриншот, подождите...');
    const photos = ctx.message.photo;
    const fileId = photos[photos.length - 1].file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);

    const response = await fetch(fileLink.href);
    const buffer = await response.buffer();

    const text = await recognizeText(buffer);
    console.log('Распознанный текст:', text);

    const parsed = parsePairAndPrice(text);
    if (!parsed) {
      await ctx.reply('Не удалось распознать пару или цену. Попробуйте другой скриншот.');
      return;
    }

    const { pair, price } = parsed;
    await ctx.reply(`Пара: ${pair}\nЦена: ${price}`);
  } catch (e) {
    console.error(e);
    await ctx.reply('Ошибка при обработке скриншота.');
  }
});

bot.start((ctx) => ctx.reply('Привет! Отправьте скриншот графика с валютной парой для анализа.'));

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
