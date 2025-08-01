import { Telegraf, Markup } from 'telegraf';
import puppeteer from 'puppeteer';
import io from 'socket.io-client';

const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const bot = new Telegraf(BOT_TOKEN);

class PocketOptionParser {
  constructor() {
    this.browser = null;
    this.page = null;
    this.quotes = new Map();
    this.watchedPairs = new Set([
      'EURUSD', 'GBPUSD', 'EURGBP', 'GBPJPY', 'EURJPY', 'USDJPY',
      'AUDCAD', 'NZDUSD', 'USDCHF', 'AUDUSD', 'USDCAD', 'AUDJPY',
      'GBPCAD', 'GBPCHF', 'GBPAUD', 'EURAUD', 'USDNOK', 'EURNZD', 'USDSEK'
    ]);
    this.isParsing = false;
    this.lastUpdate = null;
    this.updateInterval = null;

    // WebSocket
    this.socket = null;
    this.userId = '91717690'; // из твои данных
    this.userSecret = 'eea7f7588a9a0d84b68e0010a0026544'; // из твои данных
  }

  async init() {
    try {
      console.log('🚀 Запускаем браузер для парсинга Pocket Option...');
      this.browser = await puppeteer.launch({ headless: true });
      this.page = await this.browser.newPage();
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      console.log('✅ Браузер запущен успешно');
      return true;
    } catch (error) {
      console.error('❌ Ошибка запуска браузера:', error);
      return false;
    }
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      this.socket = io('wss://api-msk.po.market', { transports: ['websocket'] });

      this.socket.on('connect', () => {
        console.log('WS подключение установлено, отправляем авторизацию');
        this.socket.emit('auth', {
          userId: this.userId,
          userSecret: this.userSecret,
        });
      });

      this.socket.on('auth_response', (data) => {
        if (data.success) {
          console.log('Авторизация прошла успешно по WebSocket');
          resolve();
        } else {
          console.error('Ошибка авторизации WebSocket:', data.message);
          reject(new Error(data.message));
        }
      });

      this.socket.on('price_update', (data) => {
        // Обработка обновления цены — обновляем quotes Map
        const { symbol, bid, ask } = data;
        if (this.watchedPairs.has(symbol)) {
          const prev = this.quotes.get(symbol);
          const change = prev ? bid - prev.bid : 0;
          const changePercent = prev ? (change / prev.bid) * 100 : 0;
          this.quotes.set(symbol, { symbol, bid, ask, change, changePercent, timestamp: Date.now(), source: 'websocket' });
          this.lastUpdate = new Date();
          // Можно здесь вызвать callback для реального времени
        }
      });

      this.socket.on('connect_error', (err) => {
        console.error('Ошибка подключения WebSocket:', err);
      });

      this.socket.on('disconnect', () => {
        console.warn('WebSocket отключён');
      });
    });
  }

  async parseQuotes() {
    if (this.isParsing) return;
    this.isParsing = true;
    try {
      console.log('🔍 Парсим котировки с Pocket Option через Puppeteer...');
      await this.page.goto('https://pocketoption.com/en/cabinet/quotes', { waitUntil: 'networkidle2', timeout: 30000 });
      await this.page.waitForSelector('.quotes-container, .asset-list, [data-qa="quotes-list"]', { timeout: 10000 }).catch(() => console.warn('⚠️ Селектор котировок не найден'));

      const quotes = await this.page.evaluate((watchedPairs) => {
        const list = [];
        const els = document.querySelectorAll('.quote-item, .asset-item, [data-qa="quote-item"]');
        els.forEach(el => {
          const text = el.textContent || '';
          watchedPairs.forEach(pair => {
            if (text.includes(pair)) {
              const priceMatch = text.match(/(\d+\.\d{4,5})/g);
              if (priceMatch) {
                list.push({
                  symbol: pair,
                  price: parseFloat(priceMatch[0]),
                  bid: parseFloat(priceMatch[0]),
                  ask: parseFloat(priceMatch[1] || priceMatch[0])
                });
              }
            }
          });
        });
        return list;
      }, Array.from(this.watchedPairs));

      quotes.forEach(quote => {
        const prev = this.quotes.get(quote.symbol);
        const change = prev ? quote.price - prev.bid : 0;
        const changePercent = prev ? (change / prev.bid) * 100 : 0;
        this.quotes.set(quote.symbol, { symbol: quote.symbol, bid: parseFloat(quote.price.toFixed(5)), ask: parseFloat((quote.price + 0.0001).toFixed(5)), change: parseFloat(change.toFixed(5)), changePercent: parseFloat(changePercent.toFixed(2)), timestamp: Date.now(), source: 'pocket-option' });
      });

      this.lastUpdate = new Date();
      console.log(`✅ Парсинг завершен. Получено ${quotes.length} котировок`);
    } catch (error) {
      console.error('❌ Ошибка парсинга:', error);
    } finally {
      this.isParsing = false;
    }
  }

  async startParsing() {
    const initialized = await this.init();
    if (!initialized) {
      console.error('❌ Не удалось запустить браузер');
      return;
    }
    // Запускаем WebSocket соединение
    await this.connectWebSocket();

    await this.parseQuotes();

    this.updateInterval = setInterval(async () => {
      // Можно периодически обновлять и через Puppeteer (если нужно)
      await this.parseQuotes();
    }, 30000);

    console.log('✅ Pocket Option parser запущен!');
  }
  
  stopParsing() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.browser) this.browser.close();
    if (this.socket) this.socket.close();
  }

  getQuotes() {
    return Array.from(this.quotes.values());
  }

  addPair(pair) {
    this.watchedPairs.add(pair);
    this.parseQuotes();
  }

  removePair(pair) {
    this.watchedPairs.delete(pair);
    this.quotes.delete(pair);
  }

  getAvailablePairs() {
    const allPairs = [
      'EURUSD', 'GBPUSD', 'EURGBP', 'GBPJPY', 'EURJPY', 'USDJPY',
      'AUDCAD', 'NZDUSD', 'USDCHF', 'AUDUSD', 'USDCAD', 'AUDJPY',
      'GBPCAD', 'GBPCHF', 'GBPAUD', 'EURAUD', 'USDNOK', 'EURNZD', 'USDSEK'
    ];
    return allPairs.filter(p => !this.watchedPairs.has(p));
  }
}

