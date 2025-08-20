/**
 * Public PSN API Utility - No Authentication Required
 * 
 * Handles public PlayStation Network data retrieval without requiring
 * NPSSO tokens or user authentication. Uses the psn-api library's
 * public endpoints for:
 * - User search and validation
 * - Public trophy data
 * - Game information
 * - User profile summaries
 */

const {
    getUserTitles,
    getTitleTrophies,
    getTitleTrophyGroups,
    getUserTrophyProfileSummary,
    makeUniversalSearch
} = require('psn-api');

class PublicPSNApi {
    constructor(logger) {
        this.logger = logger || console;
        // Default timeout of 30 seconds for PSN API calls
        this.defaultTimeout = 30000;
    }

    /**
     * Create a timeout wrapper for PSN API calls to prevent hanging requests
     * @param {Promise} promise - The promise to wrap
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise} - Promise that rejects after timeout
     */
    withTimeout(promise, timeout = this.defaultTimeout) {
        let timeoutId;
        
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(`PSN API request timed out after ${timeout}ms`));
            }, timeout);
        });

        // Wrap the original promise to clear timeout on completion
        const wrappedPromise = promise.then(
            (result) => {
                clearTimeout(timeoutId);
                return result;
            },
            (error) => {
                clearTimeout(timeoutId);
                throw error;
            }
        );

        return Promise.race([wrappedPromise, timeoutPromise]).catch((error) => {
            clearTimeout(timeoutId);
            throw error;
        });
    }

    /**
     * Validate PSN username and get account ID
     * @param {string} username - PSN username to validate
     * @returns {Object|null} - User account info or null if not found
     */
    async validateUsername(username) {
        try {
            this.logger.debug(`Validating PSN username: ${username}`);
            
            const searchResults = await this.withTimeout(makeUniversalSearch(
                {}, // No auth token needed
                username,
                'SocialAllAccounts'
            ));
            
            // Check if we found an exact match
            if (searchResults && searchResults.length > 0) {
                const exactMatch = searchResults.find(result => 
                    result.onlineId && result.onlineId.toLowerCase() === username.toLowerCase()
                );
                
                if (exactMatch) {
                    return {
                        accountId: exactMatch.accountId,
                        onlineId: exactMatch.onlineId,
                        avatarUrl: exactMatch.avatarUrl || null
                    };
                }
            }
            
            this.logger.warn(`PSN username not found: ${username}`);
            return null;
            
        } catch (error) {
            this.logger.error('PSN username validation failed:', error.message);
            throw new Error(`Failed to validate PSN username: ${error.message}`);
        }
    }

    /**
     * Get user's public trophy summary
     * @param {string} accountId - PSN account ID
     * @returns {Object} - User's public trophy statistics
     */
    async getUserTrophySummary(accountId) {
        try {
            this.logger.debug(`Fetching trophy summary for account: ${accountId}`);
            
            const summary = await this.withTimeout(getUserTrophyProfileSummary(
                {}, // No auth token needed
                accountId
            ));
            
            return {
                accountId: summary.accountId,
                trophyLevel: summary.trophyLevel,
                progress: summary.progress,
                tier: summary.tier,
                earnedTrophies: {
                    bronze: summary.earnedTrophies?.bronze || 0,
                    silver: summary.earnedTrophies?.silver || 0,
                    gold: summary.earnedTrophies?.gold || 0,
                    platinum: summary.earnedTrophies?.platinum || 0
                },
                hiddenTrophyCount: summary.hiddenTrophyCount || 0,
                lastUpdatedDateTime: summary.lastUpdatedDateTime
            };
            
        } catch (error) {
            this.logger.error('Failed to fetch trophy summary:', error.message);
            throw new Error(`Failed to fetch trophy summary: ${error.message}`);
        }
    }

    /**
     * Get user's public game library
     * @param {string} accountId - PSN account ID
     * @param {number} limit - Number of games to fetch (default: 100)
     * @returns {Array} - Array of user's games with public progress
     */
    async getUserGames(accountId, limit = 100) {
        try {
            this.logger.debug(`Fetching games for account: ${accountId}`);
            
            const titles = await this.withTimeout(getUserTitles(
                {}, // No auth token needed
                accountId,
                {
                    limit,
                    offset: 0
                }
            ));
            
            return titles.trophyTitles.map(title => ({
                npCommunicationId: title.npCommunicationId,
                trophyTitleName: title.trophyTitleName,
                trophyTitleDetail: title.trophyTitleDetail,
                trophyTitleIconUrl: title.trophyTitleIconUrl,
                trophyTitlePlatform: title.trophyTitlePlatform,
                hasTrophyGroups: title.hasTrophyGroups,
                definedTrophies: title.definedTrophies || {},
                progress: title.progress || 0,
                earnedTrophies: title.earnedTrophies || {},
                hiddenFlag: title.hiddenFlag,
                lastUpdatedDateTime: title.lastUpdatedDateTime
            }));
            
        } catch (error) {
            this.logger.error('Failed to fetch user games:', error.message);
            throw new Error(`Failed to fetch user games: ${error.message}`);
        }
    }

    /**
     * Get all trophies for a specific game (public data)
     * @param {string} npCommunicationId - Game's NP Communication ID
     * @param {string} trophyGroupId - Trophy group ID (usually 'all')
     * @returns {Array} - Array of trophies with details
     */
    async getGameTrophies(npCommunicationId, trophyGroupId = 'all') {
        try {
            this.logger.debug(`Fetching trophies for game: ${npCommunicationId}`);
            
            const trophies = await this.withTimeout(getTitleTrophies(
                {}, // No auth token needed
                npCommunicationId,
                trophyGroupId,
                {
                    npServiceName: 'trophy'
                }
            ));
            
            return {
                npCommunicationId,
                trophyTitleName: trophies.trophyTitleName,
                trophyTitleDetail: trophies.trophyTitleDetail,
                trophyTitleIconUrl: trophies.trophyTitleIconUrl,
                trophyTitlePlatform: trophies.trophyTitlePlatform,
                definedTrophies: trophies.definedTrophies,
                trophies: trophies.trophies.map(trophy => ({
                    trophyId: trophy.trophyId,
                    trophyHidden: trophy.trophyHidden,
                    trophyType: trophy.trophyType,
                    trophyName: trophy.trophyName,
                    trophyDetail: trophy.trophyDetail,
                    trophyIconUrl: trophy.trophyIconUrl,
                    trophyGroupId: trophy.trophyGroupId,
                    trophyRare: trophy.trophyRare || 0,
                    trophyEarnedRate: trophy.trophyEarnedRate || '0.0%'
                }))
            };
            
        } catch (error) {
            this.logger.error('Failed to fetch game trophies:', error.message);
            throw new Error(`Failed to fetch game trophies: ${error.message}`);
        }
    }

    /**
     * Get trophy groups for a specific game
     * @param {string} npCommunicationId - Game's NP Communication ID
     * @returns {Array} - Array of trophy groups
     */
    async getGameTrophyGroups(npCommunicationId) {
        try {
            this.logger.debug(`Fetching trophy groups for game: ${npCommunicationId}`);
            
            const groups = await this.withTimeout(getTitleTrophyGroups(
                {}, // No auth token needed
                npCommunicationId,
                {
                    npServiceName: 'trophy'
                }
            ));
            
            return {
                npCommunicationId,
                trophyTitleName: groups.trophyTitleName,
                trophyTitleIconUrl: groups.trophyTitleIconUrl,
                trophyGroups: groups.trophyGroups.map(group => ({
                    trophyGroupId: group.trophyGroupId,
                    trophyGroupName: group.trophyGroupName,
                    trophyGroupDetail: group.trophyGroupDetail,
                    trophyGroupIconUrl: group.trophyGroupIconUrl,
                    definedTrophies: group.definedTrophies
                }))
            };
            
        } catch (error) {
            this.logger.error('Failed to fetch trophy groups:', error.message);
            throw new Error(`Failed to fetch trophy groups: ${error.message}`);
        }
    }

    /**
     * Search for PSN users by username
     * @param {string} query - Search query (username)
     * @param {number} limit - Maximum number of results (default: 10)
     * @returns {Array} - Array of matching users
     */
    async searchUsers(query, limit = 10) {
        try {
            this.logger.debug(`Searching for PSN users: ${query}`);
            
            const searchResults = await this.withTimeout(makeUniversalSearch(
                {}, // No auth token needed
                query,
                'SocialAllAccounts'
            ));
            
            if (!searchResults || searchResults.length === 0) {
                return [];
            }
            
            return searchResults.slice(0, limit).map(result => ({
                accountId: result.accountId,
                onlineId: result.onlineId,
                avatarUrl: result.avatarUrl || null
            }));
            
        } catch (error) {
            this.logger.error('User search failed:', error.message);
            throw new Error(`User search failed: ${error.message}`);
        }
    }

    /**
     * Check if a PSN username exists (lightweight validation)
     * @param {string} username - PSN username to check
     * @returns {boolean} - Whether the username exists
     */
    async usernameExists(username) {
        try {
            const result = await this.validateUsername(username);
            return result !== null;
        } catch (error) {
            this.logger.warn(`Username existence check failed for ${username}:`, error.message);
            return false;
        }
    }

    /**
     * Get recent games for a user (games with recent activity)
     * @param {string} accountId - PSN account ID
     * @param {number} limit - Number of recent games to fetch
     * @returns {Array} - Array of recently played games
     */
    async getRecentGames(accountId, limit = 10) {
        try {
            this.logger.debug(`Fetching recent games for account: ${accountId}`);
            
            const games = await this.getUserGames(accountId, limit * 2);
            
            // Sort by last updated date and return most recent
            return games
                .filter(game => game.lastUpdatedDateTime)
                .sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime))
                .slice(0, limit);
            
        } catch (error) {
            this.logger.error('Failed to fetch recent games:', error.message);
            throw new Error(`Failed to fetch recent games: ${error.message}`);
        }
    }

    /**
     * Get trophy statistics for a user across all games
     * @param {string} accountId - PSN account ID
     * @returns {Object} - Comprehensive trophy statistics
     */
    async getDetailedTrophyStats(accountId) {
        try {
            this.logger.debug(`Fetching detailed trophy stats for account: ${accountId}`);
            
            const [summary, games] = await Promise.all([
                this.getUserTrophySummary(accountId),
                this.getUserGames(accountId, 50)
            ]);
            
            // Calculate additional statistics
            const completedGames = games.filter(game => game.progress === 100).length;
            const gamesWithPlatinum = games.filter(game => 
                game.earnedTrophies && game.earnedTrophies.platinum > 0
            ).length;
            
            const averageCompletion = games.length > 0 
                ? Math.round(games.reduce((sum, game) => sum + game.progress, 0) / games.length)
                : 0;
            
            return {
                ...summary,
                gameStats: {
                    totalGames: games.length,
                    completedGames,
                    gamesWithPlatinum,
                    averageCompletion,
                    recentGames: games.slice(0, 5)
                }
            };
            
        } catch (error) {
            this.logger.error('Failed to fetch detailed trophy stats:', error.message);
            throw new Error(`Failed to fetch detailed trophy stats: ${error.message}`);
        }
    }
}

module.exports = PublicPSNApi;
