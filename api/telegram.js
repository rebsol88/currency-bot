import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// Инициализация chartJSNodeCanvas с регистрацией плагина annotation
const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  chartCallback: (ChartJS) => {
    ChartJS.register(annotationPlugin);
  },
});

// --- Администраторы ---
const admins = [123456789, 987654321, 6824399168]; // Добавлен новый админ

function isAdmin(ctx) {
  return admins.includes(ctx.from.id);
}

// --- Лицензионные ключи ---
const licenseKeys = {
  // пример: 'ABCD-1234-EFGH-5678': { used: false, userId: null },
};

// --- Функция генерации ключа ---
function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let block = 0; block < 4; block++) {
    if (block > 0) key += '-';
    for (let i = 0; i < 4; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return key;
}

// --- Ваши существующие данные, функции и настройки ---
const languages = {
  ru: { /* ... ваш объект ru ... */ },
  en: { /* ... ваш объект en ... */ },
};
// ... остальной ваш код (displayNames, генерация OHLC, индикаторы и т.д.) ...

// --- Добавляем команды администратора ---

bot.command('genkey', async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.reply('Доступ запрещён.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  let count = 1;
  if (args.length > 0) {
    const parsed = parseInt(args[0], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
      count = parsed;
    } else {
      await ctx.reply('Укажите число от 1 до 20.');
      return;
    }
  }

  const newKeys = [];
  for (let i = 0; i < count; i++) {
    let key;
    do {
      key = generateLicenseKey();
    } while (licenseKeys[key]); // избегаем дубликатов

    licenseKeys[key] = { used: false, userId: null };
    newKeys.push(key);
  }

  await ctx.reply(`Сгенерированы ключи:\n${newKeys.join('\n')}`);
});

bot.command('listkeys', async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.reply('Доступ запрещён.');
    return;
  }

  if (Object.keys(licenseKeys).length === 0) {
    await ctx.reply('Ключи не найдены.');
    return;
  }

  let message = 'Список ключей:\n';
  for (const [key, info] of Object.entries(licenseKeys)) {
    message += `${key} — ${info.used ? `Использован (пользователь ${info.userId})` : 'Свободен'}\n`;
  }

  await ctx.reply(message);
});

bot.command('delkey', async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.reply('Доступ запрещён.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (args.length === 0) {
    await ctx.reply('Укажите ключ для удаления, например:\n/delkey ABCD-1234-EFGH-5678');
    return;
  }

  const key = args[0].toUpperCase();
  if (!licenseKeys[key]) {
    await ctx.reply('Такого ключа нет.');
    return;
  }

  delete licenseKeys[key];
  await ctx.reply(`Ключ ${key} удалён.`);
});

// --- Авторизация пользователя по ключу ---
// Добавьте в обработчик выбора языка запрос ключа и проверку

bot.action(/lang_(.+)/, async (ctx) => {
  const lang = ctx.match[1];
  if (!languages[lang]) {
    await ctx.answerCbQuery('Unsupported language');
    return;
  }
  ctx.session.lang = lang;
  ctx.session.authorized = false; // сброс авторизации

  await ctx.answerCbQuery();

  const prompt = lang === 'ru'
    ? 'Введите лицензионный ключ для активации бота:'
    : 'Please enter your license key to activate the bot:';

  await ctx.editMessageText(prompt);
});

// Обработка текстовых сообщений — проверка ключа, если не авторизован
bot.on('text', async (ctx) => {
  const lang = ctx.session.lang || 'ru';
  const texts = languages[lang].texts;

  if (!ctx.session.authorized) {
    const inputKey = ctx.message.text.trim().toUpperCase();

    if (licenseKeys[inputKey] && !licenseKeys[inputKey].used) {
      licenseKeys[inputKey].used = true;
      licenseKeys[inputKey].userId = ctx.from.id;
      ctx.session.authorized = true;

      await ctx.reply(lang === 'ru'
        ? 'Ключ принят! Вы успешно активировали бота. Теперь выберите валютную пару.'
        : 'Key accepted! You have successfully activated the bot. Now please choose a currency pair.');

      // Предлагаем выбор пары
      await sendPairSelection(ctx, lang);
    } else if (licenseKeys[inputKey] && licenseKeys[inputKey].userId === ctx.from.id) {
      // Пользователь уже активировал этот ключ
      ctx.session.authorized = true;
      await ctx.reply(lang === 'ru'
        ? 'Этот ключ уже активирован вами. Продолжаем работу.'
        : 'This key is already activated by you. Continuing.');

      await sendPairSelection(ctx, lang);
    } else {
      await ctx.reply(lang === 'ru'
        ? 'Неверный или уже использованный ключ. Пожалуйста, попробуйте ещё раз.'
        : 'Invalid or already used key. Please try again.');
    }
    return;
  }

  // Если пользователь авторизован — можно обрабатывать сообщения или игнорировать
  await ctx.reply(lang === 'ru'
    ? 'Пожалуйста, используйте кнопки для взаимодействия с ботом.'
    : 'Please use buttons to interact with the bot.');
});

// --- Ваша функция sendPairSelection, остальные обработчики и логика ---

// ... (весь остальной ваш код без изменений) ...

bot.launch();
console.log('Бот запущен и готов к работе');