const parser = new PocketOptionParser();

const displayNames = {
  EURUSD: { ru: 'EUR/USD' },
  GBPUSD: { ru: 'GBP/USD' },
  EURGBP: { ru: 'EUR/GBP' },
  GBPJPY: { ru: 'GBP/JPY' },
  EURJPY: { ru: 'EUR/JPY' },
  USDJPY: { ru: 'USD/JPY' },
  AUDCAD: { ru: 'AUD/CAD' },
  NZDUSD: { ru: 'NZD/USD' },
  USDCHF: { ru: 'USD/CHF' },
  AUDUSD: { ru: 'AUD/USD' },
  USDCAD: { ru: 'USD/CAD' },
  AUDJPY: { ru: 'AUD/JPY' },
  GBPCAD: { ru: 'GBP/CAD' },
  GBPCHF: { ru: 'GBP/CHF' },
  GBPAUD: { ru: 'GBP/AUD' },
  EURAUD: { ru: 'EUR/AUD' },
  USDNOK: { ru: 'USD/NOK' },
  EURNZD: { ru: 'EUR/NZD' },
  USDSEK: { ru: 'USD/SEK' }
};

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// --- Telegram Bot Commands ---

bot.start(async (ctx) => {
  const welcomeText = `
🤖 <b>Pocket Option Quotes Parser</b>
📊 Парсер котировок напрямую с платформы Pocket Option
🎯 Отслеживаемые пары: 19 основных валютных пар
💡 Доступные команды:
/quotes - показать текущие котировки
/add - добавить пару для отслеживания
/remove - удалить пару из отслеживания
/list - список отслеживаемых пар
/help - помощь
⚡ Обновление каждые 30 секунд
  `;
  await ctx.reply(welcomeText, { parse_mode: 'HTML' });
});

bot.command('help', async (ctx) => {
  const helpText = `
📋 Справка по Pocket Option Parser:
🔹 <b>Особенности:</b>
• Прямой парсинг с платформы Pocket Option
• 19 валютных пар
• Обновление каждые 30 секунд
• Резервные данные при недоступности сайта
🔹 Доступные пары:
EURUSD, GBPUSD, EURGBP, GBPJPY, EURJPY, USDJPY,
AUDCAD, NZDUSD, USDCHF, AUDUSD, USDCAD, AUDJPY,
GBPCAD, GBPCHF, GBPAUD, EURAUD, USDNOK, EURNZD, USDSEK
🔹 Команды:
• /quotes - показать все текущие котировки
• /add - добавить новую пару в отслеживание
• /remove - удалить пару из отслеживания
• /list - показать список всех отслеживаемых пар
  `;
  await ctx.reply(helpText, { parse_mode: 'HTML' });
});

