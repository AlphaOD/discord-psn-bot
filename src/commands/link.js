/**
 * Link Command - Connect PlayStation Network Account (No Auth Required)
 * 
 * Allows users to link their PSN username with the Discord bot
 * for public trophy tracking and notifications using PSN's public API
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PublicPSNApi = require('../utils/publicPsnApi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link your PlayStation Network username for trophy tracking')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Your PlayStation Network username (case-sensitive)')
                .setRequired(true)
                .setMaxLength(16)
                .setMinLength(3)),
    
    async execute(interaction) {
        const database = interaction.client.database;
        const logger = interaction.client.logger;
        const psnApi = new PublicPSNApi(logger);
        
        // Get username with comprehensive debugging and fallbacks
        let username;
        const discordUserId = interaction.user.id;
        
        // Debug: Log the entire interaction object structure
        logger.debug(`=== LINK COMMAND DEBUG ===`);
        logger.debug(`Interaction type: ${interaction.type}`);
        logger.debug(`Command name: ${interaction.commandName}`);
        logger.debug(`User ID: ${discordUserId}`);
        logger.debug(`Options object keys: ${Object.keys(interaction.options || {})}`);
        logger.debug(`Options.data: ${JSON.stringify(interaction.options?.data, null, 2)}`);
        logger.debug(`Options.focused: ${interaction.options?.focused}`);
        logger.debug(`Options.subcommand: ${interaction.options?.subcommand}`);
        
        // Try multiple methods to get the username
        try {
            // Method 1: Standard getString
            username = interaction.options.getString('username');
            logger.debug(`Method 1 (getString): ${JSON.stringify(username)}`);
            
            // Method 2: Direct from options.data
            if (!username && interaction.options?.data) {
                const usernameOption = interaction.options.data.find(opt => opt.name === 'username');
                username = usernameOption?.value || null;
                logger.debug(`Method 2 (options.data): ${JSON.stringify(username)}`);
            }
            
            // Method 3: Try to access as property
            if (!username && interaction.options?.username) {
                username = interaction.options.username;
                logger.debug(`Method 3 (options.username): ${JSON.stringify(username)}`);
            }
            
            // Method 4: Check if it's a focused option
            if (!username && interaction.options?.focused === 'username') {
                username = interaction.options.getFocused();
                logger.debug(`Method 4 (getFocused): ${JSON.stringify(username)}`);
            }
            
        } catch (error) {
            logger.error('Error retrieving username option:', error);
        }
        
        logger.debug(`Final username value: ${JSON.stringify(username)} (type: ${typeof username})`);
        logger.debug(`=== END DEBUG ===`);
        
        // Validate username is not null/undefined
        if (!username || typeof username !== 'string' || username.trim() === '') {
            logger.error(`Username validation failed - Username: "${username}", Type: ${typeof username}`);
            
            // Provide more helpful error message with troubleshooting steps
            const errorMessage = `❌ **Error:** Username parameter is missing or invalid.

**What happened:**
• The bot couldn't read your username parameter
• This is usually a Discord command registration issue

**Troubleshooting:**
1. **Try again** - Sometimes this fixes itself
2. **Check command format** - Use: \`/link username:EZIO84756\`
3. **Contact admin** - The command may need to be re-registered

**Technical Details:**
• Received: ${JSON.stringify(username)} (${typeof username})
• Command: ${interaction.commandName}
• User: ${interaction.user.tag}

**Note:** This is a Discord interaction issue, not a problem with your username.`;
            
            await interaction.reply({ 
                content: errorMessage,
                flags: 64 
            });
            return;
        }
        
        const trimmedUsername = username.trim();
        
        try {
            await interaction.deferReply({ flags: 64 }); // Ephemeral response
            
            // Check if Discord user already has a linked account
            let existingUser;
            try {
                existingUser = await database.getUser(discordUserId);
            } catch (dbError) {
                logger.error('Database error in link command:', dbError);
                
                const errorMessage = dbError.message.includes('no such table') 
                    ? '❌ Database not properly initialized. Please contact an administrator.'
                    : '❌ Database error occurred. Please try again later.';
                
                await interaction.editReply({ content: errorMessage });
                return;
            }
            
            if (existingUser && existingUser.psn_username) {
                const embed = new EmbedBuilder()
                    .setTitle('🔗 PSN Account Already Linked')
                    .setDescription(`Your Discord account is already linked to PSN username: **${existingUser.psn_username}**`)
                    .addFields([
                        {
                            name: '🏆 Trophy Tracking',
                            value: existingUser.notifications_enabled ? '✅ Enabled' : '❌ Disabled',
                            inline: true
                        },
                        {
                            name: '🔄 Last Check',
                            value: existingUser.last_trophy_check 
                                ? `<t:${existingUser.last_trophy_check}:R>`
                                : 'Never',
                            inline: true
                        }
                    ])
                    .setColor('#FF6B35')
                    .setFooter({ text: 'Use /unlink to change your linked account' });
                
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            
            // Check if PSN username is already linked to another Discord user
            try {
                const existingPsnUser = await database.getUserByPsnUsername(trimmedUsername);
                if (existingPsnUser && existingPsnUser.discord_id !== discordUserId) {
                    const embed = new EmbedBuilder()
                        .setTitle('❌ PSN Username Already Linked')
                        .setDescription(`The PSN username **${trimmedUsername}** is already linked to another Discord user.`)
                        .addFields([
                            {
                                name: 'ℹ️ What does this mean?',
                                value: 'Each PSN username can only be linked to one Discord account to prevent confusion and ensure accurate trophy tracking.'
                            },
                            {
                                name: '🔧 Solutions',
                                value: '• Double-check your PSN username spelling\\n• Use `/browse-player ${trimmedUsername}` to view public stats without linking\\n• Contact a server admin if you believe this is an error'
                            }
                        ])
                        .setColor('#FF4757')
                        .setFooter({ text: 'One PSN account per Discord user policy' });
                    
                    await interaction.editReply({ embeds: [embed] });
                    return;
                }
            } catch (error) {
                // If method doesn't exist yet, ignore and continue
                logger.debug('getUserByPsnUsername method not implemented yet');
            }
            
            // Validate PSN username exists using public API
            logger.info(`Validating PSN username: ${trimmedUsername} for Discord user: ${discordUserId}`);
            
            let psnAccountData;
            try {
                psnAccountData = await psnApi.validateUsername(trimmedUsername);
                
                if (!psnAccountData) {
                    // Debug logging
                    logger.debug(`PSN validation failed - Username: "${trimmedUsername}", Type: ${typeof trimmedUsername}`);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('❌ PSN Username Not Found')
                        .setDescription(`The PSN username **${trimmedUsername}** could not be found.`)
                        .addFields([
                            {
                                name: '🔍 Double-check your username',
                                value: '• PSN usernames are case-sensitive\\n• Make sure there are no typos\\n• Ensure the account is public or has recent activity'
                            },
                            {
                                name: '💡 Try these alternatives',
                                value: '• Use `/search-player ${trimmedUsername}` to find similar usernames\\n• Check your exact username on PlayStation.com\\n• Make sure your profile visibility allows public access'
                            }
                        ])
                        .setColor('#FF4757')
                        .setFooter({ text: 'PSN usernames must be exact matches' });
                    
                    await interaction.editReply({ embeds: [embed] });
                    return;
                }
                
                logger.info(`PSN account validated: ${psnAccountData.onlineId} (${psnAccountData.accountId})`);
                
            } catch (psnError) {
                logger.error('PSN validation error:', psnError);
                
                const embed = new EmbedBuilder()
                    .setTitle('❌ PSN Validation Failed')
                    .setDescription('Failed to validate your PSN username. This could be due to:')
                    .addFields([
                        {
                            name: '🔒 Account Privacy',
                            value: 'Your PlayStation account may have strict privacy settings that prevent public access.'
                        },
                        {
                            name: '🌐 Network Issues',
                            value: 'There may be temporary connectivity issues with PlayStation Network.'
                        },
                        {
                            name: '🔄 Try Again',
                            value: 'Please wait a moment and try the command again.'
                        }
                    ])
                    .setColor('#FF4757')
                    .setFooter({ text: 'Contact support if this problem persists' });
                
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            
            // Get user's public trophy summary to verify account accessibility
            let trophySummary;
            try {
                trophySummary = await psnApi.getUserTrophySummary(psnAccountData.accountId);
                logger.info(`Trophy summary retrieved: Level ${trophySummary.trophyLevel}, ${trophySummary.earnedTrophies.platinum} Platinum trophies`);
            } catch (trophyError) {
                logger.warn('Could not retrieve trophy summary:', trophyError.message);
                // Continue anyway - some accounts may have restricted trophy visibility
            }
            
            // Store the linked account in database
            try {
                if (existingUser) {
                    // Update existing user record
                    await database.updateUser(discordUserId, {
                        psn_username: psnAccountData.onlineId,
                        psn_account_id: psnAccountData.accountId,
                        updated_at: Math.floor(Date.now() / 1000)
                    });
                } else {
                    // Create new user record
                    await database.createUser(discordUserId, {
                        psn_username: psnAccountData.onlineId,
                        psn_account_id: psnAccountData.accountId,
                        notifications_enabled: 1,
                        last_trophy_check: 0
                    });
                }
                
                logger.info(`Successfully linked Discord user ${discordUserId} to PSN account ${psnAccountData.onlineId}`);
                
            } catch (dbError) {
                logger.error('Database error while linking account:', dbError);
                
                const embed = new EmbedBuilder()
                    .setTitle('❌ Database Error')
                    .setDescription('Failed to save your linked account. Please try again later.')
                    .setColor('#FF4757')
                    .setFooter({ text: 'Contact support if this problem persists' });
                
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            
            // Create success embed with account info
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ PSN Account Successfully Linked!')
                .setDescription(`Your Discord account has been linked to PSN username: **${psnAccountData.onlineId}**`)
                .setThumbnail(psnAccountData.avatarUrl || null)
                .addFields([
                    {
                        name: '🎮 PSN Account ID',
                        value: `\`${psnAccountData.accountId}\``,
                        inline: true
                    },
                    {
                        name: '🔔 Notifications',
                        value: '✅ Enabled',
                        inline: true
                    },
                    {
                        name: '🏆 Trophy Tracking',
                        value: '✅ Active',
                        inline: true
                    }
                ])
                .setColor('#00D2FF')
                .setFooter({ text: 'Trophy tracking will begin within 30 minutes' });
            
            // Add trophy summary if available
            if (trophySummary) {
                successEmbed.addFields([
                    {
                        name: '📊 Current Trophy Stats',
                        value: `**Level:** ${trophySummary.trophyLevel} | **Platinum:** ${trophySummary.earnedTrophies.platinum} | **Gold:** ${trophySummary.earnedTrophies.gold} | **Silver:** ${trophySummary.earnedTrophies.silver} | **Bronze:** ${trophySummary.earnedTrophies.bronze}`,
                        inline: false
                    }
                ]);
            }
            
            successEmbed.addFields([
                {
                    name: '📚 What\'s Next?',
                    value: '• Use `/profile` to view your detailed trophy stats\\n• Use `/check` to manually check for new trophies\\n• Use `/browse-player` to view any player\'s public profile\\n• The bot will automatically check for new trophies every 30 minutes',
                    inline: false
                }
            ]);
            
            await interaction.editReply({ embeds: [successEmbed] });
            
        } catch (error) {
            logger.error('Error in link command:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Unexpected Error')
                .setDescription('An unexpected error occurred while linking your account.')
                .addFields([
                    {
                        name: '🔧 What to do',
                        value: '• Please try the command again\\n• If the problem persists, contact a server administrator\\n• Check `/help linking` for troubleshooting tips'
                    }
                ])
                .setColor('#FF4757')
                .setFooter({ text: 'Error has been logged for investigation' });
            
            await interaction.editReply({ embeds: [embed] });
        }
    }
};