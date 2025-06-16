/**
 * Link Command - Connect PlayStation Network Account
 * 
 * Allows users to link their PSN account with the Discord bot
 * for trophy tracking and notifications
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link your PlayStation Network account for trophy tracking'),
    
    async execute(interaction) {
        const database = interaction.client.database;
        const logger = interaction.client.logger;
        
        try {
            // Check if user already has a linked account
            const existingUser = await database.getUser(interaction.user.id);
            
            if (existingUser && existingUser.psn_username) {
                const embed = new EmbedBuilder()
                    .setTitle('🔗 PSN Account Already Linked')
                    .setDescription(`Your Discord account is already linked to PSN account: **${existingUser.psn_username}**`)
                    .addFields([
                        {
                            name: '🏆 Trophy Tracking',
                            value: existingUser.notification_enabled ? '✅ Enabled' : '❌ Disabled',
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
                    .setColor(0x00FF00)
                    .setTimestamp()
                    .setFooter({ text: 'Use /unlink to disconnect your account' });
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }
            
            // Create link account embed with instructions
            const embed = new EmbedBuilder()
                .setTitle('🔗 Link PlayStation Network Account')
                .setDescription(`
                    Connect your PSN account to enable trophy tracking and notifications!
                    
                    **What you'll get:**
                    🏆 Automatic trophy notifications
                    📊 Trophy statistics and leaderboards
                    🎮 Game progress tracking
                    🏅 Platinum trophy celebrations
                `)
                .addFields([
                    {
                        name: '📋 Requirements',
                        value: '• Valid PlayStation Network account\n• NPSSO authentication token\n• Privacy settings allowing trophy visibility',
                        inline: false
                    },
                    {
                        name: '🔒 Privacy & Security',
                        value: 'Your token is encrypted and stored securely. We only access publicly visible trophy data.',
                        inline: false
                    }
                ])
                .setColor(0x0099FF)
                .setTimestamp();
            
            // Create action buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('psn_auth_start')
                        .setLabel('Start Linking Process')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔗'),
                    new ButtonBuilder()
                        .setCustomId('psn_auth_help')
                        .setLabel('Help & Instructions')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('❓')
                );
            
            await interaction.reply({ 
                embeds: [embed], 
                components: [row], 
                ephemeral: true 
            });
            
        } catch (error) {
            logger.error('Error in link command:', error);
            
            await interaction.reply({
                content: '❌ An error occurred while processing your request. Please try again later.',
                ephemeral: true
            });
        }
    }
}; 