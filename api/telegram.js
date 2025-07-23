import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto/auto.js';
import annotationPlugin from 'chartjs-plugin-annotation';

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const bot = new Telegraf(BOT_TOKEN);

// Подключаем session middleware — обязательно до всех хендлеров
bot.use(session());

// Гарантируем, что ctx.session всегда объект
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {};
  return next();
});

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
const admins = [6824399168, 316971294]; // Добавлен новый админ

function isAdmin(ctx) {
  const id = ctx.from?.id;
  const result = admins.includes(id);
  console.log(`isAdmin check for ID ${id}: ${result}`);
  return result;
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

// --- Языковые данные ---
const languages = {
  ru: {
    texts: {
      start: 'Добро пожаловать! Пожалуйста, выберите язык:',
      enter_key: 'Введите лицензионный ключ для активации бота:',
      key_accepted: 'Ключ принят! Вы успешно активировали бота. Теперь выберите валютную пару.',
      key_already_used: 'Этот ключ уже активирован вами. Продолжаем работу.',
      key_invalid: 'Неверный или уже использованный ключ. Пожалуйста, попробуйте ещё раз.',
      use_buttons: 'Пожалуйста, используйте кнопки для взаимодействия с ботом.',
      access_denied: 'Доступ запрещён.',
      no_keys: 'Ключи не найдены.',
      specify_count: 'Укажите число от 1 до 20.',
      specify_key_del: 'Укажите ключ для удаления, например:\n/delkey ABCD-1234-EFGH-5678',
      key_deleted: (key) => `Ключ ${key} удалён.`,
      key_not_found: 'Такого ключа нет.',
      keys_generated: (keys) => `Сгенерированы ключи:\n${keys.join('\n')}`,
      keys_list_header: 'Список ключей:\n',
      keys_list_item: (key, info) => `${key} — ${info.used ? `Использован (пользователь ${info.userId})` : 'Свободен'}`,
      choose_lang: 'Выберите язык / Choose language',
    }
  },
  en: {
    texts: {
      start: 'Welcome! Please choose a language:',
      enter_key: 'Please enter your license key to activate the bot:',
      key_accepted: 'Key accepted! You have successfully activated the bot. Now please choose a currency pair.',
      key_already_used: 'This key is already activated by you. Continuing.',
      key_invalid: 'Invalid or already used key. Please try again.',
      use_buttons: 'Please use buttons to interact with the bot.',
      access_denied: 'Access denied.',
      no_keys: 'No keys found.',
      specify_count: 'Specify a number from 1 to 20.',
      specify_key_del: 'Specify the key to delete, e.g.:\n/delkey ABCD-1234-EFGH-5678',
      key_deleted: (key) => `Key ${key} deleted.`,
      key_not_found: 'No such key.',
      keys_generated: (keys) => `Generated keys:\n${keys.join('\n')}`,
      keys_list_header: 'List of keys:\n',
      keys_list_item: (key, info) => `${key} — ${info.used ? `Used (user ${info.userId})` : 'Free'}`,
      choose_lang: 'Выберите язык / Choose language',
    }
  },
};

// --- Обработчик команды /start ---
bot.start(async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.authorized = false;
  ctx.session.lang = null;

  const chooseLangText = languages.ru.texts.choose_lang;

  await ctx.reply(chooseLangText, Markup.inlineKeyboard([
    Markup.button.callback('Русский 🇷🇺', 'lang_ru'),
    Markup.button.callback('English 🇺🇸', 'lang_en'),
  ]));
});

// --- Обработка выбора языка ---
bot.action(/lang_(.+)/, async (ctx) => {
  ctx.session = ctx.session || {};
  const lang = ctx.match[1];
  if (!languages[lang]) {
    await ctx.answerCbQuery('Unsupported language');
    return;
  }
  ctx.session.lang = lang;

  if (isAdmin(ctx)) {
    ctx.session.authorized = true;
  } else {
    ctx.session.authorized = false;
  }

  await ctx.answerCbQuery();

  const prompt = isAdmin(ctx)
    ? (languages[lang].texts.key_accepted)
    : languages[lang].texts.enter_key;

  if (isAdmin(ctx)) {
    await sendPairSelection(ctx, lang);
  } else {
    await ctx.editMessageText(prompt);
  }
});

