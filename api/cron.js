const { Telegraf } = require('telegraf');
const { User, connectDB } = require('../src/db');
const content = require('../src/content');
const { getMainMenu } = require('../src/bot');

module.exports = async (request, response) => {
    if (!process.env.BOT_TOKEN) {
        return response.status(500).send('BOT_TOKEN missing');
    }

    try {
        await connectDB();
        const bot = new Telegraf(process.env.BOT_TOKEN);
        
        // Find users who are still 'pending'
        const pendingUsers = await User.find({ status: 'pending' });
        const now = new Date();
        
        let sentCount = 0;

        for (const user of pendingUsers) {
            const hoursSinceStart = (now - user.startedAt) / (1000 * 60 * 60);
            let messageToSend = null;
            let nextStep = user.followUpStep;

            if (user.followUpStep === 0 && hoursSinceStart >= 1) {
                // Send first message after >= 1 hour
                messageToSend = content.followUpMessages[0];
                nextStep = 1;
            } else if (user.followUpStep === 1 && hoursSinceStart >= 24) {
                // Send second message after >= 24 hours
                messageToSend = content.followUpMessages[1];
                nextStep = 2;
            } else if (user.followUpStep === 2 && hoursSinceStart >= 48) {
                // Send third message after >= 48 hours
                messageToSend = content.followUpMessages[2];
                nextStep = 3;
            }

            if (messageToSend) {
                try {
                    await bot.telegram.sendMessage(user.chatId, messageToSend, {
                        parse_mode: 'Markdown',
                        ...getMainMenu()
                    });
                    
                    user.followUpStep = nextStep;
                    await user.save();
                    sentCount++;
                    
                    // Small delay to prevent Telegram rate limit blocking
                    await new Promise(res => setTimeout(res, 50)); 
                } catch (err) {
                    console.error(`Failed to send to ${user.chatId}:`, err.message);
                    // Stop trying if they blocked the bot
                    if (err.message.includes('bot was blocked by the user') || err.message.includes('chat not found')) {
                        user.status = 'blocked';
                        await user.save();
                    }
                }
            }
        }

        response.status(200).send(`Cron executed successfully. Follow-ups sent: ${sentCount}`);
    } catch (error) {
        console.error('Cron Error:', error);
        response.status(500).send('Cron failed');
    }
};
