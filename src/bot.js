const { Telegraf, Markup } = require('telegraf');
const content = require('./content');
const { User, connectDB } = require('./db');

// Helper to create the main navigation markup
const getMainMenu = () => {
    return Markup.inlineKeyboard([
        // Direct links placed at the top for maximum visibility & conversion
        [Markup.button.url(content.channels[0].name, content.channels[0].url)],
        [Markup.button.url(content.channels[1].name, content.channels[1].url)],
        // Content buttons underneath to still satisfy Telegram Ad policies
        [
            Markup.button.callback('🏏 Aaj ki Insights', 'action_insights'),
            Markup.button.callback('📚 Cricket Guide', 'action_education')
        ]
    ]);
};

// Main function to initialize and provide the bot
const setupBot = (token) => {
    const bot = new Telegraf(token);

    // Track user when they start
    bot.start(async (ctx) => {
        try {
            await connectDB();
            
            // Save user to database if they don't exist
            const chatId = String(ctx.from.id);
            await User.findOneAndUpdate(
                { chatId },
                { 
                    $setOnInsert: { 
                        chatId, 
                        firstName: ctx.from.first_name,
                        username: ctx.from.username,
                        status: 'pending'
                    }
                },
                { upsert: true }
            );

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

    // Listen for users joining the channels (requires bot to be Admin in those channels)
    bot.on('chat_member', async (ctx) => {
        try {
            await connectDB();
            const newMember = ctx.chatMember.new_chat_member;
            
            // If they became a member or administrator
            if (newMember.status === 'member' || newMember.status === 'administrator') {
                const chatId = String(newMember.user.id);
                // Mark them as joined
                await User.findOneAndUpdate(
                    { chatId },
                    { status: 'joined' }
                );
                console.log(`User ${chatId} joined a channel. Marked as joined in DB.`);
            }
        } catch (error) {
            console.error('Error in chat_member:', error);
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

module.exports = { setupBot, getMainMenu };
