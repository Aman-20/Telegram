// bot.js
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const {
  TELEGRAM_TOKEN,
  MONGODB_URI,
  ADMIN_IDS = '', // comma-separated Telegram IDs of admins
  DAILY_LIMIT = '10',
  RESULTS_PER_PAGE = '10'
} = process.env;

if (!TELEGRAM_TOKEN || !MONGODB_URI) {
  throw new Error("Missing TELEGRAM_TOKEN or MONGODB_URI in .env");
}

const adminIds = ADMIN_IDS.split(',').map(id => id.trim());

// MongoDB setup
const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db('telegram_bot');
const filesCollection = db.collection('files');
const limitsCollection = db.collection('daily_limits');

// Telegram bot setup (polling)
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('🤖 Bot started with polling');

// ------------------- Helper Functions -------------------

async function incrementUserLimit(userId) {
  const today = new Date().toISOString().split('T')[0];

  const result = await limitsCollection.findOneAndUpdate(
    { userId, date: today },
    { $inc: { count: 1 } },
    { upsert: true, returnDocument: 'after' }
  );

  // Handle case when result.value is null (new document)
  if (!result.value) {
    // The document was just created
    const doc = await limitsCollection.findOne({ userId, date: today });
    return doc.count;
  }

  return result.value.count;
}


async function checkDailyLimit(userId) {
  const today = new Date().toISOString().split('T')[0];
  const limit = await limitsCollection.findOne({ userId, date: today });
  return limit?.count || 0;
}


async function searchFiles(keyword) {
  const keywordLower = keyword.trim().toLowerCase();
  console.log("Searching for keyword:", keywordLower);

  return await filesCollection.find({
    keywords: { $elemMatch: { $regex: `.*${keywordLower}.*`, $options: 'i' } }
  }).toArray();
}


// ------------------- Bot Handlers -------------------

// /start command - send greeting and menu
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "User";

  const startMessage = `
👋 Hello *${firstName}*!

Welcome to the File Search Bot.  
You can easily search and download files by typing keywords.

📌 Here are some useful commands:
- 🔍 Just type any keyword (e.g., \`war\`, \`movie\`) to search files

- 🏁 /start → Restart the bot
- 📖 /help → Show how to use this bot
- 👤 /myaccount → Check your daily usage limit
`;

  await bot.sendMessage(chatId, startMessage, {
    parse_mode: "Markdown",
    reply_markup: {
      keyboard: [
        [{ text: "/help" }, { text: "/myaccount" }],
        [{ text: "latest movie" }]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  });
});


const userSearchResults = new Map();

// Handle all incoming messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Skip if this is just a command (we already handled /start)
  if (msg.text?.startsWith('/')) return;

  // If it's a file (document, video, audio, photo, etc.)
  if (msg.document || msg.video || msg.audio || msg.photo) {
    if (!ADMIN_IDS.includes(userId.toString())) {
      await bot.sendMessage(
        chatId,
        "🙏 Thank you for sharing, but only admins can upload files here.\nYou can search and download files using keywords."
      );
      return;
    }
  }

  // Admin file upload
  if (adminIds.includes(userId.toString()) && (msg.document || msg.photo || msg.video || msg.audio)) {
    const fileId = msg.document?.file_id || msg.photo?.[msg.photo.length - 1].file_id || msg.video?.file_id || msg.audio?.file_id;
    const fileName = msg.document?.file_name || msg.video?.file_name || msg.audio?.file_name || 'file';
    const caption = msg.caption || '';

    // Split keywords by spaces or commas, trim, lowercase, remove empty
    const keywords = caption
      .split(/[\s,]+/)
      .map(k => k.trim().toLowerCase())
      .filter(k => k);

    if (!keywords.length) {
      return bot.sendMessage(chatId, '⚠️ Please add keywords in the caption separated by spaces or commas.');
    }

    await filesCollection.insertOne({
      file_id: fileId,
      file_name: fileName,
      keywords,
      caption: caption || '',   // <-- store the caption
      type: msg.document ? 'document' :
        msg.photo ? 'photo' :
          msg.video ? 'video' :
            msg.audio ? 'audio' : 'unknown',
      addedBy: userId,
      addedAt: new Date()
    });

    console.log("Stored keywords:", keywords);

    return bot.sendMessage(chatId, `✅ File saved!\nFile ID: ${fileId}\nKeywords: ${keywords.join(', ')}`);
  }


  // Normal user search
  const dailyCount = await checkDailyLimit(userId);
  if (dailyCount >= Number(DAILY_LIMIT)) {
    return bot.sendMessage(chatId, `⚠️ You reached your daily limit of ${DAILY_LIMIT} files.`);
  }

  const keyword = msg.text;
  bot.sendMessage(chatId, `🔎 Searching for "${keyword}"...`);

  const keywordList = keyword
    .split(/[\s,]+/)       // split by space or comma
    .map(k => k.trim().toLowerCase())
    .filter(k => k);

  const results = await filesCollection.find({
    keywords: { $in: keywordList } // matches any keyword in the list
  }).toArray();

  if (!results.length) {
    return bot.sendMessage(chatId, '❌ No files found.');
  }


  // Limit to RESULTS_PER_PAGE
  const limitedResults = results.slice(0, Number(RESULTS_PER_PAGE));

  // Store in global Map keyed by userId
  userSearchResults.set(userId, limitedResults);

  // Optional: auto-delete after 5 minutes
  setTimeout(() => userSearchResults.delete(userId), 5 * 60 * 1000);

  const options = {
    reply_markup: {
      inline_keyboard: limitedResults.map((f, index) => [
        { text: f.file_name, callback_data: index.toString() }
      ])
    }
  };

  bot.sendMessage(chatId, `Found ${results.length} file(s). Select one:`, options);
});

