import { Telegraf, Markup } from 'telegraf';
import fetch from 'node-fetch';

const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const bot = new Telegraf(BOT_TOKEN);

const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];

bot.start(async ctx => {
  const buttons = pairs.map(p => Markup.button.callback(p, p));
  await ctx.reply('Выберите валютную пару:', Markup.inlineKeyboard(buttons, { columns: 2 }));
});

bot.on('callback_query', async ctx => {
  const pair = ctx.callbackQuery.data;
  await ctx.answerCbQuery();

  const base = pair.substring(0, 3);
  const symbol = pair.substring(3);

  try {
    const res = await fetch(`https://api.exchangerate.host/latest?base=${base}&symbols=${symbol}`);
    const json = await res.json();
    const rate = json.rates[symbol];

    if (!rate) {
      await ctx.reply('Данные не найдены');
      return;
    }

    await ctx.reply(`Курс ${base}/${symbol} сейчас: ${rate.toFixed(6)}`);
  } catch (e) {
    console.error(e);
    await ctx.reply('Ошибка при получении данных.');
  }
});

bot.launch();
console.log('Бот запущен');
