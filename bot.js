import { Telegraf, Markup } from 'telegraf';

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const bot = new Telegraf(BOT_TOKEN);

// --- Currency Quotes Manager ---
class CurrencyQuotesManager {
  constructor() {
    this.quotes = new Map();
    this.updateInterval = null;
    this.watchedPairs = new Set(['EURUSD', 'GBPUSD', 'USDJPY', 'EURGBP', 'AUDUSD', 'USDCAD']);
  }

  startUpdates() {
    if (this.updateInterval) return;
    
    this.updateInterval = setInterval(() => {
      this.updateAllQuotes();
    }, 5000);
    
    this.updateAllQuotes();
  }

  stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async updateAllQuotes() {
    for (const pair of this.watchedPairs) {
      const quote = this.generateQuote(pair);
      this.quotes.set(pair, quote);
    }
  }

  generateQuote(pair) {
    const basePrice = this.getBasePrice(pair);
    const volatility = 0.001;
    const change = (Math.random() - 0.5) * volatility;
    const bid = basePrice + change;
    const ask = bid + 0.0001;
    
    return {
      symbol: pair,
      bid: parseFloat(bid.toFixed(5)),
      ask: parseFloat(ask.toFixed(5)),
      change: parseFloat(change.toFixed(5)),
      changePercent: parseFloat((change / basePrice * 100).toFixed(2)),
      timestamp: Date.now()
    };
  }

  getBasePrice(pair) {
    const prices = {
      'EURUSD': 1.0850,
      'GBPUSD': 1.2700,
      'USDJPY': 149.50,
      'USDCHF': 0.8850,
      'AUDUSD': 0.6650,
      'USDCAD': 1.3600,
      'NZDUSD': 0.6150,
      'EURGBP': 0.8550,
      'EURJPY': 162.50,
      'GBPJPY': 190.00,
      'EURCAD': 1.4750,
      'AUDJPY': 99.50,
      'NZDJPY': 91.80,
      'GBPCHF': 1.1250,
      'EURCHF': 0.9600,
      'XAUUSD': 2035.50,
      'XAGUSD': 24.85,
      'BTCUSD': 67500.00,
      'ETHUSD': 3450.00
    };
    return prices[pair] || 1.0;
  }

  getQuotes() {
    return Array.from(this.quotes.values());
  }

  addPair(pair) {
    this.watchedPairs.add(pair);
    this.updateAllQuotes();
  }

  removePair(pair) {
    this.watchedPairs.delete(pair);
    this.quotes.delete(pair);
  }

  getAvailablePairs() {
    const allPairs = Object.keys(this.getBasePrice());
    return allPairs.filter(p => !this.watchedPairs.has(p));
  }
}

const quotesManager = new CurrencyQuotesManager();
quotesManager.startUpdates();

