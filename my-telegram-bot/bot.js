import { Telegraf, Markup, session } from 'telegraf';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import annotationPlugin from 'chartjs-plugin-annotation';
import marketDataClient from './wsClient.js'; // импорт клиента

// Вставьте сюда остальные ваши функции и константы (calculateSMA, calculateRSI, generateChartImage, displayNames, languages, и т.п.)
// Ниже — пример ключевой части с обработкой callback_query:

const bot = new Telegraf('8072367890:AAG2YD0mCajiB8JSstVuozeFtfosURGvzlk');
bot.use(session());

// Вспомогательная функция для разбивки массива на чанки
function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// Здесь должны быть ваши данные и функции:
// const displayNames = {...};
// const languages = {...};
// const historyData = {...};
// function calculateSMA(...) {...}
// function calculateRSI(...) {...}
// function calculateMACD(...) {...}
// function calculateStochastic(...) {...}
// function findSupportResistance(...) {...}
// function generateChartImage(...) {...}
// function analyzeIndicators(...) {...}
// async function sendPairSelection(ctx, lang) {...}

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const lang = ctx.session.lang || 'ru';
  const langData = languages[lang];

  if (data === 'noop') {
    await ctx.answerCbQuery();
    return;
  }

  if (data === 'next_analysis') {
    await ctx.answerCbQuery();
    ctx.session.pair = null;
    ctx.session.timeframe = null;
    await sendPairSelection(ctx, lang);
    return;
  }

  const pairEntry = Object.entries(displayNames).find(([, names]) => names[lang] === data);
  if (pairEntry) {
    const pair = pairEntry[0];
    ctx.session.pair = pair;
    await ctx.answerCbQuery();

    const tfButtons = langData.timeframes.map(tf => Markup.button.callback(tf.label, tf.label));
    const inlineTfButtons = chunkArray(tfButtons, 2);

    await ctx.editMessageText(langData.texts.chooseTimeframe, Markup.inlineKeyboard(inlineTfButtons));
    return;
  }

  const tf = langData.timeframes.find(t => t.label === data);
  if (tf) {
    if (!ctx.session.pair) {
      await ctx.answerCbQuery(langData.texts.pleaseChoosePairFirst);
      return;
    }
    ctx.session.timeframe = tf;
    await ctx.answerCbQuery();

    await ctx.editMessageText(langData.texts.analysisStarting(displayNames[ctx.session.pair][lang], tf.label));

    // Преобразуем таймфрейм в секунды
    let periodSec;
    switch(tf.value) {
      case '1m': periodSec = 60; break;
      case '5m': periodSec = 300; break;
      case '15m': periodSec = 900; break;
      case '1h': periodSec = 3600; break;
      case '4h': periodSec = 14400; break;
      case '1d': periodSec = 86400; break;
      default: periodSec = 60;
    }

    // Преобразование имени актива для демо-сервера
    let assetName = ctx.session.pair;
    if (assetName.startsWith('OTC_')) {
      assetName = assetName.replace('OTC_', '') + '_otc';
    }

    // Запрашиваем последние 100 свечей
    const candles = await marketDataClient.fetchCandleData(assetName, periodSec, 100);

    if (candles.length === 0) {
      await ctx.reply(langData.texts.errorGeneratingChart);
      return;
    }

    historyData[`${ctx.session.pair}_${tf.value}`] = candles;

    const closes = candles.map(k => k.close);
    const sma5 = calculateSMA(closes, 5);
    const sma15 = calculateSMA(closes, 15);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const stochastic = calculateStochastic(candles);
    const { supports, resistances } = findSupportResistance(candles);

    try {
      const imageBuffer = await generateChartImage(candles, sma5, sma15, supports, resistances, ctx.session.pair, tf.label, lang);
      await ctx.replyWithPhoto({ source: imageBuffer });
    } catch (e) {
      console.error('Ошибка генерации графика:', e);
      await ctx.reply(langData.texts.errorGeneratingChart);
    }

    const analysisText = analyzeIndicators(candles, sma5, sma15, rsi, macd, stochastic, supports, resistances, lang);
    await ctx.reply(analysisText, Markup.inlineKeyboard([
      Markup.button.callback(langData.texts.nextAnalysis, 'next_analysis')
    ]));

    return;
  }

  await ctx.answerCbQuery(langData.texts.unknownCmd);
});

// Запуск бота
bot.launch();
console.log('Бот запущен и готов к работе');