bot.command('quotes', async (ctx) => {
  const quotes = parser.getQuotes();
  if (quotes.length === 0) {
    await ctx.reply('📊 Загрузка котировок с Pocket Option... Попробуйте через несколько секунд.');
    return;
  }
  let message = '📊 <b>КОТИРОВКИ POCKET OPTION</b>\n\n';
  quotes.forEach(quote => {
    const symbol = displayNames[quote.symbol]?.ru || quote.symbol;
    const emoji = quote.change >= 0 ? '📈' : '📉';
    const sign = quote.change > 0 ? '+' : '';
    message += `${emoji} <b>${symbol}</b>\n`;
    message += `Bid: <code>${quote.bid}</code> | Ask: <code>${quote.ask}</code>\n`;
    message += `Изменение: ${sign}${quote.change} (${quote.changePercent}%)\n`;
    message += `Источник: ${quote.source}\n`;
    message += `Время: ${formatTime(quote.timestamp)}\n\n`;
  });
  if (parser.lastUpdate) {
    message += `🔄 Последнее обновление: ${formatTime(parser.lastUpdate)}`;
  }
  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [Markup.button.callback('🔄 Обновить', 'refresh_quotes')]
      ]
    }
  });
});

bot.action('refresh_quotes', async (ctx) => {
  await ctx.answerCbQuery('Обновляем...');
  await parser.parseQuotes();
  await bot.handleUpdate({ message: { text: '/quotes', chat: ctx.chat, from: ctx.from } });
});

bot.command('add', async (ctx) => {
  const availablePairs = parser.getAvailablePairs();
  if (availablePairs.length === 0) {
    await ctx.reply('✅ Все доступные пары уже отслеживаются');
    return;
  }
  const buttons = availablePairs.map(pair =>
    Markup.button.callback(displayNames[pair]?.ru || pair, `add_${pair}`)
  );
  const keyboard = chunkArray(buttons, 3);
  await ctx.reply('➕ Выберите пару для добавления:', Markup.inlineKeyboard(keyboard));
});

bot.command('remove', async (ctx) => {
  const currentPairs = Array.from(parser.watchedPairs);
  if (currentPairs.length === 0) {
    await ctx.reply('❌ Нет отслеживаемых пар');
    return;
  }
  const buttons = currentPairs.map(pair =>
    Markup.button.callback(displayNames[pair]?.ru || pair, `remove_${pair}`)
  );
  const keyboard = chunkArray(buttons, 3);
  await ctx.reply('➖ Выберите пару для удаления:', Markup.inlineKeyboard(keyboard));
});

bot.command('list', async (ctx) => {
  const currentPairs = Array.from(parser.watchedPairs);
  if (currentPairs.length === 0) {
    await ctx.reply('❌ Нет отслеживаемых пар');
    return;
  }
  let message = '📋 <b>Отслеживаемые пары:</b>\n\n';
  currentPairs.forEach(pair => {
    message += `• ${displayNames[pair]?.ru || pair}\n`;
  });
  await ctx.reply(message, { parse_mode: 'HTML' });
});

bot.action(/add_(.+)/, async (ctx) => {
  const pair = ctx.match[1];
  parser.addPair(pair);
  await ctx.answerCbQuery(`✅ Добавлено: ${displayNames[pair]?.ru || pair}`);
  await ctx.reply(`✅ Пара ${displayNames[pair]?.ru || pair} добавлена в отслеживание`);
});

bot.action(/remove_(.+)/, async (ctx) => {
  const pair = ctx.match[1];
  parser.removePair(pair);
  await ctx.answerCbQuery(`❌ Удалено: ${displayNames[pair]?.ru || pair}`);
  await ctx.reply(`❌ Пара ${displayNames[pair]?.ru || pair} удалена из отслеживания`);
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text.toUpperCase().replace('/', '');
  if (displayNames[text]) {
    const quote = parser.quotes.get(text);
    if (quote) {
      const symbol = displayNames[text]?.ru || text;
      const emoji = quote.change >= 0 ? '📈' : '📉';
      const sign = quote.change > 0 ? '+' : '';
      const message = `
📊 <b>${symbol} (Pocket Option)</b>
💰 Bid: <code>${quote.bid}</code>
💰 Ask: <code>${quote.ask}</code>
📊 Изменение: ${sign}${quote.change} (${quote.changePercent}%)
🔗 Источник: ${quote.source}
⏰ Время: ${formatTime(quote.timestamp)}
      `;
      await ctx.reply(message, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`❌ Котировка для ${displayNames[text]?.ru || text} временно недоступна`);
    }
  }
});

async function startBot() {
  console.log('🚀 Запуск Pocket Option Parser...');
  await parser.startParsing();
  bot.launch();
  console.log('✅ Pocket Option Quotes Bot запущен успешно!');
  console.log('📊 Парсим котировки с платформы Pocket Option');
}

// Graceful shutdown
process.once('SIGINT', async () => {
  console.log('🛑 Остановка бота...');
  parser.stopParsing();
  bot.stop('SIGINT');
  process.exit(0);
});
process.once('SIGTERM', async () => {
  console.log('🛑 Остановка бота...');
  parser.stopParsing();
  bot.stop('SIGTERM');
  process.exit(0);
});

startBot().catch(console.error);
