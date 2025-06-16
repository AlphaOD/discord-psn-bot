/**
 * Interaction Create Event Handler
 * 
 * Handles all Discord interactions including slash commands, buttons, and select menus
 * Provides proper error handling and logging for command execution
 */

const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        const logger = interaction.client.logger;
        
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            
            if (!command) {
                logger.warn(`No command matching ${interaction.commandName} was found`);
                return;
            }
            
            // Check channel restrictions (skip for restrict command itself)
            if (interaction.commandName !== 'restrict') {
                try {
                    const { isChannelAllowed } = require('../commands/restrict');
                    const allowed = await isChannelAllowed(interaction, interaction.client.database);
                    
                    if (!allowed) {
                        await interaction.reply({
                            content: '❌ This bot is restricted to specific channels in this server. Contact an administrator for access.',
                            ephemeral: true
                        });
                        return;
                    }
                } catch (restrictError) {
                    logger.error('Error checking channel restrictions:', restrictError);
                    // Continue anyway - don't block commands due to restriction check errors
                }
            }
            
            try {
                logger.logCommand(
                    interaction.commandName,
                    interaction.user.id,
                    interaction.guild?.id || 'DM',
                    true
                );
                
                await command.execute(interaction);
                
            } catch (error) {
                logger.error(`Error executing command ${interaction.commandName}:`, error);
                
                logger.logCommand(
                    interaction.commandName,
                    interaction.user.id,
                    interaction.guild?.id || 'DM',
                    false
                );
                
                const errorMessage = {
                    content: '❌ There was an error while executing this command!',
                    ephemeral: true
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }
        
        // Handle button interactions
        else if (interaction.isButton()) {
            logger.debug(`Button interaction: ${interaction.customId} by ${interaction.user.tag}`);
            
            try {
                // Handle common button interactions here
                if (interaction.customId.startsWith('psn_auth_')) {
                    // Handle PSN authentication button clicks
                    await handlePSNAuthButton(interaction);
                } else if (interaction.customId.startsWith('trophy_')) {
                    // Handle trophy-related button clicks
                    await handleTrophyButton(interaction);
                }
                
            } catch (error) {
                logger.error(`Error handling button interaction ${interaction.customId}:`, error);
                
                const errorMessage = {
                    content: '❌ There was an error processing your request!',
                    ephemeral: true
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }
        
        // Handle select menu interactions
        else if (interaction.isAnySelectMenu()) {
            logger.debug(`Select menu interaction: ${interaction.customId} by ${interaction.user.tag}`);
            
            try {
                // Handle select menu interactions here
                if (interaction.customId.startsWith('game_select_')) {
                    await handleGameSelect(interaction);
                } else if (interaction.customId.startsWith('trophy_filter_')) {
                    await handleTrophyFilter(interaction);
                }
                
            } catch (error) {
                logger.error(`Error handling select menu interaction ${interaction.customId}:`, error);
                
                const errorMessage = {
                    content: '❌ There was an error processing your selection!',
                    ephemeral: true
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }
        
        // Handle modal submit interactions
        else if (interaction.isModalSubmit()) {
            logger.debug(`Modal submit interaction: ${interaction.customId} by ${interaction.user.tag}`);
            
            try {
                if (interaction.customId === 'psn_token_modal') {
                    await handlePSNTokenModal(interaction);
                }
                
            } catch (error) {
                logger.error(`Error handling modal submit ${interaction.customId}:`, error);
                
                const errorMessage = {
                    content: '❌ There was an error processing your submission!',
                    ephemeral: true
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }
    }
};

/**
 * Handle PSN authentication button interactions
 * @param {Object} interaction - Discord interaction object
 */
async function handlePSNAuthButton(interaction) {
    const action = interaction.customId.split('_')[2];
    
    switch (action) {
        case 'start':
            // Show modal for NPSSO token input
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
            
            const modal = new ModalBuilder()
                .setCustomId('psn_token_modal')
                .setTitle('PlayStation Network Authentication');
            
            const tokenInput = new TextInputBuilder()
                .setCustomId('npsso_token')
                .setLabel('NPSSO Token')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter your 64-character NPSSO token')
                .setRequired(true)
                .setMaxLength(64)
                .setMinLength(64);
            
            const tokenRow = new ActionRowBuilder().addComponents(tokenInput);
            modal.addComponents(tokenRow);
            
            await interaction.showModal(modal);
            break;
            
        case 'help':
            await interaction.reply({
                content: `
📋 **How to get your NPSSO Token:**

1. Go to https://my.playstation.com/ and sign in
2. Open your browser's developer tools (F12)
3. Go to Application/Storage > Cookies
4. Find the cookie named "npsso"
5. Copy the 64-character value

⚠️ **Keep your token secure!** Never share it with others.
                `,
                ephemeral: true
            });
            break;
    }
}

/**
 * Handle trophy-related button interactions
 * @param {Object} interaction - Discord interaction object
 */
async function handleTrophyButton(interaction) {
    // Implementation for trophy button handling
    await interaction.reply({
        content: '🏆 Trophy button functionality coming soon!',
        ephemeral: true
    });
}

/**
 * Handle game selection interactions
 * @param {Object} interaction - Discord interaction object
 */
async function handleGameSelect(interaction) {
    // Implementation for game selection handling
    await interaction.reply({
        content: '🎮 Game selection functionality coming soon!',
        ephemeral: true
    });
}

/**
 * Handle trophy filter interactions
 * @param {Object} interaction - Discord interaction object
 */
async function handleTrophyFilter(interaction) {
    // Implementation for trophy filtering
    await interaction.reply({
        content: '🏆 Trophy filter functionality coming soon!',
        ephemeral: true
    });
}

/**
 * Handle NPSSO token modal submission
 * @param {Object} interaction - Discord interaction object
 */
async function handlePSNTokenModal(interaction) {
    const npssoToken = interaction.fields.getTextInputValue('npsso_token');
    const logger = interaction.client.logger;
    const database = interaction.client.database;
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const PSNApi = require('../utils/psnApi');
        const psnApi = new PSNApi(logger);
        
        // Validate token format
        if (!psnApi.isValidNpssoToken(npssoToken)) {
            await interaction.editReply({
                content: '❌ Invalid NPSSO token format. Token must be 64 characters long and contain only letters and numbers.'
            });
            return;
        }
        
        // Authenticate with PSN
        const authTokens = await psnApi.authenticateWithNpsso(npssoToken);
        
        // Get user profile to get account ID and username
        const profile = await psnApi.getUserProfile(authTokens.accessToken, 'me');
        
        // Save user to database
        await database.saveUser({
            discordId: interaction.user.id,
            psnUsername: profile.onlineId,
            psnAccountId: profile.accountId,
            npssoToken: npssoToken,
            accessToken: authTokens.accessToken,
            refreshToken: authTokens.refreshToken,
            tokenExpiresAt: authTokens.expiresAt
        });
        
        logger.info(`PSN account linked: ${interaction.user.tag} -> ${profile.onlineId}`);
        
        await interaction.editReply({
            content: `✅ **PlayStation Network account linked successfully!**\n\n🎮 **PSN Username:** ${profile.onlineId}\n🏆 **Trophy tracking is now active**\n\nUse \`/profile\` to view your trophy statistics!`
        });
        
    } catch (error) {
        logger.error(`PSN authentication failed for ${interaction.user.tag}:`, error.message);
        
        await interaction.editReply({
            content: `❌ **Authentication failed:** ${error.message}\n\nPlease check your NPSSO token and try again. Use the help button for instructions on how to get your token.`
        });
    }
}
