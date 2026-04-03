const { Telegraf, Markup } = require('telegraf');
const content = require('./content');

// Helper to create the main navigation markup
const getMainMenu = () => {
    return Markup.inlineKeyboard([
        // Direct links placed at the top for maximum visibility & conversion
        [Markup.button.url(content.channels[0].name, content.channels[0].url)],
        [Markup.button.url(content.channels[1].name, content.channels[1].url)],
        // Content buttons underneath to still satisfy Telegram Ad policies
        [
            Markup.button.callback('🏏 Daily Insights', 'action_insights'),
            Markup.button.callback('📚 Cricket Guide', 'action_education')
        ]
    ]);
};

// Main function to initialize and provide the bot
const setupBot = (token) => {
    const bot = new Telegraf(token);

    bot.start(async (ctx) => {
        try {
            await ctx.replyWithPhoto(
                { url: content.welcomeImage },
                {
                    caption: content.welcomeMessage,
                    parse_mode: 'Markdown',
                    ...getMainMenu()
                }
            );
        } catch (error) {
            console.error('Error in /start:', error);
            // Fallback without photo if image fails
            await ctx.reply(content.welcomeMessage, {
                parse_mode: 'Markdown',
                ...getMainMenu()
            });
        }
    });

    bot.action('action_insights', async (ctx) => {
        try {
            await ctx.editMessageCaption(
                content.insightsMessage,
                {
                    parse_mode: 'Markdown',
                    ...getMainMenu()
                }
            );
        } catch (error) {
            // If the message is the same, Telegram throws an error. We ignore it.
            if (!error.message.includes('message is not modified')) {
                console.error(error);
            }
        }
        await ctx.answerCbQuery();
    });

    bot.action('action_education', async (ctx) => {
        try {
            await ctx.editMessageCaption(
                content.educationMessage,
                {
                    parse_mode: 'Markdown',
                    ...getMainMenu()
                }
            );
        } catch (error) {
            if (!error.message.includes('message is not modified')) {
                console.error(error);
            }
        }
        await ctx.answerCbQuery();
    });

    return bot;
};

module.exports = { setupBot };
