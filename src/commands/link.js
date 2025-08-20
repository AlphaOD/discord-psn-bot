/**
 * Link Command - Connect PlayStation Network Account (No Auth Required)
 * 
 * Allows users to link their PSN username with the Discord bot
 * for public trophy tracking and notifications using PSN's public API
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Database = require('../database/database');
const RealPSNApi = require('../utils/realPsnApi');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link your Discord account to a PSN username')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Your PSN username')
                .setRequired(false)
                .setMaxLength(16)
                .setMinLength(3)),

    async execute(interaction) {
        const username = interaction.options.getString('username');
        const discordUserId = interaction.user.id;
        
        logger.info(`🔗 Link command executed by ${interaction.user.tag} (${discordUserId})`);
        logger.debug(`Username option: "${username}"`);
        
        // If no username provided, show modal
        if (!username || typeof username !== 'string' || username.trim() === '') {
            logger.debug('No username provided, showing modal for user input');
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
            
            const modal = new ModalBuilder()
                .setCustomId('psn_username_modal')
                .setTitle('PlayStation Network Username');
            
            const usernameInput = new TextInputBuilder()
                .setCustomId('psn_username')
                .setLabel('PSN Username')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter your exact PSN username (case-sensitive)')
                .setRequired(true)
                .setMaxLength(16)
                .setMinLength(3);
            
            const usernameRow = new ActionRowBuilder().addComponents(usernameInput);
            modal.addComponents(usernameRow);
            
            await interaction.showModal(modal);
            return;
        }

        const trimmedUsername = username.trim();
        logger.info(`Validating PSN username: ${trimmedUsername} for Discord user: ${discordUserId}`);

        try {
            // Defer reply since validation might take time
            await interaction.deferReply({ ephemeral: true });

            // Check if user already exists
            const existingUser = await Database.getUserByDiscordId(discordUserId);
            if (existingUser) {
                logger.info(`User ${discordUserId} already linked to PSN: ${existingUser.psn_username}`);
                
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
                return;
            }

            // Initialize Real PSN API
            const realPsnApi = new RealPSNApi();
            
            // Try to validate username with real PSN API
            logger.info(`🔍 Attempting real PSN validation for: ${trimmedUsername}`);
            const validationResult = await realPsnApi.validateUsername(trimmedUsername);
            
            if (validationResult.isValid) {
                // Real validation succeeded!
                logger.info(`✅ Real PSN validation successful for: ${trimmedUsername}`);
                
                // Save user to database
                const newUser = await Database.createUser(discordUserId, trimmedUsername, validationResult.accountId);
                
                const successEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ PSN Account Linked Successfully!')
                    .setDescription(`Your Discord account is now linked to PSN username: **${trimmedUsername}**`)
                    .addFields(
                        { name: 'PSN Username', value: trimmedUsername, inline: true },
                        { name: 'Account ID', value: validationResult.accountId || 'N/A', inline: true },
                        { name: 'Linked At', value: new Date().toLocaleString(), inline: true }
                    )
                    .setFooter({ text: 'You can now use /profile and /check commands!' });
                
                await interaction.editReply({ embeds: [successEmbed] });
                
            } else {
                // Real validation failed, show fallback option
                logger.warn(`⚠️ Real PSN validation failed for: ${trimmedUsername}. Reason: ${validationResult.reason}`);
                
                const fallbackEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('⚠️ PSN Validation Limited')
                    .setDescription(`We couldn't fully validate your PSN username **${trimmedUsername}** due to API limitations.`)
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
            }
            
        } catch (error) {
            logger.error(`💥 Error in link command: ${error.message}`);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Link Command Failed')
                .setDescription('An error occurred while trying to link your account.')
                .addFields(
                    { name: 'Error', value: error.message, inline: false },
                    { name: 'Username', value: trimmedUsername, inline: true },
                    { name: 'Discord ID', value: discordUserId, inline: true }
                )
                .setFooter({ text: 'Please try again or contact support if the issue persists' });
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};