/**
 * Interaction Create Event Handler
 * 
 * Handles all Discord interactions including slash commands, buttons, and select menus
 * Provides proper error handling and logging for command execution
 */

const { Events, EmbedBuilder } = require('discord.js');

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
                            flags: 64 // InteractionResponseFlags.Ephemeral
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
                
                // Add timeout protection for command execution
                const commandTimeout = new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(new Error(`Command ${interaction.commandName} timed out after 30 seconds`));
                    }, 30000);
                });
                
                await Promise.race([
                    command.execute(interaction),
                    commandTimeout
                ]);
                
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
                    flags: 64 // InteractionResponseFlags.Ephemeral
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
                if (interaction.customId === 'link_continue_anyway') {
                    await handleLinkContinueAnyway(interaction, logger);
                } else if (interaction.customId === 'link_cancel') {
                    await handleLinkCancel(interaction, logger);
                } else {
                    logger.warn(`Unknown button interaction: ${interaction.customId}`);
                }
            } catch (error) {
                logger.error(`Error handling button interaction ${interaction.customId}:`, error);
                const errorMessage = {
                    content: '❌ There was an error processing your button click!',
                    flags: 64 // InteractionResponseFlags.Ephemeral
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
                    flags: 64 // InteractionResponseFlags.Ephemeral
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
                if (interaction.customId === 'psn_username_modal') {
                    logger.info(`Processing PSN username modal for user ${interaction.user.tag}`);
                    await handlePSNUsernameModal(interaction, logger);
                    logger.info(`PSN username modal processed successfully for user ${interaction.user.tag}`);
                } else {
                    logger.warn(`Unknown modal submit interaction: ${interaction.customId}`);
                }
                
            } catch (error) {
                logger.error(`Error handling modal submit ${interaction.customId}:`, error);
                logger.error(`Error stack:`, error.stack);
                
                const errorMessage = {
                    content: '❌ There was an error processing your submission!',
                    flags: 64 // InteractionResponseFlags.Ephemeral
                };
                
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorMessage);
                    } else {
                        await interaction.reply(errorMessage);
                    }
                } catch (replyError) {
                    logger.error(`Failed to send error message to user:`, replyError);
                }
            }
        }
    }
};



/**
 * Handle trophy-related button interactions
 * @param {Object} interaction - Discord interaction object
 */
async function handleTrophyButton(interaction) {
    // Implementation for trophy button handling
    await interaction.reply({
        content: '🏆 Trophy button functionality coming soon!',
        flags: 64 // InteractionResponseFlags.Ephemeral
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
        flags: 64 // InteractionResponseFlags.Ephemeral
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
        flags: 64 // InteractionResponseFlags.Ephemeral
    });
}

/**
 * Handle PSN username modal submission
 * @param {Object} interaction - Discord interaction object
 * @param {Object} logger - Logger instance
 */
