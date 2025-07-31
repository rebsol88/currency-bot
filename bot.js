import { Telegraf, session } from 'telegraf';
import fetch from 'node-fetch';
import Tesseract from 'tesseract.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import annotationPlugin from 'chartjs-plugin-annotation';

const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const width = 800;
const height = 600;

const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  chartCallback: ChartJS => {
    ChartJS.register(annotationPlugin);
  },
});

const worker = Tesseract.createWorker();

(async () => {
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  console.log('OCR worker ready');
})().catch(console.error);

async function recognizeText(buffer) {
  if (!worker) throw new Error('OCR worker not ready');
  const { data: { text } } = await worker.recognize(buffer);
  return text;
}

// Ваша аналитика...

bot.on('photo', async ctx => {
  try {
    await ctx.reply('Обрабатываю скриншот...');
    const photoArray = ctx.message.photo;
    const fileId = photoArray[photoArray.length - 1].file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const res = await fetch(fileLink.href);
    const buffer = await res.buffer();

    const text = await recognizeText(buffer);
    console.log('OCR text:', text);

    // Разбор текста, анализ, генерация графика и ответ пользователю...

    await ctx.reply('Обработка завершена.');
  } catch (error) {
    console.error(error);
    await ctx.reply('Ошибка при обработке скриншота.');
  }
});

bot.start(ctx => ctx.reply('Привет! Отправьте скриншот с графиком для анализа.'));
bot.launch();