// Handle user selecting a file from inline keyboard
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const index = parseInt(query.data);

  //remove this 
  if (query.data === "search_war") {
    await bot.sendMessage(chatId, "🔎 Searching for 'war'...");
    // ⬇️ Call your existing search logic here
    // e.g., await searchFiles(chatId, "war");
  }
  
  await bot.answerCallbackQuery(query.id);



  const userResults = userSearchResults.get(userId);
  if (!userResults || !userResults[index]) {
    return bot.sendMessage(chatId, '❌ File not found or expired.');
  }

  const file = userResults[index];

  const dailyCount = await incrementUserLimit(userId);
  if (dailyCount > Number(DAILY_LIMIT)) {
    return bot.sendMessage(chatId, `⚠️ You reached your daily limit of ${DAILY_LIMIT} files.`);
  }

  bot.sendMessage(chatId, '📤 Sending your file...');

  // Try sending file depending on type
  try {
    if (file.type === 'document') {
      await bot.sendDocument(chatId, file.file_id, { caption: file.caption || file.file_name });
    } else if (file.type === 'video') {
      await bot.sendVideo(chatId, file.file_id, { caption: file.caption || file.file_name });
    } else if (file.type === 'audio') {
      await bot.sendAudio(chatId, file.file_id, { caption: file.caption || file.file_name });
    } else if (file.type === 'photo') {
      await bot.sendPhoto(chatId, file.file_id, { caption: file.caption || file.file_name });
    } else {
      throw new Error('Unknown file type');
    }
  } catch (err) {
    console.error('Error sending file:', err);
    await bot.sendMessage(chatId, '❌ Failed to send file.');
  }

});

bot.onText(/\/delete (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const fileId = match[1].trim();

  // Check admin
  if (!ADMIN_IDS.includes(userId.toString())) {
    return bot.sendMessage(chatId, "❌ You are not allowed to delete files.");
  }

  try {
    const result = await filesCollection.deleteOne({ file_id: fileId });
    if (result.deletedCount > 0) {
      await bot.sendMessage(chatId, `🗑 File with ID *${fileId}* deleted successfully.`, { parse_mode: "Markdown" });
    } else {
      await bot.sendMessage(chatId, "⚠️ No file found with that ID.");
    }
  } catch (err) {
    console.error("Error deleting file:", err);
    await bot.sendMessage(chatId, "❌ Failed to delete file.");
  }
});


bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  const helpMessage = `
📖 *How to Use This Bot*

- Type a keyword (e.g. \`war\`, \`movie\`, \`action\`) to search.
- You’ll see matching results and can click to download.
- You can search with multiple words.

⚠️ *Daily Limit*: You can download up to *${DAILY_LIMIT}* files per day. Limit resets at midnight.
`;

  await bot.sendMessage(chatId, helpMessage, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔍 Try Example: Avatar", callback_data: "search_avatar" }]
      ]
    }
  });
});

bot.onText(/\/myaccount/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const today = new Date().toISOString().split('T')[0];

  try {
    const doc = await limitsCollection.findOne({ userId, date: today });

    const used = doc ? doc.count : 0;
    const remaining = DAILY_LIMIT - used;

    const accountMessage = `
👤 *Your Account Details*

📅 Date: *${today}*
✅ Used: *${used}* files
⏳ Remaining: *${remaining}* files
🎯 Daily Limit: *${DAILY_LIMIT}* files

🔄 Limit resets every midnight.
    `;

    await bot.sendMessage(chatId, accountMessage, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Error fetching account:", err);
    await bot.sendMessage(chatId, "❌ Failed to fetch your account details.");
  }
});


// Define menu commands
bot.setMyCommands([
  { command: "/start", description: "Start the bot" },
  { command: "/help", description: "How to use the bot" },
  { command: "/account", description: "Check your usage limit" },
  { command: "/delete", description: "Delete a file (Admin only)" }
])
.then(() => {
  console.log("✅ Bot menu commands set successfully!");
})
.catch(err => {
  console.error("❌ Failed to set bot commands:", err);
});
