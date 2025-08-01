import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import fetch from 'node-fetch';
import WebSocket from 'ws';

// Регистрируем Chart.js компоненты
Chart.register(...registerables);
Chart.register(annotationPlugin);

// --- Настройки ---
const BOT_TOKEN = '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk';
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// Инициализация chartJSNodeCanvas (без дополнительной регистрации)
const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  plugins: {
    modern: ['chartjs-plugin-annotation']
  }
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
function getBasePrice(pair) {
  if (pair.startsWith('OTC_')) {
    return 1.2 + (Math.random() - 0.5) * 0.3;
  } else {
    return 1 + (Math.random() - 0.5) * 0.5;
  }
}

function generateOHLCFromTime(startTimeMs, count, intervalMinutes, pair) {
  const basePrice = getBasePrice(pair);
  let price = basePrice;

  const volatility = pair.startsWith('OTC_') ? 0.003 : 0.0018;
  const data = [];
  let time = startTimeMs;

  for (let i = 0; i < count; i++) {
    const trend = Math.sin(i / 10) * volatility * 0.5;
    const randChange = (Math.random() - 0.5) * volatility;
    const open = price;
    price = Math.max(0.01, price + trend + randChange);
    const close = price;
    const high = Math.max(open, close) + Math.random() * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * 0.3;

    const volume = Math.floor(100 + Math.random() * 1000);

    data.push({
      openTime: time,
      open,
      high,
      low,
      close,
      closeTime: time + intervalMinutes * 60 * 1000 - 1,
      volume,
    });
    time += intervalMinutes * 60 * 1000;
  }
  return data;
}

function calculateSMA(data, period) {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

function calculateRSI(data, period) {
  const rsi = [];
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    let gain = 0;
    let loss = 0;
    if (change >= 0) gain = change;
    else loss = -change;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  for (let i = 0; i < period; i++) rsi[i] = null;
  return rsi;
}

function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  const ema = [];
  ema[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

function findSupportResistance(klines) {
  const supports = [];
  const resistances = [];
  const len = klines.length;
  for (let i = 2; i < len - 2; i++) {
    const lows = klines.slice(i - 2, i + 3).map(k => k.low);
    const highs = klines.slice(i - 2, i + 3).map(k => k.high);
    if (klines[i].low === Math.min(...lows)) supports.push(klines[i].low);
    if (klines[i].high === Math.max(...highs)) resistances.push(klines[i].high);
  }
  const uniqSupports = [...new Set(supports)].sort((a, b) => a - b).slice(0, 3);
  const uniqResistances = [...new Set(resistances)].sort((a, b) => b - a).slice(0, 3);
  return { supports: uniqSupports, resistances: uniqResistances };
}

// --- Telegram Bot Commands ---
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
  await ctx.reply('Котировки обновлены! Используйте /quotes для просмотра.');
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
});

bot.action(/remove_(.+)/, async (ctx) => {
  const pair = ctx.match[1];
  quotesManager.removePair(pair);
  await ctx.answerCbQuery('Удалено!');
});

// Остальные функции
function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

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
};

bot.start(async (ctx) => {
  ctx.session = {};
  const buttons = [
    [Markup.button.callback('📊 Котировки', 'show_quotes')],
    [Markup.button.callback('📈 Анализ', 'show_analysis')],
    [Markup.button.callback('⚙️ Настройки', 'show_settings')]
  ];
  await ctx.reply('Добро пожаловать! Выберите действие:', Markup.inlineKeyboard(buttons));
});

bot.action('show_quotes', async (ctx) => {
  await ctx.answerCbQuery();
  await bot.handleUpdate({ message: { text: '/quotes', chat: ctx.chat, from: ctx.from } });
});

bot.action('show_analysis', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Функция анализа временно недоступна');
});

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
