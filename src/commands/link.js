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
            let existingUser;
            try {
                existingUser = await database.getUser(interaction.user.id);
            } catch (dbError) {
                logger.error('Database error in link command:', dbError);
                
                const errorMessage = dbError.message.includes('no such table') 
                    ? '❌ Database not properly initialized. Please contact an administrator.'
                    : '❌ Database error occurred. Please try again later.';
                
                await interaction.reply({
                    content: errorMessage,
                    flags: 64 // InteractionResponseFlags.Ephemeral
                });
                return;
            }
            
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
                
                await interaction.reply({ embeds: [embed], flags: 64 }); // InteractionResponseFlags.Ephemeral
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
                        name: '🔑 How to Get NPSSO Token',
                        value: '1. Go to [my.playstation.com](https://my.playstation.com) and **sign in**\n' +
                               '2. Press **F12** → **Application** → **Cookies** → **my.playstation.com**\n' +
                               '3. Find `npsso` cookie and copy its 64-character value\n' +
                               '4. **Can\'t find it?** Use `/help topic:npsso-token` for detailed instructions',
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
                flags: 64 // InteractionResponseFlags.Ephemeral
            });
            
        } catch (error) {
            logger.error('Error in link command:', error);
            
            await interaction.reply({
                content: '❌ An error occurred while processing your request. Please try again later.',
                flags: 64 // InteractionResponseFlags.Ephemeral
            });
        }
    }
}; 