// --- Display Names ---
const displayNames = {
  EURUSD: { ru: 'EUR/USD', en: 'EUR/USD' },
  GBPUSD: { ru: 'GBP/USD', en: 'GBP/USD' },
  USDJPY: { ru: 'USD/JPY', en: 'USD/JPY' },
  USDCHF: { ru: 'USD/CHF', en: 'USD/CHF' },
  AUDUSD: { ru: 'AUD/USD', en: 'AUD/USD' },
  USDCAD: { ru: 'USD/CAD', en: 'USD/CAD' },
  NZDUSD: { ru: 'NZD/USD', en: 'NZD/USD' },
  EURGBP: { ru: 'EUR/GBP', en: 'EUR/GBP' },
  EURJPY: { ru: 'EUR/JPY', en: 'EUR/JPY' },
  GBPJPY: { ru: 'GBP/JPY', en: 'GBP/JPY' },
  EURCAD: { ru: 'EUR/CAD', en: 'EUR/CAD' },
  AUDJPY: { ru: 'AUD/JPY', en: 'AUD/JPY' },
  NZDJPY: { ru: 'NZD/JPY', en: 'NZD/JPY' },
  GBPCHF: { ru: 'GBP/CHF', en: 'GBP/CHF' },
  EURCHF: { ru: 'EUR/CHF', en: 'EUR/CHF' },
  XAUUSD: { ru: 'Золото', en: 'Gold' },
  XAGUSD: { ru: 'Серебро', en: 'Silver' },
  BTCUSD: { ru: 'Bitcoin', en: 'Bitcoin' },
  ETHUSD: { ru: 'Ethereum', en: 'Ethereum' }
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
🤖 Добро пожаловать в Currency Quotes Bot!

📊 Доступные команды:
/quotes - показать текущие котировки
/add - добавить пару для отслеживания
/remove - удалить пару из отслеживания
/list - список отслеживаемых пар
/help - помощь

💡 Также можно отправить название пары (например, "EURUSD") для быстрого просмотра

Котировки обновляются каждые 5 секунд.
  `;
  await ctx.reply(welcomeText);
});

bot.command('help', async (ctx) => {
  const helpText = `
📋 Справка по боту:

🔹 Команды:
• /quotes - показать все текущие котировки
• /add - добавить новую пару в отслеживание
• /remove - удалить пару из отслеживания
• /list - показать список всех отслеживаемых пар

🔹 Примеры использования:
• Отправьте "EURUSD" для просмотра котировки EUR/USD
• Отправьте "BTCUSD" для просмотра котировки Bitcoin

🔹 Доступные пары:
Валютные пары: EURUSD, GBPUSD, USDJPY, и другие
Криптовалюты: BTCUSD, ETHUSD
Драгоценные металлы: XAUUSD (золото), XAGUSD (серебро)

⚠️ Все котировки являются демонстрационными!
  `;
  await ctx.reply(helpText);
});

bot.command('quotes', async (ctx) => {
  const quotes = quotesManager.getQuotes();
  
  if (quotes.length === 0) {
    await ctx.reply('📊 Нет доступных котировок');
    return;
  }

  let message = '📊 Текущие котировки:\n\n';
  
  quotes.forEach(quote => {
    const symbol = displayNames[quote.symbol]?.ru || quote.symbol;
    const emoji = quote.change >= 0 ? '📈' : '📉';
    const sign = quote.change > 0 ? '+' : '';
    
    message += `${emoji} <b>${symbol}</b>\n`;
    message += `Bid: <code>${quote.bid}</code> | Ask: <code>${quote.ask}</code>\n`;
    message += `Изменение: ${sign}${quote.change} (${quote.changePercent}%)\n`;
    message += `Время: ${formatTime(quote.timestamp)}\n\n`;
  });

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
  await quotesManager.updateAllQuotes();
  await bot.handleUpdate({ message: { text: '/quotes', chat: ctx.chat, from: ctx.from } });
});

bot.command('add', async (ctx) => {
  const availablePairs = quotesManager.getAvailablePairs();
  
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
  const currentPairs = Array.from(quotesManager.watchedPairs);
  
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
  const currentPairs = Array.from(quotesManager.watchedPairs);
  
  if (currentPairs.length === 0) {
    await ctx.reply('❌ Нет отслеживаемых пар');
    return;
  }

  let message = '📋 Отслеживаемые пары:\n\n';
  currentPairs.forEach(pair => {
    message += `• ${displayNames[pair]?.ru || pair}\n`;
  });

  await ctx.reply(message);
});

// Обработчики callback
bot.action(/add_(.+)/, async (ctx) => {
  const pair = ctx.match[1];
  quotesManager.addPair(pair);
  await ctx.answerCbQuery(`✅ Добавлено: ${displayNames[pair]?.ru || pair}`);
  await ctx.reply(`✅ Пара ${displayNames[pair]?.ru || pair} добавлена в отслеживание`);
});

bot.action(/remove_(.+)/, async (ctx) => {
  const pair = ctx.match[1];
  quotesManager.removePair(pair);
  await ctx.answerCbQuery(`❌ Удалено: ${displayNames[pair]?.ru || pair}`);
  await ctx.reply(`❌ Пара ${displayNames[pair]?.ru || pair} удалена из отслеживания`);
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  const text = ctx.message.text.toUpperCase().replace('/', '');
  
  if (displayNames[text]) {
    const quote = quotesManager.quotes.get(text);
    if (quote) {
      const symbol = displayNames[text]?.ru || text;
      const emoji = quote.change >= 0 ? '📈' : '📉';
      const sign = quote.change > 0 ? '+' : '';
      
      const message = `
📊 <b>${symbol}</b>
💰 Bid: <code>${quote.bid}</code>
💰 Ask: <code>${quote.ask}</code>
📊 Изменение: ${sign}${quote.change} (${quote.changePercent}%)
⏰ Время: ${formatTime(quote.timestamp)}
      `;
      
      await ctx.reply(message, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`❌ Котировка для ${displayNames[text]?.ru || text} временно недоступна`);
    }
  }
});

// Запуск бота
bot.launch();
console.log('✅ Currency Quotes Bot запущен успешно!');
console.log('Команды: /start, /quotes, /add, /remove, /list, /help');

// Graceful shutdown
process.once('SIGINT', () => {
  quotesManager.stopUpdates();
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  quotesManager.stopUpdates();
  bot.stop('SIGTERM');
});
