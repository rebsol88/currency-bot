iMac-Apple:api user$ node telegram.js
Бот запущен и готов к работе
Unhandled error while processing {
  update_id: 842338585,
  callback_query: {
    id: '1361381341992615217',
    from: {
      id: 316971294,
      is_bot: false,
      first_name: 'Кирилл',
      username: 'rebsol88',
      language_code: 'ru'
    },
    message: {
      message_id: 720,
      from: [Object],
      chat: [Object],
      date: 1753687689,
      edit_date: 1753687690,
      text: 'Выберите валютную пару:',
      reply_markup: [Object]
    },
    chat_instance: '-7444996521262177585',
    data: 'lang_ru'
  }
}
/Users/user/Downloads/currency-bot/currency-bot/api/node_modules/telegraf/lib/core/network/client.js:315
            throw new error_1.default(data, { method, payload });
                  ^

TelegramError: 400: Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message
    at Telegram.callApi (/Users/user/Downloads/currency-bot/currency-bot/api/node_modules/telegraf/lib/core/network/client.js:315:19)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async sendPairSelection (file:///Users/user/Downloads/currency-bot/currency-bot/api/telegram.js:255:3)
    at async file:///Users/user/Downloads/currency-bot/currency-bot/api/telegram.js:279:3
    at async execute (/Users/user/Downloads/currency-bot/currency-bot/api/node_modules/telegraf/lib/composer.js:518:17)
    at async /Users/user/Downloads/currency-bot/currency-bot/api/node_modules/telegraf/lib/composer.js:519:21
    at async execute (/Users/user/Downloads/currency-bot/currency-bot/api/node_modules/telegraf/lib/composer.js:518:17)
    at async /Users/user/Downloads/currency-bot/currency-bot/api/node_modules/telegraf/lib/composer.js:519:21
    at async execute (/Users/user/Downloads/currency-bot/currency-bot/api/node_modules/telegraf/lib/composer.js:518:17)
    at async /Users/user/Downloads/currency-bot/currency-bot/api/node_modules/telegraf/lib/composer.js:519:21 {
  response: {
    ok: false,
    error_code: 400,
    description: 'Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message'
  },
  on: {
    method: 'editMessageText',
    payload: {
      chat_id: 316971294,
      message_id: 720,
      inline_message_id: undefined,
      reply_markup: {
        inline_keyboard: [
          [ [Object], [Object] ],
          [ [Object], [Object] ],
          [ [Object], [Object] ],
          [ [Object], [Object] ],
          [ [Object], [Object] ],
          [ [Object], [Object] ],
          [ [Object], [Object] ],
          [ [Object], [Object] ]
        ]
      },
      text: 'Выберите валютную пару:'
    }
  }
}
