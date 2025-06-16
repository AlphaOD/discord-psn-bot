/**
 * Profile Command - Display User Trophy Statistics
 * 
 * Shows detailed trophy statistics and PSN profile information
 * for the requesting user or mentioned user
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View trophy profile and statistics')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to view profile for (defaults to yourself)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        const database = interaction.client.database;
        const logger = interaction.client.logger;
        const trophyTracker = interaction.client.trophyTracker;
        
        await interaction.deferReply();
        
        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const isOwnProfile = targetUser.id === interaction.user.id;
            
            // Get user data from database
            const userData = await database.getUser(targetUser.id);
            
            if (!userData || !userData.psn_username) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ No PSN Account Linked')
                    .setDescription(
                        isOwnProfile 
                            ? 'You haven\'t linked your PlayStation Network account yet.\n\nUse `/link` to get started!' 
                            : `${targetUser.displayName} hasn't linked their PlayStation Network account.`
                    )
                    .setColor(0xFF0000)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            
            // Get trophy statistics
            const stats = await trophyTracker.getUserTrophyStats(targetUser.id);
            
            // Get recent trophies
            const recentTrophies = await database.getRecentTrophies(targetUser.id, 5);
            
            // Calculate trophy level (simplified calculation)
            const trophyLevel = calculateTrophyLevel(stats);
            
            // Create profile embed
            const embed = new EmbedBuilder()
                .setTitle(`🏆 ${userData.psn_username}'s Trophy Profile`)
                .setDescription(`PSN Profile for ${targetUser.displayName}`)
                .addFields([
                    {
                        name: '📊 Trophy Statistics',
                        value: `
                            🥇 **Total Trophies:** ${stats.total_trophies}
                            🏆 **Platinum:** ${stats.platinum_count}
                            🥇 **Gold:** ${stats.gold_count}
                            🥈 **Silver:** ${stats.silver_count}
                            🥉 **Bronze:** ${stats.bronze_count}
                        `,
                        inline: true
                    },
                    {
                        name: '🎮 Gaming Statistics',
                        value: `
                            🎯 **Games Played:** ${stats.games_played}
                            📊 **Trophy Level:** ${trophyLevel}
                            ⭐ **Completion Rate:** ${calculateCompletionRate(stats)}%
                        `,
                        inline: true
                    },
                    {
                        name: '📅 Account Info',
                        value: `
                            🔗 **Linked:** <t:${Math.floor(userData.created_at)}:R>
                            🔄 **Last Check:** ${userData.last_trophy_check ? `<t:${userData.last_trophy_check}:R>` : 'Never'}
                            🔔 **Notifications:** ${userData.notification_enabled ? '✅ On' : '❌ Off'}
                        `,
                        inline: false
                    }
                ])
                .setColor(getTrophyLevelColor(trophyLevel))
                .setTimestamp()
                .setFooter({ 
                    text: `Profile for ${userData.psn_username}`,
                    iconURL: targetUser.displayAvatarURL()
                });
            
            // Add recent trophies field if available
            if (recentTrophies && recentTrophies.length > 0) {
                const recentTrophyList = recentTrophies
                    .slice(0, 5)
                    .map(trophy => {
                        const icon = getTrophyIcon(trophy.trophy_type);
                        const timeAgo = `<t:${trophy.earned_date}:R>`;
                        return `${icon} **${trophy.trophy_name}** ${timeAgo}`;
                    })
                    .join('\n');
                
                embed.addFields([{
                    name: '🕒 Recent Trophies',
                    value: recentTrophyList,
                    inline: false
                }]);
            }
            
            // Add platinum showcase if user has platinums
            if (stats.platinum_count > 0) {
                const platinums = await database.getPlatinumTrophies(targetUser.id);
                
                if (platinums && platinums.length > 0) {
                    const latestPlatinum = platinums[0];
                    embed.addFields([{
                        name: '🏆 Latest Platinum',
                        value: `**${latestPlatinum.trophy_name}**\n🎮 ${latestPlatinum.game_title}\n⏰ <t:${latestPlatinum.earned_date}:R>`,
                        inline: false
                    }]);
                }
            }
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            logger.error('Error in profile command:', error);
            
            await interaction.editReply({
                content: '❌ An error occurred while fetching profile data. Please try again later.'
            });
        }
    }
};

/**
 * Calculate trophy level based on points
 * @param {Object} stats - Trophy statistics
 * @returns {number} - Trophy level
 */
function calculateTrophyLevel(stats) {
    // PlayStation trophy level calculation (simplified)
    const points = (stats.platinum_count * 300) + 
                   (stats.gold_count * 90) + 
                   (stats.silver_count * 30) + 
                   (stats.bronze_count * 15);
    
    return Math.floor(Math.sqrt(points / 100)) + 1;
}

/**
 * Calculate overall completion rate
 * @param {Object} stats - Trophy statistics
 * @returns {number} - Completion percentage
 */
function calculateCompletionRate(stats) {
    if (stats.games_played === 0) return 0;
    
    // Simplified calculation based on average trophies per game
    const avgTrophiesPerGame = stats.total_trophies / stats.games_played;
    const estimatedCompletionRate = Math.min(avgTrophiesPerGame * 2, 100);
    
    return Math.round(estimatedCompletionRate);
}

/**
 * Get color based on trophy level
 * @param {number} level - Trophy level
 * @returns {number} - Hex color code
 */
function getTrophyLevelColor(level) {
    if (level >= 50) return 0xFFD700; // Gold
    if (level >= 25) return 0xC0C0C0; // Silver
    if (level >= 10) return 0xCD7F32; // Bronze
    return 0x808080; // Gray
}

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