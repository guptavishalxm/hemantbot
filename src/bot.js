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

    bot.command('broadcast', async (ctx) => {
        try {
            await connectDB();
            
            // 1. Authenticate Admin (allow multiple comma-separated IDs)
            const adminIds = (process.env.ADMIN_ID || '').split(',').map(id => id.trim());
            if (!adminIds.includes(String(ctx.from.id))) {
                // Optional: return ctx.reply('Unauthorized.');
                return;
            }

            // 2. Fetch all users to broadcast to
            const users = await User.find({ status: { $ne: 'blocked' } });
            if (users.length === 0) {
                return ctx.reply('No active users found in database.');
            }

            // 3. Determine if admin replied or typed text
            const isReply = !!ctx.message.reply_to_message;
            let textMsg = '';
            
            if (!isReply) {
                textMsg = ctx.message.text.replace('/broadcast', '').trim();
                if (!textMsg) {
                    return ctx.reply('Please reply to a message with /broadcast OR type /broadcast <message>');
                }
            }

            const statusMsg = await ctx.reply(`Starting broadcast to ${users.length} users... (This may take some time)`);

            let successCount = 0;
            let failCount = 0;

            // 4. Safely broadcast to every user
            for (const user of users) {
                try {
                    if (isReply) {
                        // copyMessage preserves formatting, photos, videos, buttons perfectly
                        await ctx.telegram.copyMessage(
                            user.chatId,
                            ctx.chat.id,
                            ctx.message.reply_to_message.message_id
                        );
                    } else {
                        // Sending standard message
                        await ctx.telegram.sendMessage(user.chatId, textMsg, {
                            parse_mode: 'Markdown'
                        });
                    }
                    successCount++;
                    
                    // Crucial: sleep 40ms to avoid breaking Telegram's 30 msgs/sec limit
                    await new Promise(res => setTimeout(res, 40));
                } catch (error) {
                    failCount++;
                    // If they blocked the bot, we can mark them so we skip them next time
                    if (error.message.includes('bot was blocked') || error.message.includes('chat not found')) {
                        try {
                           user.status = 'blocked';
                           await user.save();
                        } catch(e) {}
                    }
                }
            }

            // Update admin upon completion
            await ctx.telegram.editMessageText(
                ctx.chat.id, 
                statusMsg.message_id, 
                undefined, 
                `✅ *Broadcast Complete*\n\n*Success:* ${successCount}\n*Failed/Blocked:* ${failCount}`,
                { parse_mode: 'Markdown' }
            );

        } catch (globalError) {
            console.error('Broadcast Error:', globalError);
            ctx.reply('An error occurred during broadcasting.');
        }
    });

    return bot;
};

module.exports = { setupBot, getMainMenu };
