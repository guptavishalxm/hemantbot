// This file is used for local development ONLY.
// Vercel uses api/webhook.js in production.

require('dotenv').config();
const { setupBot } = require('./src/bot');

const token = process.env.BOT_TOKEN;

if (!token) {
    console.error('Error: BOT_TOKEN is missing in the .env file.');
    process.exit(1);
}

const bot = setupBot(token);

// Launch the bot in polling mode for local testing
bot.launch().then(() => {
    console.log('🏏 Cricket Bot is running locally in polling mode!');
    console.log('Press Ctrl+C to stop.');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
