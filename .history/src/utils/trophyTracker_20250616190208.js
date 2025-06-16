/**
 * Trophy Tracker - Automated Trophy Monitoring System
 * 
 * Monitors users for new trophy achievements and sends Discord notifications
 * Features:
 * - Periodic trophy checking for all registered users
 * - New trophy detection and storage
 * - Discord notification dispatch
 * - Platinum trophy special handling
 * - Rate limiting and error handling
 */

const PSNApi = require('./psnApi');
const { EmbedBuilder } = require('discord.js');

class TrophyTracker {
    constructor(database, logger, client = null) {
        this.database = database;
        this.logger = logger;
        this.client = client;
        this.psnApi = new PSNApi(logger);
        
        // Rate limiting - delay between API calls
        this.apiDelay = 2000; // 2 seconds between calls
    }

    /**
     * Check all users for new trophies
     */
    async checkAllUsers() {
        try {
            this.logger.info('Starting trophy check for all users...');
            
            let users;
            try {
                users = await this.database.getUsersWithNotifications();
            } catch (dbError) {
                this.logger.error('Database error fetching users for trophy check:', dbError);
                return;
            }
            this.logger.info(`Found ${users.length} users to check for trophies`);
            
            for (const user of users) {
                try {
                    await this.checkUserTrophies(user);
                    
                    // Rate limiting
                    if (users.length > 1) {
                        await this.sleep(this.apiDelay);
                    }
                    
                } catch (error) {
                    this.logger.error(`Error checking trophies for user ${user.discord_id}:`, error.message);
                }
            }
            
            this.logger.info('Trophy check completed for all users');
            
        } catch (error) {
            this.logger.error('Error during bulk trophy check:', error);
        }
    }

    /**
     * Check trophies for a specific user
     * @param {Object} user - User data from database
     */
    async checkUserTrophies(user) {
        try {
            this.logger.debug(`Checking trophies for user: ${user.psn_username}`);
            
            // Validate user has required tokens
            if (!user.access_token || !user.psn_account_id) {
                this.logger.warn(`User ${user.discord_id} missing PSN authentication`);
                return;
            }
            
            // Check if token needs refresh
            const accessToken = await this.ensureValidToken(user);
            if (!accessToken) {
                this.logger.warn(`Unable to get valid token for user ${user.discord_id}`);
                return;
            }
            
            // Get recent trophies from PSN
            const recentTrophies = await this.psnApi.getRecentTrophies(
                accessToken, 
                user.psn_account_id, 
                50
            );
            
            // Filter for new trophies (earned after last check)
            const lastCheck = user.last_trophy_check || 0;
            const newTrophies = recentTrophies.filter(trophy => {
                const earnedTime = new Date(trophy.earnedDateTime).getTime() / 1000;
                return earnedTime > lastCheck;
            });
            
            if (newTrophies.length > 0) {
                this.logger.info(`Found ${newTrophies.length} new trophies for ${user.psn_username}`);
                
                // Process and store new trophies
                for (const trophy of newTrophies) {
                    await this.processTrophy(user, trophy);
                }
                
                // Send notification if enabled
                if (user.notification_enabled && this.client) {
                    await this.sendTrophyNotifications(user, newTrophies);
                }
            }
            
            // Update last check timestamp
            try {
                await this.database.updateLastTrophyCheck(user.discord_id);
            } catch (dbError) {
                this.logger.error(`Database error updating last trophy check for user ${user.discord_id}:`, dbError);
            }
            
        } catch (error) {
            this.logger.error(`Error checking trophies for ${user.psn_username}:`, error.message);
        }
    }

    /**
     * Process and store a new trophy
     * @param {Object} user - User data
     * @param {Object} trophy - Trophy data from PSN
     */
    async processTrophy(user, trophy) {
        try {
            const trophyData = {
                discordId: user.discord_id,
                trophyId: trophy.trophyId,
                trophyName: trophy.trophyName || 'Unknown Trophy',
                trophyDescription: trophy.trophyDetail || '',
                trophyType: trophy.trophyType,
                trophyIconUrl: trophy.trophyIconUrl || '',
                gameTitle: trophy.gameTitle || 'Unknown Game',
                gameId: trophy.npCommunicationId || '',
                earnedDate: Math.floor(new Date(trophy.earnedDateTime).getTime() / 1000),
                isPlatinum: trophy.trophyType === 'platinum',
                notified: false
            };
            
            try {
                await this.database.saveTrophy(trophyData);
            } catch (dbError) {
                this.logger.error(`Database error saving trophy for user ${user.discord_id}:`, dbError);
                throw dbError; // Re-throw to handle in parent function
            }
            this.logger.debug(`Saved trophy: ${trophy.trophyName} for ${user.psn_username}`);
            
        } catch (error) {
            this.logger.error('Error processing trophy:', error.message);
        }
    }

