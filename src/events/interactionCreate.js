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
                // Handle common button interactions here
                if (interaction.customId.startsWith('trophy_')) {
                    // Handle trophy-related button clicks
                    await handleTrophyButton(interaction);
                }
                
            } catch (error) {
                logger.error(`Error handling button interaction ${interaction.customId}:`, error);
                
                const errorMessage = {
                    content: '❌ There was an error processing your request!',
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
                // No modal handling needed for now
                
            } catch (error) {
                logger.error(`Error handling modal submit ${interaction.customId}:`, error);
                
                const errorMessage = {
                    content: '❌ There was an error processing your submission!',
                    flags: 64 // InteractionResponseFlags.Ephemeral
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


