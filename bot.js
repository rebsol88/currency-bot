import { Telegraf } from 'telegraf';
import axios from 'axios';
import { createCanvas } from 'canvas';
import { SMA, RSI, Stochastic } from 'technicalindicators';

// Конфигурация (валютные пары + OTC валютные инструменты)
const CONFIG = {
  pocketOptionApi: 'https://api.pocketoption.com/api',
  botToken: '8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk',
  symbols: [
    // Основные валютные пары
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 
    'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP',
    'EURJPY', 'GBPJPY', 'AUDJPY', 'EURCAD',
    'EURAUD', 'GBPAUD', 'GBPCAD', 'GBPCHF',
    
    // OTC валютные инструменты
    'OTC:EURUSD', 'OTC:GBPUSD', 'OTC:USDJPY',
    'OTC:AUDUSD', 'OTC:USDCAD', 'OTC:USDCHF',
    'OTC:EURGBP', 'OTC:EURJPY', 'OTC:GBPJPY'
  ],
  timeframes: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
  indicators: {
    smaShort: 5,
    smaLong: 15,
    rsi: 14,
    stochastic: { period: 14, signal: 3 }
  }
};

const bot = new Telegraf(CONFIG.botToken);

// Получение исторических свечей с PocketOption API
async function getPocketOptionData(symbol, timeframe) {
  try {
    // Пример URL, может потребоваться корректировка под актуальный API
    const url = `${CONFIG.pocketOptionApi}/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=100`;
    const response = await axios.get(url);

    // Предполагаем, что данные приходят в response.data.candles
    if (!response.data || !Array.isArray(response.data.candles)) {
      return [];
    }

    // Преобразуем данные в формат [{time, open, high, low, close, volume}, ...]
    return response.data.candles.map(c => ({
      time: c.time, // timestamp
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));
  } catch (error) {
    console.error('Ошибка получения данных с PocketOption:', error);
    return [];
  }
}

// Анализ рынка: расчет индикаторов и тренда
function analyzeMarket(candles) {
  const closes = candles.map(c => c.close);

  const sma5 = SMA.calculate({ period: CONFIG.indicators.smaShort, values: closes }).slice(-1)[0] ?? closes[closes.length - 1];
  const sma15 = SMA.calculate({ period: CONFIG.indicators.smaLong, values: closes }).slice(-1)[0] ?? closes[closes.length - 1];
  const rsi = RSI.calculate({ period: CONFIG.indicators.rsi, values: closes }).slice(-1)[0] ?? 50;

  const stochasticInput = {
    period: CONFIG.indicators.stochastic.period,
    signalPeriod: CONFIG.indicators.stochastic.signal,
    high: candles.map(c => c.high),
    low: candles.map(c => c.low),
    close: closes,
  };
  const stochasticResults = Stochastic.calculate(stochasticInput);
  const stochastic = stochasticResults.slice(-1)[0] ?? { k: 50, d: 50 };

  // Простой тренд: если sma5 > sma15 — восходящий, иначе нисходящий
  const trend = sma5 > sma15 ? 'Восходящий' : 'Нисходящий';

  // Поиск уровней поддержки/сопротивления
  const levels = findSupportResistance(candles);

  // Простейшие сигналы
  const signals = [];
  if (rsi > 70) signals.push('Перекупленность (RSI > 70)');
  else if (rsi < 30) signals.push('Перепроданность (RSI < 30)');
  if (stochastic.k > 80 && stochastic.d > 80) signals.push('Перекупленность (Stochastic)');
  if (stochastic.k < 20 && stochastic.d < 20) signals.push('Перепроданность (Stochastic)');

  return {
    price: closes[closes.length - 1],
    sma5,
    sma15,
    rsi,
    stochastic,
    trend,
    levels,
    signals,
  };
}

// Поиск уровней поддержки и сопротивления (простейший метод)
function findSupportResistance(candles) {
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  // Найдем локальные максимумы и минимумы
  const levels = [];

  for (let i = 1; i < candles.length - 1; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) {
      levels.push({ type: 'resistance', value: highs[i] });
    }
    if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) {
      levels.push({ type: 'support', value: lows[i] });
    }
  }

  // Уникализируем уровни (с округлением до 5 знаков)
  const uniqueLevels = [];
  const set = new Set();

  for (const lvl of levels) {
    const key = `${lvl.type}-${lvl.value.toFixed(5)}`;
    if (!set.has(key)) {
      set.add(key);
      uniqueLevels.push(lvl);
    }
  }

  // Отсортируем уровни по значению цены
  uniqueLevels.sort((a, b) => a.value - b.value);

  return uniqueLevels;
}