    /**
     * Send Discord notifications for new trophies
     * @param {Object} user - User data
     * @param {Array} trophies - Array of new trophies
     */
    async sendTrophyNotifications(user, trophies) {
        try {
            if (!this.client) {
                this.logger.warn('No Discord client available for notifications');
                return;
            }
            
            // Get notification settings
            const settings = await this.database.get(
                'SELECT * FROM notification_settings WHERE discord_id = ?',
                [user.discord_id]
            );
            
            const channelId = settings?.channel_id;
            if (!channelId) {
                this.logger.debug(`No notification channel set for user ${user.discord_id}`);
                return;
            }
            
            const channel = await this.client.channels.fetch(channelId);
            if (!channel) {
                this.logger.warn(`Cannot find notification channel ${channelId}`);
                return;
            }
            
            // Group trophies by type
            const platinums = trophies.filter(t => t.trophyType === 'platinum');
            const golds = trophies.filter(t => t.trophyType === 'gold');
            const silvers = trophies.filter(t => t.trophyType === 'silver');
            const bronzes = trophies.filter(t => t.trophyType === 'bronze');
            
            // Send platinum notifications separately
            if (platinums.length > 0 && settings?.platinum_notifications) {
                for (const platinum of platinums) {
                    await this.sendPlatinumNotification(channel, user, platinum);
                }
            }
            
            // Send regular trophy notifications
            if (settings?.trophy_notifications) {
                const regularTrophies = [...golds, ...silvers, ...bronzes];
                if (regularTrophies.length > 0) {
                    await this.sendTrophyBatchNotification(channel, user, regularTrophies);
                }
            }
            
        } catch (error) {
            this.logger.error('Error sending trophy notifications:', error.message);
        }
    }

    /**
     * Send special notification for platinum trophies
     * @param {Object} channel - Discord channel
     * @param {Object} user - User data
     * @param {Object} trophy - Platinum trophy data
     */
    async sendPlatinumNotification(channel, user, trophy) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🏆 PLATINUM TROPHY EARNED!')
                .setDescription(`**${user.psn_username}** just earned a Platinum Trophy!`)
                .addFields([
                    {
                        name: '🏆 Trophy',
                        value: trophy.trophyName || 'Unknown Trophy',
                        inline: true
                    },
                    {
                        name: '🎮 Game',
                        value: trophy.gameTitle || 'Unknown Game',
                        inline: true
                    },
                    {
                        name: '⏰ Earned',
                        value: `<t:${Math.floor(new Date(trophy.earnedDateTime).getTime() / 1000)}:R>`,
                        inline: true
                    }
                ])
                .setColor(0xFFD700) // Gold color for platinum
                .setTimestamp();
            
            if (trophy.trophyIconUrl) {
                embed.setThumbnail(trophy.trophyIconUrl);
            }
            
            if (trophy.gameIcon) {
                embed.setFooter({ 
                    text: trophy.gameTitle,
                    iconURL: trophy.gameIcon 
                });
            }
            
