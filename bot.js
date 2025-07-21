import { Telegraf } from 'telegraf';
import axios from 'axios';

// Ваш токен Telegram-бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// Пример функции анализа, замените на вашу логику
function analyzeCandles(candles) {
  // Простой пример: если последний close выше предыдущего — "Рост", иначе "Падение"
  if (candles.length < 2) return 'Недостаточно данных для анализа.';
  const last = candles[candles.length - 1].close;
  const prev = candles[candles.length - 2].close;
  return last > prev ? 'Тренд: рост 📈' : 'Тренд: падение 📉';
}

// Функция генерации графика через QuickChart
async function generateChartQuickChart(candles, symbol, timeframe) {
  const labels = candles.map(c => new Date(c.time).toLocaleTimeString());
  const prices = candles.map(c => c.close);

  const chartConfig = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `${symbol} Close Price`,
          data: prices,
          borderColor: 'rgba(33, 150, 243, 1)',
          backgroundColor: 'rgba(33, 150, 243, 0.2)',
          fill: true,
          tension: 0.1,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `${symbol} (${timeframe})`,
          font: { size: 18 },
        },
      },
      scales: {
        x: { display: true },
        y: { display: true },
      },
    },
  };

  const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
  const url = `https://quickchart.io/chart?c=${encodedConfig}&format=png&width=800&height=400`;

  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data, 'binary');
}

// Пример функции получения свечей, замените на ваш источник данных
async function fetchCandles(symbol, timeframe) {
  // Заглушка: генерируем фиктивные данные
  const now = Date.now();
  const candles = [];
  for (let i = 50; i > 0; i--) {
    candles.push({
      time: now - i * 60000, // минута назад
      close: 100 + Math.sin(i / 5) * 5 + Math.random() * 2,
    });
  }
  return candles;
}

// Обработчик команды /analyze
bot.command('analyze', async (ctx) => {
  try {
    // Разбор параметров команды, например: /analyze BTCUSDT 1m
    const args = ctx.message.text.split(' ');
    const symbol = args[1] || 'BTCUSDT';
    const timeframe = args[2] || '1m';

    const candles = await fetchCandles(symbol, timeframe);
    if (!candles || candles.length === 0) {
      return ctx.reply('Не удалось получить данные по свечам.');
    }

    const analysisText = analyzeCandles(candles);
    const chartBuffer = await generateChartQuickChart(candles, symbol, timeframe);

    await ctx.replyWithPhoto(
      { source: chartBuffer },
      { caption: analysisText, parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error(error);
    await ctx.reply('Произошла ошибка при обработке запроса.');
  }
});

bot.launch();

console.log('Bot started');
