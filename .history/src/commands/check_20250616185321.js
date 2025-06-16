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
        const trophyTracker = interaction.client.trophyTracker;
        
        await interaction.deferReply();
        
        try {
            // Get user data from database with error handling
            let userData;
            try {
                userData = await database.getUser(interaction.user.id);
            } catch (dbError) {
                logger.error('Database error in check command:', dbError);
                await interaction.editReply({
                    content: '❌ Database error occurred. Please try again later.'
                });
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
            
            // Check if user has valid authentication
            if (!userData.access_token || !userData.psn_account_id) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Authentication Required')
                    .setDescription('Your PSN authentication has expired. Please re-link your account using `/link`.')
                    .setColor(0xFF0000)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            
            // Show initial checking message
            const checkingEmbed = new EmbedBuilder()
                .setTitle('🔄 Checking for New Trophies...')
                .setDescription(`Fetching latest trophy data for **${userData.psn_username}**\n\nThis may take a few moments...`)
                .setColor(0xFFFF00)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [checkingEmbed] });
            
            // Perform trophy check
            const checkStartTime = Date.now();
            await trophyTracker.checkUserTrophies(userData);
            const checkDuration = Date.now() - checkStartTime;
            
            // Get updated statistics
            const stats = await trophyTracker.getUserTrophyStats(interaction.user.id);
            const recentTrophies = await database.getRecentTrophies(interaction.user.id, 10);
            
            // Filter trophies earned since last manual check (last 24 hours)
            const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
            const newTrophies = recentTrophies.filter(trophy => trophy.earned_date > twentyFourHoursAgo);
            
            // Create result embed
            const resultEmbed = new EmbedBuilder()
                .setTitle('✅ Trophy Check Complete')
                .setDescription(`Checked trophy data for **${userData.psn_username}**`)
                .addFields([
                    {
                        name: '📊 Current Statistics',
                        value: `
                            🏆 **Total Trophies:** ${stats.total_trophies}
                            🥇 **Platinum:** ${stats.platinum_count}
                            🥇 **Gold:** ${stats.gold_count}
                            🥈 **Silver:** ${stats.silver_count}
                            🥉 **Bronze:** ${stats.bronze_count}
                        `,
                        inline: true
                    },
                    {
                        name: '🔍 Check Results',
                        value: `
                            ⏱️ **Duration:** ${checkDuration}ms
                            🆕 **New Trophies (24h):** ${newTrophies.length}
                            🔄 **Last Updated:** <t:${Math.floor(Date.now() / 1000)}:R>
                        `,
                        inline: true
                    }
                ])
                .setColor(newTrophies.length > 0 ? 0x00FF00 : 0x0099FF)
                .setTimestamp()
                .setFooter({ 
                    text: 'Automatic checks run every 30 minutes',
                    iconURL: interaction.user.displayAvatarURL()
                });
            
            // Add new trophies if found
            if (newTrophies.length > 0) {
                const newTrophyList = newTrophies
                    .slice(0, 5) // Limit to 5 for display
                    .map(trophy => {
                        const icon = getTrophyIcon(trophy.trophy_type);
                        const timeAgo = `<t:${trophy.earned_date}:R>`;
                        return `${icon} **${trophy.trophy_name}**\n🎮 ${trophy.game_title} ${timeAgo}`;
                    })
                    .join('\n\n');
                
                resultEmbed.addFields([{
                    name: `🆕 Recent Trophies (${newTrophies.length})`,
                    value: newTrophyList + (newTrophies.length > 5 ? `\n\n...and ${newTrophies.length - 5} more` : ''),
                    inline: false
                }]);
                
                // Special message for new platinums
                const newPlatinums = newTrophies.filter(t => t.trophy_type === 'platinum');
                if (newPlatinums.length > 0) {
                    resultEmbed.setDescription(`🎉 **Congratulations!** You earned ${newPlatinums.length} Platinum trophy${newPlatinums.length > 1 ? 'ies' : ''} recently!`);
                }
            } else {
                resultEmbed.addFields([{
                    name: '📝 No New Trophies',
                    value: 'No new trophies found in the last 24 hours.\n\nKeep gaming to earn more trophies! 🎮',
                    inline: false
                }]);
            }
            
            await interaction.editReply({ embeds: [resultEmbed] });
            
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
                        name: '💡 What to do',
                        value: '• Try again in a few minutes\n• Check your PSN privacy settings\n• Re-link your account with `/link`',
                        inline: false
                    }
                ])
                .setColor(0xFF0000)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * Get trophy icon emoji
 * @param {string} trophyType - Trophy type
 * @returns {string} - Emoji
 */
function getTrophyIcon(trophyType) {
    const icons = {
        platinum: '🏆',
        gold: '🥇',
        silver: '🥈',
        bronze: '🥉'
    };
    
    return icons[trophyType] || '🏅';
} 