async function handlePSNUsernameModal(interaction, logger) {
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const Database = require('../database/database');
    const RealPSNApi = require('../utils/realPsnApi');
    
    const username = interaction.fields.getTextInputValue('psn_username');
    const discordUserId = interaction.user.id;
    
    logger.info(`Modal submitted for username: ${username} by Discord user: ${discordUserId}`);
    
    try {
        // Defer reply since validation might take time
        logger.debug(`Deferring reply for user ${discordUserId}`);
        await interaction.deferReply({ ephemeral: true });
        logger.debug(`Reply deferred successfully for user ${discordUserId}`);
        
        // Check if user already exists
        logger.debug(`Checking if user ${discordUserId} already exists in database`);
        const existingUser = await Database.getUser(discordUserId);
        logger.debug(`Database check result for user ${discordUserId}:`, existingUser ? 'exists' : 'not found');
        
        if (existingUser) {
            logger.info(`User ${discordUserId} already linked to PSN username: ${existingUser.psn_username}`);
            const alreadyLinkedEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🔗 Account Already Linked')
                .setDescription(`You are already linked to PSN username: **${existingUser.psn_username}**`)
                .addFields(
                    { name: 'Current PSN', value: existingUser.psn_username, inline: true },
                    { name: 'Linked Since', value: new Date(existingUser.created_at).toLocaleDateString(), inline: true }
                )
                .setFooter({ text: 'Use /unlink to remove the current link, then /link again' });
            
            await interaction.editReply({ embeds: [alreadyLinkedEmbed] });
            logger.info(`Already linked message sent to user ${discordUserId}`);
            return;
        }
        
        // Initialize Real PSN API
        logger.debug(`Initializing RealPSNApi for user ${discordUserId}`);
        const realPsnApi = new RealPSNApi();
        
        // Try to validate username with real PSN API
        logger.info(`🔍 Attempting real PSN validation for: ${username} (user ${discordUserId})`);
        const validationResult = await realPsnApi.validateUsername(username);
        logger.debug(`Validation result for ${username}:`, validationResult);
        
        if (validationResult.isValid) {
            // Real validation succeeded!
            logger.info(`✅ Real PSN validation successful for: ${username} (user ${discordUserId})`);
            
            // Save user to database
            logger.debug(`Saving user ${discordUserId} to database with username ${username}`);
            const newUser = await Database.createUser(discordUserId, {
                psn_username: username,
                psn_account_id: validationResult.accountId
            });
            logger.info(`User ${discordUserId} saved to database successfully:`, newUser);
            
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ PSN Account Linked Successfully!')
                .setDescription(`Your Discord account is now linked to PSN username: **${username}**`)
                .addFields(
                    { name: 'PSN Username', value: username, inline: true },
                    { name: 'Account ID', value: validationResult.accountId || 'N/A', inline: true },
                    { name: 'Linked At', value: new Date().toLocaleString(), inline: true }
                )
                .setFooter({ text: 'You can now use /profile and /check commands!' });
            
            await interaction.editReply({ embeds: [successEmbed] });
            logger.info(`Success message sent to user ${discordUserId}`);
            
        } else {
            // Real validation failed, show fallback option
            logger.warn(`⚠️ Real PSN validation failed for: ${username} (user ${discordUserId}). Reason: ${validationResult.reason}`);
            
            const fallbackEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('⚠️ PSN Validation Limited')
                .setDescription(`We couldn't fully validate your PSN username **${username}** due to API limitations.`)
                .addFields(
                    { name: 'Issue', value: validationResult.reason || 'Unknown validation error', inline: false },
                    { name: 'Recommendation', value: 'You can still proceed if you\'re confident in your username, or try again later.', inline: false }
                );
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('link_continue_anyway')
                        .setLabel('Continue Anyway')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('link_cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );
            
            await interaction.editReply({ 
                embeds: [fallbackEmbed], 
                components: [row] 
            });
            logger.info(`Fallback message with buttons sent to user ${discordUserId}`);
        }
        
    } catch (error) {
        logger.error(`💥 Error in PSN username modal for user ${discordUserId}: ${error.message}`);
        logger.error(`Error stack for user ${discordUserId}:`, error.stack);
        
        try {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Modal Processing Failed')
                .setDescription('An error occurred while processing your username submission.')
                .addFields(
                    { name: 'Error', value: error.message, inline: false },
                    { name: 'Username', value: username || 'UNKNOWN', inline: true },
                    { name: 'Discord ID', value: discordUserId, inline: true }
                )
                .setFooter({ text: 'Please try again or contact support if the issue persists' });
            
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            logger.info(`Error message sent to user ${discordUserId}`);
        } catch (replyError) {
            logger.error(`Failed to send error message to user ${discordUserId}:`, replyError);
        }
    }
}

async function handleLinkContinueAnyway(interaction, logger) {
    const discordUserId = interaction.user.id;
    
    logger.info(`User ${discordUserId} chose to continue with link despite validation issues`);
    
    try {
        // For now, we'll just acknowledge their choice
        // In a full implementation, we could store the username anyway
        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('⚠️ Link Proceeded with Caution')
            .setDescription('You chose to proceed with linking despite validation limitations.')
            .addFields(
                { name: 'Status', value: 'Link request noted', inline: true },
                { name: 'Recommendation', value: 'Please ensure your PSN username is correct', inline: true }
            )
            .setFooter({ text: 'Contact support if you encounter issues' });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
    } catch (error) {
        logger.error(`Error handling link continue: ${error.message}`);
        await interaction.reply({ 
            content: '❌ Error processing your request', 
            ephemeral: true 
        });
    }
}

async function handleLinkCancel(interaction, logger) {
    const discordUserId = interaction.user.id;
    
    logger.info(`User ${discordUserId} cancelled the link process`);
    
    try {
        const embed = new EmbedBuilder()
            .setColor(0x808080)
            .setTitle('❌ Link Process Cancelled')
            .setDescription('You cancelled the PSN account linking process.')
            .addFields(
                { name: 'What to do next', value: 'Use `/link` again when you\'re ready to try linking your account.', inline: false }
            )
            .setFooter({ text: 'No changes were made to your account' });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
    } catch (error) {
        logger.error(`Error handling link cancel: ${error.message}`);
        await interaction.reply({ 
            content: '❌ Error processing your request', 
            ephemeral: true 
        });
    }
}


