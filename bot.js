import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';
import fetch from 'node-fetch';
import WebSocket from 'ws';

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// Инициализация chartJSNodeCanvas
const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  chartCallback: (ChartJS) => {
    ChartJS.register(annotationPlugin);
  },
});

// --- Currency Quotes Integration ---
class CurrencyQuotesManager {
  constructor() {
    this.quotes = new Map();
    this.updateInterval = null;
    this.watchedPairs = new Set(['EURUSD', 'GBPUSD', 'USDJPY']);
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
      const quote = await this.fetchQuote(pair);
      this.quotes.set(pair, quote);
    }
  }

  async fetchQuote(pair) {
    try {
      // Симуляция реальных котировок
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
    } catch (error) {
      console.error('Error fetching quote:', error);
      return null;
    }
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
      'GBPJPY': 190.00
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
}

const quotesManager = new CurrencyQuotesManager();
quotesManager.startUpdates();

// --- Остальные функции остаются без изменений ---
// (generateOHLCFromTime, calculateSMA, calculateRSI, etc.)

// --- Обновленный Telegram Bot с интеграцией котировок ---

// Добавляем новые команды для работы с котировками
bot.command('quotes', async (ctx) => {
  const lang = ctx.session.lang || 'ru';
  const quotes = quotesManager.getQuotes();
  
  if (quotes.length === 0) {
    await ctx.reply(lang === 'ru' ? 'Нет доступных котировок' : 'No quotes available');
    return;
  }

  let message = lang === 'ru' ? '📊 Текущие котировки:\n\n' : '📊 Current quotes:\n\n';
  
  quotes.forEach(quote => {
    const symbol = displayNames[quote.symbol]?.[lang] || quote.symbol;
    const emoji = quote.change >= 0 ? '📈' : '📉';
    message += `${emoji} ${symbol}\n`;
    message += `Bid: ${quote.bid} | Ask: ${quote.ask}\n`;
    message += `Change: ${quote.change > 0 ? '+' : ''}${quote.change} (${quote.changePercent}%)\n\n`;
  });

  await ctx.reply(message, {
    reply_markup: {
      inline_keyboard: [
        [Markup.button.callback(lang === 'ru' ? 'Обновить' : 'Refresh', 'refresh_quotes')],
        [Markup.button.callback(lang === 'ru' ? 'Управление парами' : 'Manage pairs', 'manage_pairs')]
      ]
    }
  });
});

bot.action('refresh_quotes', async (ctx) => {
  await ctx.answerCbQuery('Обновляем...');
  await quotesManager.updateAllQuotes();
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await ctx.replyWithChatAction('typing');
  await bot.handleUpdate({ message: { text: '/quotes', chat: ctx.chat, from: ctx.from } });
});

bot.action('manage_pairs', async (ctx) => {
  const lang = ctx.session.lang || 'ru';
  const currentPairs = Array.from(quotesManager.watchedPairs);
  
  let message = lang === 'ru' ? 'Текущие пары для отслеживания:\n' : 'Currently watched pairs:\n';
  currentPairs.forEach(pair => {
    message += `• ${displayNames[pair]?.[lang] || pair}\n`;
  });

  const availablePairs = Object.keys(displayNames).filter(p => !currentPairs.includes(p));
  
  const buttons = availablePairs.slice(0, 8).map(pair => 
    Markup.button.callback(`+ ${displayNames[pair]?.[lang] || pair}`, `add_${pair}`)
  );
  
  const removeButtons = currentPairs.map(pair => 
    Markup.button.callback(`- ${displayNames[pair]?.[lang] || pair}`, `remove_${pair}`)
  );

  const keyboard = [
    ...chunkArray(buttons, 2),
    ...chunkArray(removeButtons, 2),
    [Markup.button.callback(lang === 'ru' ? 'Назад' : 'Back', 'back_to_main')]
  ];

  await ctx.editMessageText(message, Markup.inlineKeyboard(keyboard));
});

bot.action(/add_(.+)/, async (ctx) => {
  const pair = ctx.match[1];
  quotesManager.addPair(pair);
  await ctx.answerCbQuery('Добавлено!');
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await bot.handleUpdate({ callback_query: { data: 'manage_pairs', ...ctx.callbackQuery } });
});

bot.action(/remove_(.+)/, async (ctx) => {
  const pair = ctx.match[1];
  quotesManager.removePair(pair);
  await ctx.answerCbQuery('Удалено!');
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await bot.handleUpdate({ callback_query: { data: 'manage_pairs', ...ctx.callbackQuery } });
});

// Обновляем главное меню
async function sendMainMenu(ctx, lang) {
  const langData = languages[lang];
  
  const buttons = [
    [Markup.button.callback('📊 Котировки / Quotes', 'show_quotes')],
    [Markup.button.callback('📈 Анализ / Analysis', 'show_analysis')],
    [Markup.button.callback('⚙️ Настройки / Settings', 'show_settings')]
  ];

  await ctx.editMessageText(
    lang === 'ru' ? 'Выберите действие:' : 'Choose action:',
    Markup.inlineKeyboard(buttons)
  );
}

bot.action('show_quotes', async (ctx) => {
  await ctx.answerCbQuery();
  await bot.handleUpdate({ message: { text: '/quotes', chat: ctx.chat, from: ctx.from } });
});

bot.action('show_analysis', async (ctx) => {
  await ctx.answerCbQuery();
  await sendPairSelection(ctx, ctx.session.lang || 'ru');
});

bot.action('back_to_main', async (ctx) => {
  await ctx.answerCbQuery();
  await sendMainMenu(ctx, ctx.session.lang || 'ru');
});

// Обновляем стартовую команду
bot.start(async (ctx) => {
  ctx.session = {};
  const buttons = [
    Markup.button.callback(languages.ru.name, 'lang_ru'),
    Markup.button.callback(languages.en.name, 'lang_en'),
  ];
  await ctx.reply(languages.ru.texts.chooseLanguage, Markup.inlineKeyboard(buttons));
});

bot.action(/lang_(.+)/, async (ctx) => {
  const lang = ctx.match[1];
  if (!languages[lang]) {
    await ctx.answerCbQuery('Unsupported language');
    return;
  }
  ctx.session.lang = lang;
  await ctx.answerCbQuery();
  await sendMainMenu(ctx, lang);
});

// Остальные обработчики остаются без изменений
// ... (sendPairSelection, analysis handlers, etc.)

bot.launch();
console.log('Bot started with currency quotes integration');

process.once('SIGINT', () => {
  quotesManager.stopUpdates();
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  quotesManager.stopUpdates();
  bot.stop('SIGTERM');
});
