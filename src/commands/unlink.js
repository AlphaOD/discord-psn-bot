/**
 * Unlink Command - Disconnect PlayStation Network Account
 * 
 * Allows users to unlink their PSN account from the Discord bot
 * and remove all stored data
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlink')
        .setDescription('Unlink your PlayStation Network account and remove stored data'),
    
    async execute(interaction) {
        const database = interaction.client.database;
        const logger = interaction.client.logger;
        
        try {
            // Check if user has a linked account
            let existingUser;
            try {
                existingUser = await database.getUser(interaction.user.id);
            } catch (dbError) {
                logger.error('Database error in unlink command:', dbError);
                
                const errorMessage = dbError.message.includes('no such table') 
                    ? '❌ Database not properly initialized. Please contact an administrator.'
                    : '❌ Database error occurred. Please try again later.';
                
                await interaction.reply({
                    content: errorMessage,
                    flags: 64 // InteractionResponseFlags.Ephemeral
                });
                return;
            }
            
            if (!existingUser || !existingUser.psn_username) {
                const embed = new EmbedBuilder()
                    .setTitle('ℹ️ No PSN Account Linked')
                    .setDescription('You don\'t have a PlayStation Network account linked to your Discord account.')
                    .addFields([
                        {
                            name: '🔗 Want to Link an Account?',
                            value: 'Use `/link` to connect your PlayStation Network account and start tracking trophies!',
                            inline: false
                        }
                    ])
                    .setColor(0x0099FF)
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed], flags: 64 }); // InteractionResponseFlags.Ephemeral
                return;
            }
            
            // Show confirmation embed
            const embed = new EmbedBuilder()
                .setTitle('⚠️ Unlink PlayStation Network Account')
                .setDescription(`**Are you sure you want to unlink your PSN account?**\n\nThis will remove **${existingUser.psn_username}** and all associated data.`)
                .addFields([
                    {
                        name: '🗑️ What Will Be Deleted',
                        value: '• PSN account authentication\n• All stored trophy data\n• Notification settings\n• Game progress data\n• Trophy statistics',
                        inline: false
                    },
                    {
                        name: '⚠️ This Action Cannot Be Undone',
                        value: 'You will need to re-link your account and all trophy data will be re-downloaded if you link again.',
                        inline: false
                    }
                ])
                .setColor(0xFF6600)
                .setTimestamp();
            
            // Create confirmation buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('unlink_confirm')
                        .setLabel('Yes, Unlink Account')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️'),
                    new ButtonBuilder()
                        .setCustomId('unlink_cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('❌')
                );
            
            await interaction.reply({ 
                embeds: [embed], 
                components: [row], 
                flags: 64 // InteractionResponseFlags.Ephemeral
            });
            
            // Wait for button interaction
            const filter = (i) => i.user.id === interaction.user.id && (i.customId === 'unlink_confirm' || i.customId === 'unlink_cancel');
            
            try {
                const buttonInteraction = await interaction.awaitMessageComponent({ 
                    filter, 
                    time: 60000 // 60 seconds timeout
                });
                
                if (buttonInteraction.customId === 'unlink_confirm') {
                    // Perform unlink
                    try {
                        // Delete user data from all tables
                        await database.run('DELETE FROM users WHERE discord_id = ?', [interaction.user.id]);
                        await database.run('DELETE FROM trophies WHERE discord_id = ?', [interaction.user.id]);
                        await database.run('DELETE FROM user_games WHERE discord_id = ?', [interaction.user.id]);
                        await database.run('DELETE FROM notification_settings WHERE discord_id = ?', [interaction.user.id]);
                        
                        logger.info(`PSN account unlinked: ${interaction.user.tag} (${existingUser.psn_username})`);
                        
                        const successEmbed = new EmbedBuilder()
                            .setTitle('✅ PSN Account Unlinked Successfully')
                            .setDescription(`**${existingUser.psn_username}** has been disconnected and all data removed.`)
                            .addFields([
                                {
                                    name: '🔗 Want to Link Again?',
                                    value: 'Use `/link` anytime to reconnect your PlayStation Network account.',
                                    inline: false
                                }
                            ])
                            .setColor(0x00FF00)
                            .setTimestamp();
                        
                        await buttonInteraction.update({ 
                            embeds: [successEmbed], 
                            components: [] 
                        });
                        
                    } catch (deleteError) {
                        logger.error('Error deleting user data during unlink:', deleteError);
                        
                        const errorEmbed = new EmbedBuilder()
                            .setTitle('❌ Unlink Failed')
                            .setDescription('An error occurred while removing your data. Please try again later.')
                            .setColor(0xFF0000)
                            .setTimestamp();
                        
                        await buttonInteraction.update({ 
                            embeds: [errorEmbed], 
                            components: [] 
                        });
                    }
                    
                } else {
                    // User cancelled
                    const cancelEmbed = new EmbedBuilder()
                        .setTitle('❌ Unlink Cancelled')
                        .setDescription(`Your PSN account **${existingUser.psn_username}** remains linked and all data is preserved.`)
                        .setColor(0x808080)
                        .setTimestamp();
                    
                    await buttonInteraction.update({ 
                        embeds: [cancelEmbed], 
                        components: [] 
                    });
                }
                
            } catch (timeoutError) {
                // Timeout - remove buttons and show timeout message
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⏰ Unlink Cancelled')
                    .setDescription('No response received within 60 seconds. Your account remains linked.')
                    .setColor(0x808080)
                    .setTimestamp();
                
                await interaction.editReply({ 
                    embeds: [timeoutEmbed], 
                    components: [] 
                });
            }
            
        } catch (error) {
            logger.error('Error in unlink command:', error);
            
            await interaction.reply({
                content: '❌ An error occurred while processing your request. Please try again later.',
                flags: 64 // InteractionResponseFlags.Ephemeral
            });
        }
    }
};
