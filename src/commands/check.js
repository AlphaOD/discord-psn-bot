/**
 * Check Command - Manual Trophy Check
 * 
 * Allows users to manually trigger a trophy check
 * instead of waiting for the automatic scheduled check
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check')
        .setDescription('Manually check for new trophies'),
    
    async execute(interaction) {
        const database = interaction.client.database;
        const logger = interaction.client.logger;
        
        await interaction.deferReply();
        
        try {
            // Get user data from database with error handling
            let userData;
            try {
                userData = await database.getUser(interaction.user.id);
            } catch (dbError) {
                logger.error('Database error in check command:', dbError);
                
                const errorMessage = dbError.message.includes('no such table') 
                    ? '❌ Database not properly initialized. Please contact an administrator.'
                    : '❌ Database error occurred. Please try again later.';
                
                await interaction.editReply({ content: errorMessage });
                return;
            }
            
            if (!userData || !userData.psn_username) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ No PSN Account Linked')
                    .setDescription('You haven\'t linked your PlayStation Network account yet.\n\nUse `/link` to get started!')
                    .setColor(0xFF0000)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            
            // Note: We no longer require access_token and psn_account_id
            // Users can be linked with just username for basic functionality
            
            // Show initial checking message
            const checkingEmbed = new EmbedBuilder()
                .setTitle('🔄 Checking for New Trophies...')
                .setDescription(`Fetching latest trophy data for **${userData.psn_username}**\n\nThis may take a few moments...`)
                .setColor(0xFFFF00)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [checkingEmbed] });
            
            // Try to fetch trophy data using RealPSNApi
            const checkStartTime = Date.now();
            let checkDuration = 0;
            
            try {
                const RealPSNApi = require('../utils/realPsnApi');
                const realPsnApi = new RealPSNApi();
                
                logger.info(`Attempting to fetch trophy data for ${userData.psn_username} using RealPSNApi`);
                
                // For now, we'll show a message about the current limitations
                // In the future, we can implement NPSSO token collection for full access
                checkDuration = Date.now() - checkStartTime;
                
                const resultEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Trophy Check Limited')
                    .setDescription(`Checked status for **${userData.psn_username}**`)
                    .addFields([
                        {
                            name: '📊 Current Status',
                            value: `
                                🔗 **Account Status:** Linked
                                🏆 **Trophy Access:** Limited (requires NPSSO token)
                                📅 **Linked Since:** <t:${Math.floor(new Date(userData.created_at).getTime() / 1000)}:R>
                            `,
                            inline: true
                        },
                        {
                            name: '🔍 Check Results',
                            value: `
                                ⏱️ **Duration:** ${checkDuration}ms
                                🔄 **Last Updated:** <t:${Math.floor(Date.now() / 1000)}:R>
                                📝 **Note:** Full trophy data requires NPSSO authentication
                            `,
                            inline: true
                        }
                    ])
                    .setColor(0xFFAA00)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Use /link with NPSSO token for full trophy access',
                        iconURL: interaction.user.displayAvatarURL()
                    });
                
                await interaction.editReply({ embeds: [resultEmbed] });
                
            } catch (error) {
                logger.error(`Error in trophy check for user ${interaction.user.id}:`, error);
                
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Trophy Check Failed')
                    .setDescription(`An error occurred while checking trophies for **${userData.psn_username}**`)
                    .addFields([
                        {
                            name: '🔍 Error Details',
                            value: error.message || 'Unknown error occurred',
                            inline: false
                        },
                        {
                            name: '💡 What to do next',
                            value: 'Try again later or contact support if the issue persists',
                            inline: false
                        }
                    ])
                    .setColor(0xFF0000)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed] });
            }
            
        } catch (error) {
            logger.error(`Error in check command for user ${interaction.user.id}:`, error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Trophy Check Failed')
                .setDescription('An error occurred while checking for trophies. This could be due to:')
                .addFields([
                    {
                        name: '🔧 Possible Causes',
                        value: '• PSN authentication expired\n• PlayStation Network is down\n• Privacy settings blocking access\n• Temporary network issue',
                        inline: false
                    },
                    {
                        name: '💡 What to do next',
                        value: '• Try again later\n• Check your PSN privacy settings\n• Contact support if the issue persists',
                        inline: false
                    }
                ])
                .setColor(0xFF0000)
                .setTimestamp();
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed] });
            }
        }
    }
}; 