// --- Обработка текстовых сообщений — проверка ключа, если не авторизован ---
bot.on('text', async (ctx) => {
  ctx.session = ctx.session || {};
  const lang = ctx.session.lang || 'ru';
  const texts = languages[lang].texts;

  if (isAdmin(ctx)) {
    if (!ctx.session.authorized) ctx.session.authorized = true;
    return;
  }

  if (!ctx.session.authorized) {
    const inputKey = ctx.message.text.trim().toUpperCase();

    if (licenseKeys[inputKey] && !licenseKeys[inputKey].used) {
      licenseKeys[inputKey].used = true;
      licenseKeys[inputKey].userId = ctx.from.id;
      ctx.session.authorized = true;

      await ctx.reply(texts.key_accepted);

      if (typeof sendPairSelection === 'function') {
        await sendPairSelection(ctx, lang);
      }
    } else if (licenseKeys[inputKey] && licenseKeys[inputKey].userId === ctx.from.id) {
      ctx.session.authorized = true;
      await ctx.reply(texts.key_already_used);

      if (typeof sendPairSelection === 'function') {
        await sendPairSelection(ctx, lang);
      }
    } else {
      await ctx.reply(texts.key_invalid);
    }
    return;
  }

  await ctx.reply(texts.use_buttons);
});

// --- Команды администратора ---

bot.command('genkey', async (ctx) => {
  ctx.session = ctx.session || {};
  const lang = ctx.session.lang || 'ru';
  const texts = languages[lang].texts;

  console.log(`/genkey вызван пользователем ${ctx.from.id}`);

  if (!isAdmin(ctx)) {
    await ctx.reply(texts.access_denied);
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  let count = 1;
  if (args.length > 0) {
    const parsed = parseInt(args[0], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
      count = parsed;
    } else {
      await ctx.reply(texts.specify_count);
      return;
    }
  }

  const newKeys = [];
  for (let i = 0; i < count; i++) {
    let key;
    do {
      key = generateLicenseKey();
    } while (licenseKeys[key]);

    licenseKeys[key] = { used: false, userId: null };
    newKeys.push(key);
  }

  console.log('Сгенерированы ключи:', newKeys);

  await ctx.reply(texts.keys_generated(newKeys));
});

bot.command('listkeys', async (ctx) => {
  ctx.session = ctx.session || {};
  const lang = ctx.session.lang || 'ru';
  const texts = languages[lang].texts;

  console.log(`/listkeys вызван пользователем ${ctx.from.id}`);

  if (!isAdmin(ctx)) {
    await ctx.reply(texts.access_denied);
    return;
  }

  if (Object.keys(licenseKeys).length === 0) {
    await ctx.reply(texts.no_keys);
    return;
  }

  let message = texts.keys_list_header;
  for (const [key, info] of Object.entries(licenseKeys)) {
    message += texts.keys_list_item(key, info) + '\n';
  }

  await ctx.reply(message);
});

bot.command('delkey', async (ctx) => {
  ctx.session = ctx.session || {};
  const lang = ctx.session.lang || 'ru';
  const texts = languages[lang].texts;

  console.log(`/delkey вызван пользователем ${ctx.from.id}`);

  if (!isAdmin(ctx)) {
    await ctx.reply(texts.access_denied);
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (args.length === 0) {
    await ctx.reply(texts.specify_key_del);
    return;
  }

  const key = args[0].toUpperCase();
  if (!licenseKeys[key]) {
    await ctx.reply(texts.key_not_found);
    return;
  }

  delete licenseKeys[key];
  await ctx.reply(texts.key_deleted(key));
});

// --- Заглушка для sendPairSelection ---
async function sendPairSelection(ctx, lang) {
  const text = lang === 'ru' ? 'Выберите валютную пару:' : 'Please choose a currency pair:';
  const buttons = Markup.inlineKeyboard([
    Markup.button.callback('BTC/USD', 'pair_btcusd'),
    Markup.button.callback('ETH/USD', 'pair_ethusd'),
  ]);
  await ctx.reply(text, buttons);
}

// --- Запуск бота ---
bot.launch();
console.log('Бот запущен и готов к работе');
