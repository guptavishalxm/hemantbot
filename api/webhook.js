const { setupBot } = require('../src/bot');

// Make sure that we only initialize one bot instance
let bot;

module.exports = async (request, response) => {
    try {
        if (!bot) {
            if (!process.env.BOT_TOKEN) {
                console.error('BOT_TOKEN is missing');
                return response.status(500).send('Configuration Error');
            }
            bot = setupBot(process.env.BOT_TOKEN);
        }

        // When receiving a webhook request from Telegram
        if (request.method === 'POST') {
            await bot.handleUpdate(request.body, response);
        } else {
            // A simple health check route
            response.status(200).send('🏏 Cricket Bot is running successfully!');
        }
    } catch (error) {
        console.error('Error handling webhook update:', error);
        // It's important to respond 200 OK so Telegram doesn't retry
        response.status(200).send('OK');
    }
};
