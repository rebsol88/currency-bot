import { Telegraf, Markup } from 'telegraf';
import puppeteer from 'puppeteer';
import fs from 'fs/promises';

const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const bot = new Telegraf(BOT_TOKEN);

// --- Pocket Option Parser ---
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
  }

  async init() {
    try {
      console.log('🚀 Запускаем браузер для парсинга Pocket Option...');
      
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Устанавливаем user agent
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      console.log('✅ Браузер запущен успешно');
      return true;
    } catch (error) {
      console.error('❌ Ошибка запуска браузера:', error);
      return false;
    }
  }

  async parseQuotes() {
    if (this.isParsing) return;
    this.isParsing = true;

    try {
      console.log('🔍 Парсим котировки с Pocket Option...');
      
      // Переходим на страницу с котировками
      await this.page.goto('https://pocketoption.com/en/cabinet/quotes', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Ждем загрузки котировок
      await this.page.waitForSelector('.quotes-container, .asset-list, [data-qa="quotes-list"]', { timeout: 10000 })
        .catch(() => console.log('⚠️ Основной селектор не найден, пробуем альтернативы'));

      // Парсим котировки
      const quotes = await this.page.evaluate((targetPairs) => {
        const quotes = [];
        
        // Пробуем разные селекторы для Pocket Option
        const selectors = [
          '.quote-item',
          '.asset-item',
          '[data-qa="quote-item"]',
          '.quotes-list .item',
          '.currency-pair'
        ];

        let elements = [];
        
        for (const selector of selectors) {
          elements = document.querySelectorAll(selector);
          if (elements.length > 0) break;
        }

        // Если не нашли через селекторы, пробуем найти по тексту
        if (elements.length === 0) {
          const allElements = document.querySelectorAll('*');
          
          for (const pair of targetPairs) {
            for (const element of allElements) {
              const text = element.textContent || element.innerText;
              if (text && text.includes(pair)) {
                // Ищем цену рядом с названием пары
                const parent = element.closest('*');
                const priceMatch = parent.textContent.match(/(\d+\.\d{4,5})/);
                
                if (priceMatch) {
                  quotes.push({
                    symbol: pair,
                    price: parseFloat(priceMatch[1]),
                    element: parent.outerHTML
                  });
                  break;
                }
              }
            }
          }
        } else {
          // Парсим через найденные элементы
          elements.forEach(element => {
            const text = element.textContent || element.innerText;
            
            targetPairs.forEach(pair => {
              if (text.includes(pair)) {
                const priceMatch = text.match(/(\d+\.\d{4,5})/g);
                if (priceMatch && priceMatch.length > 0) {
                  quotes.push({
                    symbol: pair,
                    price: parseFloat(priceMatch[0]),
                    bid: parseFloat(priceMatch[0]),
                    ask: parseFloat(priceMatch[1] || priceMatch[0])
                  });
                }
              }
            });
          });
        }

        return quotes;
      }, Array.from(this.watchedPairs));

      // Обновляем котировки
      quotes.forEach(quote => {
        const previousQuote = this.quotes.get(quote.symbol);
        const previousPrice = previousQuote?.bid || quote.price;
        const change = quote.price - previousPrice;
        const changePercent = (change / previousPrice) * 100;

        this.quotes.set(quote.symbol, {
          symbol: quote.symbol,
          bid: parseFloat(quote.price.toFixed(5)),
          ask: parseFloat((quote.price + 0.0001).toFixed(5)),
          change: parseFloat(change.toFixed(5)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          timestamp: Date.now(),
          source: 'pocket-option'
        });
      });

      this.lastUpdate = new Date();
      console.log(`✅ Парсинг завершен. Получено ${quotes.length} котировок`);
      
    } catch (error) {
      console.error('❌ Ошибка парсинга:', error);
      
      // Если ошибка, используем резервные данные
      await this.useBackupData();
    } finally {
      this.isParsing = false;
    }
  }

  async useBackupData() {
    console.log('🔄 Используем резервные данные...');
    
    // Резервные данные для тестирования
    const backupData = {
      EURUSD: 1.0856,
      GBPUSD: 1.2712,
      EURGBP: 0.8543,
      GBPJPY: 190.45,
      EURJPY: 162.78,
      USDJPY: 149.82,
      AUDCAD: 0.9123,
      NZDUSD: 0.6156,
      USDCHF: 0.8854,
      AUDUSD: 0.6654,
      USDCAD: 1.3612,
      AUDJPY: 99.67,
      GBPCAD: 1.7312,
      GBPCHF: 1.1256,
      GBPAUD: 1.9112,
      EURAUD: 1.6323,
      USDNOK: 10.5123,
      EURNZD: 1.7634,
      USDSEK: 10.4234
    };

    Object.entries(backupData).forEach(([symbol, price]) => {
      if (this.watchedPairs.has(symbol)) {
        const previousQuote = this.quotes.get(symbol);
        const previousPrice = previousQuote?.bid || price;
        const change = price - previousPrice;
        const changePercent = (change / previousPrice) * 100;

        this.quotes.set(symbol, {
          symbol,
          bid: parseFloat(price.toFixed(5)),
          ask: parseFloat((price + 0.0001).toFixed(5)),
          change: parseFloat(change.toFixed(5)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          timestamp: Date.now(),
          source: 'backup-data'
        });
      }
    });
  }

  async startParsing() {
    const initialized = await this.init();
    if (!initialized) {
      console.log('❌ Не удалось запустить браузер, используем резервные данные');
      await this.useBackupData();
    }

    // Первый парсинг
    await this.parseQuotes();

    // Установка интервала
    this.updateInterval = setInterval(async () => {
      await this.parseQuotes();
    }, 30000); // Каждые 30 секунд

    console.log('✅ Pocket Option parser запущен');
  }

  stopParsing() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.browser) {
      this.browser.close();
    }
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

// --- Display Names ---
const displayNames = {
  EURUSD: { ru: 'EUR/USD', en: 'EUR/USD' },
  GBPUSD: { ru: 'GBP/USD', en: 'GBP/USD' },
  EURGBP: { ru: 'EUR/GBP', en: 'EUR/GBP' },
  GBPJPY: { ru: 'GBP/JPY', en: 'GBP/JPY' },
  EURJPY: { ru: 'EUR/JPY', en: 'EUR/JPY' },
  USDJPY: { ru: 'USD/JPY', en: 'USD/JPY' },
  AUDCAD: { ru: 'AUD/CAD', en: 'AUD/CAD' },
  NZDUSD: { ru: 'NZD/USD', en: 'NZD/USD' },
  USDCHF: { ru: 'USD/CHF', en: 'USD/CHF' },
  AUDUSD: { ru: 'AUD/USD', en: 'AUD/USD' },
  USDCAD: { ru: 'USD/CAD', en: 'USD/CAD' },
  AUDJPY: { ru: 'AUD/JPY', en: 'AUD/JPY' },
  GBPCAD: { ru: 'GBP/CAD', en: 'GBP/CAD' },
  GBPCHF: { ru: 'GBP/CHF', en: 'GBP/CHF' },
  GBPAUD: { ru: 'GBP/AUD', en: 'GBP/AUD' },
  EURAUD: { ru: 'EUR/AUD', en: 'EUR/AUD' },
  USDNOK: { ru: 'USD/NOK', en: 'USD/NOK' },
  EURNZD: { ru: 'EUR/NZD', en: 'EUR/NZD' },
  USDSEK: { ru: 'USD/SEK', en: 'USD/SEK' }
};

// --- Utility Functions ---
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

// Обработчики callback
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

// Обработка текстовых сообщений
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

// Запуск
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

// Запускаем бота
startBot().catch(console.error);