// Генерация графика с помощью canvas
function generateChart(candles, symbol, timeframe, analysis) {
  const width = 800;
  const height = 400;
  const padding = 50;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Фон
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);

  // Рассчитаем цены для масштабирования
  const prices = candles.flatMap(c => [c.high, c.low]);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice;

  // Отрисовка осей
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Помощь для координат Y по цене
  function priceToY(price) {
    return height - padding - ((price - minPrice) / priceRange) * (height - 2 * padding);
  }

  // Отрисовка свечей
  const candleWidth = (width - 2 * padding) / candles.length * 0.7;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const x = padding + (i + 0.15) * ((width - 2 * padding) / candles.length);

    const openY = priceToY(c.open);
    const closeY = priceToY(c.close);
    const highY = priceToY(c.high);
    const lowY = priceToY(c.low);

    // Цвет свечи
    const isBull = c.close >= c.open;
    ctx.fillStyle = isBull ? '#4caf50' : '#f44336';
    ctx.strokeStyle = ctx.fillStyle;

    // Тело свечи
    ctx.fillRect(x, Math.min(openY, closeY), candleWidth, Math.abs(closeY - openY));

    // Тени
    ctx.beginPath();
    ctx.moveTo(x + candleWidth / 2, highY);
    ctx.lineTo(x + candleWidth / 2, lowY);
    ctx.stroke();
  }

  // Отрисовка SMA5 и SMA15
  const closes = candles.map(c => c.close);
  const sma5 = SMA.calculate({ period: CONFIG.indicators.smaShort, values: closes });
  const sma15 = SMA.calculate({ period: CONFIG.indicators.smaLong, values: closes });

  function drawLine(data, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      if (val === undefined) continue;
      const x = padding + ((i + (candles.length - data.length)) + 0.5) * ((width - 2 * padding) / candles.length);
      const y = priceToY(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawLine(sma5, '#2196f3'); // синий - SMA5
  drawLine(sma15, '#ff9800'); // оранжевый - SMA15

  // Отрисовка уровней поддержки/сопротивления
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.font = '12px Arial';
  ctx.fillStyle = '#555';

  analysis.levels.forEach(level => {
    const y = priceToY(level.value);
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    ctx.fillText(
      (level.type === 'support' ? 'Поддержка' : 'Сопротивление') + ` ${level.value.toFixed(5)}`,
      padding + 5,
      y - 5
    );
  });

  ctx.setLineDash([]);

  // Подписи
  ctx.fillStyle = '#000';
  ctx.font = '16px Arial';
  ctx.fillText(`${symbol} (${timeframe})`, padding, padding - 10);

  return canvas.toBuffer();
}

// Обработчики команд бота

bot.start((ctx) => {
  ctx.reply(
    `📊 Бот анализа валютных пар и OTC рынка с PocketOption\n\n` +
    `Доступные команды:\n` +
    `/analyze [инструмент] [таймфрейм] - Анализ (пример: /analyze EURUSD 1h или /analyze OTC:EURUSD 15m)\n` +
    `/pairs - Список доступных инструментов\n` +
    `/timeframes - Доступные таймфреймы\n\n` +
    `OTC инструменты помечены префиксом OTC:`
  );
});

bot.command('pairs', (ctx) => {
  let message = `💱 Доступные инструменты:\n\n`;
  message += `*Основные валютные пары:*\n`;
  message += CONFIG.symbols.filter(s => !s.includes('OTC:')).join(', ') + '\n\n';
  message += `*OTC валютные инструменты:*\n`;
  message += CONFIG.symbols.filter(s => s.includes('OTC:')).join(', ');
  
  ctx.replyWithMarkdown(message);
});

bot.command('timeframes', (ctx) => {
  ctx.reply(`⏳ Доступные таймфреймы:\n${CONFIG.timeframes.join(', ')}`);
});

bot.command('analyze', async (ctx) => {
  const args = ctx.message.text.split(' ');
  const symbol = args[1]?.toUpperCase();
  const timeframe = args[2];
  
  if (!symbol || !timeframe || !CONFIG.symbols.includes(symbol) || !CONFIG.timeframes.includes(timeframe)) {
    return ctx.replyWithMarkdown(
      `❌ Неверные параметры. Используйте:\n` +
      `/analyze [инструмент] [таймфрейм]\n` +
      `Примеры:\n` +
      `/analyze EURUSD 1h - Основная пара\n` +
      `/analyze OTC:EURUSD 15m - OTC инструмент\n\n` +
      `Списки: /pairs и /timeframes`
    );
  }

  try {
    const loadingMsg = await ctx.reply('🔍 Анализирую...');
    
    // Получаем данные
    const candles = await getPocketOptionData(symbol, timeframe);
    
    if (candles.length === 0) {
      await ctx.deleteMessage(loadingMsg.message_id);
      return ctx.reply('⚠️ Не удалось получить данные для этого инструмента');
    }

    // Анализируем
    const analysis = analyzeMarket(candles);
    
    // Генерируем график
    const chartBuffer = generateChart(candles.slice(-50), symbol, timeframe, analysis);
    
    // Формируем текстовый анализ
    let analysisText = `📊 *${symbol.replace('OTC:', '')} ${symbol.includes('OTC:') ? '(OTC)' : ''} (${timeframe})*\n`;
    analysisText += `📈 Цена: ${analysis.price.toFixed(5)}\n`;
    analysisText += `🔷 Тренд: ${analysis.trend}\n\n`;
    
    analysisText += `*Индикаторы:*\n`;
    analysisText += `- SMA5: ${analysis.sma5.toFixed(5)}\n`;
    analysisText += `- SMA15: ${analysis.sma15.toFixed(5)}\n`;
    analysisText += `- RSI: ${analysis.rsi.toFixed(2)} ${analysis.rsi > 70 ? '🔴' : analysis.rsi < 30 ? '🟢' : '⚪'}\n`;
    analysisText += `- Stochastic: K=${analysis.stochastic.k.toFixed(2)}, D=${analysis.stochastic.d.toFixed(2)}\n\n`;
    
    if (analysis.levels.length > 0) {
      analysisText += `*Уровни:*\n`;
      analysis.levels.slice(0, 3).forEach(level => {
        const distance = ((analysis.price - level.value) / level.value * 100).toFixed(2);
        analysisText += `- ${level.type === 'support' ? '🛟 Поддержка' : '🚧 Сопротивление'}: ${level.value.toFixed(5)} (${distance}%)\n`;
      });
    }
    
    if (analysis.signals.length > 0) {
      analysisText += `\n📢 *Сигналы:*\n${analysis.signals.map(s => `• ${s}`).join('\n')}\n`;
    }
    
    // Отправляем результат
    await ctx.deleteMessage(loadingMsg.message_id);
    await ctx.replyWithPhoto(
      { source: chartBuffer },
      { caption: analysisText, parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    console.error('Ошибка анализа:', error);
    ctx.reply('⚠️ Произошла ошибка. Попробуйте снова через минуту.');
  }
});

// Запуск бота
bot.launch().then(() => {
  console.log('Бот запущен (Валюты + OTC)');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
