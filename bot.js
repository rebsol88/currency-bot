const { Telegraf } = require('telegraf');
const axios = require('axios');
const { createCanvas } = require('canvas');
const { SMA, RSI, Stochastic } = require('technicalindicators');

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

// [Остальной код остается БЕЗ ИЗМЕНЕНИЙ - функции getPocketOptionData, analyzeMarket, 
// findSupportResistance, generateChart из предыдущего примера]

// Обработчик команды /start
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

// Обработчик команды /pairs
bot.command('pairs', (ctx) => {
  let message = `💱 Доступные инструменты:\n\n`;
  message += `*Основные валютные пары:*\n`;
  message += CONFIG.symbols.filter(s => !s.includes('OTC:')).join(', ') + '\n\n';
  message += `*OTC валютные инструменты:*\n`;
  message += CONFIG.symbols.filter(s => s.includes('OTC:')).join(', ');
  
  ctx.replyWithMarkdown(message);
});

// Обработчик команды /timeframes
bot.command('timeframes', (ctx) => {
  ctx.reply(`⏳ Доступные таймфреймы:\n${CONFIG.timeframes.join(', ')}`);
});

// Обработчик команды /analyze
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
