/**
 * Status Command - Display Bot Status and Information
 * 
 * Shows bot health, statistics, and system information
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('View bot status, statistics, and system information'),
    
    async execute(interaction) {
        const client = interaction.client;
        const database = client.database;
        const logger = client.logger;
        
        await interaction.deferReply();
        
        try {
            // Gather bot statistics
            const botStats = {
                guilds: client.guilds.cache.size,
                users: client.users.cache.size,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                nodeVersion: process.version,
                discordJsVersion: require('discord.js').version || 'Unknown'
            };
            
            // Get database statistics
            let dbStats = {
                totalUsers: 0,
                linkedUsers: 0,
                totalTrophies: 0,
                totalGames: 0
            };
            
            try {
                const users = await database.get('SELECT COUNT(*) as count FROM users');
                dbStats.totalUsers = users?.count || 0;
                
                const linkedUsers = await database.get('SELECT COUNT(*) as count FROM users WHERE psn_username IS NOT NULL');
                dbStats.linkedUsers = linkedUsers?.count || 0;
                
                const trophies = await database.get('SELECT COUNT(*) as count FROM trophies');
                dbStats.totalTrophies = trophies?.count || 0;
                
                const games = await database.get('SELECT COUNT(*) as count FROM games');
                dbStats.totalGames = games?.count || 0;
                
            } catch (dbError) {
                logger.error('Error fetching database statistics:', dbError);
                // Continue with default values
            }
            
            // Format uptime
            const uptimeFormatted = formatUptime(botStats.uptime);
            
            // Format memory usage
            const memoryMB = Math.round(botStats.memoryUsage.heapUsed / 1024 / 1024);
            const memoryTotal = Math.round(botStats.memoryUsage.rss / 1024 / 1024);
            
            // Create status embed
            const embed = new EmbedBuilder()
                .setTitle('🤖 Discord PSN Bot Status')
                .setDescription('Current bot status and system information')
                .addFields([
                    {
                        name: '📊 Bot Statistics',
                        value: `
                            🏠 **Servers:** ${botStats.guilds}
                            👥 **Users:** ${botStats.users}
                            ⏰ **Uptime:** ${uptimeFormatted}
                            💾 **Memory:** ${memoryMB}MB / ${memoryTotal}MB RSS
                        `,
                        inline: true
                    },
                    {
                        name: '🗄️ Database Statistics',
                        value: `
                            👤 **Total Users:** ${dbStats.totalUsers}
                            🔗 **Linked Accounts:** ${dbStats.linkedUsers}
                            🏆 **Total Trophies:** ${dbStats.totalTrophies.toLocaleString()}
                            🎮 **Games Tracked:** ${dbStats.totalGames}
                        `,
                        inline: true
                    },
                    {
                        name: '🔧 System Information',
                        value: `
                            🟢 **Node.js:** ${botStats.nodeVersion}
                            📡 **Discord.js:** v${botStats.discordJsVersion}
                            🗄️ **Database:** SQLite
                            ☁️ **Platform:** ${process.platform}
                        `,
                        inline: true
                    },
                    {
                        name: '🏆 Trophy Tracking',
                        value: `
                            ⏱️ **Check Interval:** Every 30 minutes
                            🔄 **Auto-tracking:** ${dbStats.linkedUsers > 0 ? '✅ Active' : '❌ No linked users'}
                            📊 **Last Check:** ${getLastCheckInfo()}
                            🔔 **Notifications:** ${dbStats.linkedUsers > 0 ? '✅ Enabled' : '⚠️ No users'}
                        `,
                        inline: false
                    }
                ])
                .setColor(getStatusColor(botStats, dbStats))
                .setTimestamp()
                .setFooter({ 
                    text: `Bot ID: ${client.user.id}`,
                    iconURL: client.user.displayAvatarURL()
                });
            
            // Add health indicators
            const healthIndicators = getHealthIndicators(botStats, dbStats);
            if (healthIndicators.length > 0) {
                embed.addFields([{
                    name: '🚨 Health Indicators',
                    value: healthIndicators.join('\n'),
                    inline: false
                }]);
            }
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            logger.error('Error in status command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Status Check Failed')
                .setDescription('An error occurred while gathering bot status information.')
                .setColor(0xFF0000)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * Format uptime in human readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * Get status color based on bot health
 * @param {Object} botStats - Bot statistics
 * @param {Object} dbStats - Database statistics
 * @returns {number} Color code
 */
function getStatusColor(botStats, dbStats) {
    // Green if everything looks good
    if (botStats.guilds > 0 && dbStats.linkedUsers > 0 && botStats.memoryUsage.heapUsed < 200 * 1024 * 1024) {
        return 0x00FF00;
    }
    // Yellow if some warnings
    else if (botStats.guilds > 0 && (dbStats.linkedUsers === 0 || botStats.memoryUsage.heapUsed > 200 * 1024 * 1024)) {
        return 0xFFAA00;
    }
    // Red if issues detected
    else {
        return 0xFF0000;
    }
}

/**
 * Get health indicators and warnings
 * @param {Object} botStats - Bot statistics
 * @param {Object} dbStats - Database statistics
 * @returns {Array} Array of health indicator strings
 */
function getHealthIndicators(botStats, dbStats) {
    const indicators = [];
    
    // High memory usage warning
    if (botStats.memoryUsage.heapUsed > 200 * 1024 * 1024) {
        indicators.push('⚠️ High memory usage detected');
    }
    
    // No linked users warning
    if (dbStats.linkedUsers === 0) {
        indicators.push('⚠️ No users have linked their PSN accounts');
    }
    
    // No servers warning
    if (botStats.guilds === 0) {
        indicators.push('❌ Not connected to any Discord servers');
    }
    
    // Low uptime warning (less than 5 minutes might indicate recent crashes)
    if (botStats.uptime < 300) {
        indicators.push('⚠️ Bot recently restarted (low uptime)');
    }
    
    return indicators;
}

/**
 * Get information about the last trophy check
 * @returns {string} Last check information
 */
function getLastCheckInfo() {
    // This is a simple implementation - you could enhance this to track actual last check times
    const now = new Date();
    const nextCheck = new Date(now.getTime() + (30 * 60 * 1000)); // 30 minutes from now
    
    return `Next: ${nextCheck.toLocaleTimeString()}`;
}
