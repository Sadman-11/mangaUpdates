const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot('BOT_TOKEN', { polling: true });

async function getMangaReleases() {
  const apiUrl = `https://api.mangaupdates.com/v1/releases/days`;

  try {
    const response = await axios.get(apiUrl);
    const { results } = response.data;

    return results;
  } catch (error) {
    console.error('Failed to fetch manga releases:', error);
    return [];
  }
}

function createInlineKeyboardMarkup(currentPage) {
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: 'Next',
          callback_data: 'next',
        },
      ],
    ],
  };

  if (currentPage > 1) {
    keyboard.inline_keyboard.unshift([
      {
        text: 'Previous',
        callback_data: 'previous',
      },
    ]);
  }

  return keyboard;
}

bot.onText(/\/mangaupdates/, async (msg) => {
  const chatId = msg.chat.id;
  const page = 1;

  try {
    const releases = await getMangaReleases();


    if (releases.length === 0) {
      bot.sendMessage(chatId, 'No manga releases found.');
      return;
    }

    const chunkSize = 5; // Number of releases per page
    const pages = [];
    let currentChunk = [];

    for (const release of releases) {
      if (currentChunk.length === chunkSize) {
        pages.push(currentChunk);
        currentChunk = [];
      }
      currentChunk.push(release);
    }

    if (currentChunk.length > 0) {
      pages.push(currentChunk);
    }

    let currentPage = page;
    let markup = createInlineKeyboardMarkup(currentPage, pages.length);

    bot.on('callback_query', async (query) => {
      const data = query.data;

      if (data === 'next' && currentPage < pages.length) {
        currentPage++;
      } else if (data === 'previous' && currentPage > 1) {
        currentPage--;
      }

      markup = createInlineKeyboardMarkup(currentPage, pages.length);

      await bot.editMessageText(messageText(pages[currentPage - 1]), {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: markup,
        parse_mode: 'HTML',
      });
    });
    await bot.sendMessage(chatId, messageText(pages[currentPage - 1]), {
      reply_markup: markup,
      parse_mode: 'HTML',
    });
  } catch (error) {
    console.error('Error processing /mangaupdates command:', error);
    bot.sendMessage(chatId, 'An error occurred while fetching manga releases.');
  }
});

function messageText(releases) {
  console.log(releases);
  let messageText = 'Latest Manga Releases:\n\n';

  for (const release of releases) {
    const { record } = release;
    messageText += `Title: ${record.title}\n`;
    messageText += `Chapter: ${record.chapter}\n`;
    messageText += `Release Date: ${record.release_date}\n`;
    messageText += '\n';
  }

  return messageText;
}