            await channel.send({ embeds: [embed] });
            this.logger.info(`Sent platinum notification for ${user.psn_username}`);
            
        } catch (error) {
            this.logger.error('Error sending platinum notification:', error.message);
        }
    }

    /**
     * Send batch notification for regular trophies
     * @param {Object} channel - Discord channel
     * @param {Object} user - User data
     * @param {Array} trophies - Array of trophies
     */
    async sendTrophyBatchNotification(channel, user, trophies) {
        try {
            const trophyIcons = {
                gold: '🥇',
                silver: '🥈',
                bronze: '🥉'
            };
            
            const embed = new EmbedBuilder()
                .setTitle('🏆 New Trophy Achievements!')
                .setDescription(`**${user.psn_username}** earned ${trophies.length} new trophy${trophies.length > 1 ? 'ies' : ''}`)
                .setColor(0x0099FF)
                .setTimestamp();
            
            // Group trophies by game
            const gameGroups = {};
            trophies.forEach(trophy => {
                const gameTitle = trophy.gameTitle || 'Unknown Game';
                if (!gameGroups[gameTitle]) {
                    gameGroups[gameTitle] = [];
                }
                gameGroups[gameTitle].push(trophy);
            });
            
            // Add fields for each game
            let fieldCount = 0;
            for (const [gameTitle, gameTrophies] of Object.entries(gameGroups)) {
                if (fieldCount >= 25) break; // Discord embed limit
                
                const trophyList = gameTrophies
                    .slice(0, 5) // Limit to 5 trophies per game
                    .map(trophy => {
                        const icon = trophyIcons[trophy.trophyType] || '🏆';
                        return `${icon} ${trophy.trophyName || 'Unknown Trophy'}`;
                    })
                    .join('\n');
                
                embed.addFields([{
                    name: `🎮 ${gameTitle}`,
                    value: trophyList + (gameTrophies.length > 5 ? `\n... and ${gameTrophies.length - 5} more` : ''),
                    inline: false
                }]);
                
                fieldCount++;
            }
            
            await channel.send({ embeds: [embed] });
            this.logger.info(`Sent trophy batch notification for ${user.psn_username} (${trophies.length} trophies)`);
            
        } catch (error) {
            this.logger.error('Error sending trophy batch notification:', error.message);
        }
    }

    /**
     * Ensure user has a valid access token
     * @param {Object} user - User data
     * @returns {string|null} - Valid access token or null
     */
    async ensureValidToken(user) {
        try {
            // Check if current token is still valid
            if (this.psnApi.isTokenValid(user.access_token, user.token_expires_at)) {
                return user.access_token;
            }
            
            // Try to refresh token
            if (user.refresh_token) {
                this.logger.debug(`Refreshing token for user ${user.discord_id}`);
                
                const newTokens = await this.psnApi.refreshAccessToken(user.refresh_token);
                
                // Update tokens in database
                await this.database.run(
                    `UPDATE users SET 
                        access_token = ?, 
                        refresh_token = ?, 
                        token_expires_at = ?,
                        updated_at = strftime('%s', 'now')
                    WHERE discord_id = ?`,
                    [
                        newTokens.accessToken,
                        newTokens.refreshToken,
                        newTokens.expiresAt,
                        user.discord_id
                    ]
                );
                
                return newTokens.accessToken;
            }
            
            this.logger.warn(`No valid token available for user ${user.discord_id}`);
            return null;
            
        } catch (error) {
            this.logger.error(`Error ensuring valid token for user ${user.discord_id}:`, error.message);
            return null;
        }
    }

    /**
     * Get trophy statistics for a user
     * @param {string} discordId - Discord user ID
     * @returns {Object} - Trophy statistics
     */
    async getUserTrophyStats(discordId) {
        try {
            const stats = await this.database.get(`
                SELECT 
                    COUNT(*) as total_trophies,
                    COUNT(CASE WHEN trophy_type = 'platinum' THEN 1 END) as platinum_count,
                    COUNT(CASE WHEN trophy_type = 'gold' THEN 1 END) as gold_count,
                    COUNT(CASE WHEN trophy_type = 'silver' THEN 1 END) as silver_count,
                    COUNT(CASE WHEN trophy_type = 'bronze' THEN 1 END) as bronze_count,
                    COUNT(DISTINCT game_id) as games_played
                FROM trophies 
                WHERE discord_id = ?
            `, [discordId]);
            
            return stats || {
                total_trophies: 0,
                platinum_count: 0,
                gold_count: 0,
                silver_count: 0,
                bronze_count: 0,
                games_played: 0
            };
            
        } catch (error) {
            this.logger.error('Error fetching trophy stats:', error.message);
            return null;
        }
    }

    /**
     * Set Discord client for notifications
     * @param {Object} client - Discord client instance
     */
    setClient(client) {
        this.client = client;
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = TrophyTracker;
