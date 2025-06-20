/**
 * PSN API Utility - PlayStation Network API Integration
 * 
 * Handles authentication and data retrieval from PlayStation Network:
 * - User authentication via NPSSO tokens
 * - Trophy data fetching
 * - Game information retrieval
 * - Profile data access
 * 
 * Uses the psn-api library for PlayStation Network interactions
 */

const {
    exchangeNpssoForCode,
    exchangeCodeForAccessToken,
    exchangeRefreshTokenForAuthTokens,
    getUserTitles,
    getTitleTrophies,
    getUserTrophyGroupEarningsForTitle,
    getUserProfileFromAccountId,
    makeUniversalSearch
} = require('psn-api');

class PSNApi {
    constructor(logger) {
        this.logger = logger || console;
    }

    /**
     * Authenticate user with NPSSO token
     * @param {string} npssoToken - NPSSO token from PlayStation Network
     * @returns {Object} - Authentication tokens
     */
    async authenticateWithNpsso(npssoToken) {
        try {
            this.logger.info('Authenticating with PSN using NPSSO token');
            
            // Exchange NPSSO for authorization code
            const authCode = await exchangeNpssoForCode(npssoToken);
            
            // Exchange code for access tokens
            const authTokens = await exchangeCodeForAccessToken(authCode);
            
            this.logger.info('PSN authentication successful');
            
            return {
                accessToken: authTokens.accessToken,
                refreshToken: authTokens.refreshToken,
                expiresIn: authTokens.expiresIn,
                expiresAt: Date.now() + (authTokens.expiresIn * 1000)
            };
            
        } catch (error) {
            this.logger.error('PSN authentication failed:', error.message);
            throw new Error(`PSN authentication failed: ${error.message}`);
        }
    }

    /**
     * Refresh access token using refresh token
     * @param {string} refreshToken - Refresh token
     * @returns {Object} - New authentication tokens
     */
    async refreshAccessToken(refreshToken) {
        try {
            this.logger.debug('Refreshing PSN access token');
            
            const authTokens = await exchangeRefreshTokenForAuthTokens(refreshToken);
            
            return {
                accessToken: authTokens.accessToken,
                refreshToken: authTokens.refreshToken,
                expiresIn: authTokens.expiresIn,
                expiresAt: Date.now() + (authTokens.expiresIn * 1000)
            };
            
        } catch (error) {
            this.logger.error('Token refresh failed:', error.message);
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }

    /**
     * Get user profile information
     * @param {string} accessToken - PSN access token
     * @param {string} accountId - PSN account ID
     * @returns {Object} - User profile data
     */
    async getUserProfile(accessToken, accountId) {
        try {
            this.logger.debug(`Fetching profile for account ID: ${accountId}`);
            
            const profile = await getUserProfileFromAccountId(
                { accessToken },
                accountId
            );
            
            return {
                accountId: profile.accountId,
                onlineId: profile.onlineId,
                avatarUrl: profile.avatarUrls?.[0]?.avatarUrl || null,
                aboutMe: profile.aboutMe || '',
                languagesUsed: profile.languagesUsed || [],
                plus: profile.plus || 0,
                personalDetail: profile.personalDetail || {},
                personalDetailSharing: profile.personalDetailSharing || {},
                personalDetailSharingRequestMessageFlag: profile.personalDetailSharingRequestMessageFlag || false,
                primaryOnlineStatus: profile.primaryOnlineStatus || 'offline',
                presences: profile.presences || []
            };
            
        } catch (error) {
            this.logger.error('Failed to fetch user profile:', error.message);
            throw new Error(`Failed to fetch user profile: ${error.message}`);
        }
    }

    /**
     * Search for PSN user by username
     * @param {string} accessToken - PSN access token
     * @param {string} username - PSN username to search for
     * @returns {Object} - User search results
     */
    async searchUser(accessToken, username) {
        try {
            this.logger.debug(`Searching for PSN user: ${username}`);
            
            const searchResults = await makeUniversalSearch(
                { accessToken },
                username,
                'SocialAllAccounts'
            );
            
            return searchResults;
            
        } catch (error) {
            this.logger.error('User search failed:', error.message);
            throw new Error(`User search failed: ${error.message}`);
        }
    }

    /**
     * Get user's game library
     * @param {string} accessToken - PSN access token
     * @param {string} accountId - PSN account ID
     * @param {number} limit - Number of games to fetch (default: 100)
     * @returns {Array} - Array of game titles
     */
    async getUserGames(accessToken, accountId, limit = 100) {
        try {
            this.logger.debug(`Fetching games for account ID: ${accountId}`);
            
            const titles = await getUserTitles(
                { accessToken },
                accountId,
                {
                    limit,
                    offset: 0
                }
            );
            
            return titles.trophyTitles.map(title => ({
                npCommunicationId: title.npCommunicationId,
                trophyTitleName: title.trophyTitleName,
                trophyTitleDetail: title.trophyTitleDetail,
                trophyTitleIconUrl: title.trophyTitleIconUrl,
                trophyTitlePlatform: title.trophyTitlePlatform,
                hasTrophyGroups: title.hasTrophyGroups,
                definedTrophies: title.definedTrophies,
                progress: title.progress,
                earnedTrophies: title.earnedTrophies,
                hiddenFlag: title.hiddenFlag,
                lastUpdatedDateTime: title.lastUpdatedDateTime
            }));
            
        } catch (error) {
            this.logger.error('Failed to fetch user games:', error.message);
            throw new Error(`Failed to fetch user games: ${error.message}`);
        }
    }

    /**
     * Get trophies for a specific game
     * @param {string} accessToken - PSN access token
     * @param {string} npCommunicationId - Game's NP Communication ID
     * @param {string} trophyGroupId - Trophy group ID (usually 'default')
     * @returns {Array} - Array of trophies
     */
    async getGameTrophies(accessToken, npCommunicationId, trophyGroupId = 'default') {
        try {
            this.logger.debug(`Fetching trophies for game: ${npCommunicationId}`);
            
            const trophies = await getTitleTrophies(
                { accessToken },
                npCommunicationId,
                'all',
                {
                    npServiceName: 'trophy'
                }
            );
            
            return trophies.trophies.map(trophy => ({
                trophyId: trophy.trophyId,
                trophyHidden: trophy.trophyHidden,
                earned: trophy.earned,
                earnedDateTime: trophy.earnedDateTime,
                trophyType: trophy.trophyType,
                trophyRare: trophy.trophyRare,
                trophyEarnedRate: trophy.trophyEarnedRate,
                trophyName: trophy.trophyName,
                trophyDetail: trophy.trophyDetail,
                trophyIconUrl: trophy.trophyIconUrl,
                trophyGroupId: trophy.trophyGroupId
            }));
            
        } catch (error) {
            this.logger.error('Failed to fetch game trophies:', error.message);
            throw new Error(`Failed to fetch game trophies: ${error.message}`);
        }
    }

    /**
     * Get user's earned trophies for a specific game
     * @param {string} accessToken - PSN access token
     * @param {string} accountId - PSN account ID
     * @param {string} npCommunicationId - Game's NP Communication ID
     * @param {string} trophyGroupId - Trophy group ID (usually 'default')
     * @returns {Object} - User's trophy progress for the game
     */
    async getUserGameTrophies(accessToken, accountId, npCommunicationId, trophyGroupId = 'default') {
        try {
            this.logger.debug(`Fetching user trophies for game: ${npCommunicationId}`);
            
            const userTrophies = await getUserTrophyGroupEarningsForTitle(
                { accessToken },
                accountId,
                npCommunicationId,
                trophyGroupId,
                {
                    npServiceName: 'trophy'
                }
            );
            
            return {
                npCommunicationId,
                trophyGroupId,
                progress: userTrophies.progress,
                earnedTrophies: userTrophies.earnedTrophies,
                lastUpdatedDateTime: userTrophies.lastUpdatedDateTime,
                trophies: userTrophies.trophies?.map(trophy => ({
                    trophyId: trophy.trophyId,
                    earned: trophy.earned,
                    earnedDateTime: trophy.earnedDateTime,
                    trophyType: trophy.trophyType,
                    trophyRare: trophy.trophyRare,
                    trophyEarnedRate: trophy.trophyEarnedRate
                })) || []
            };
            
        } catch (error) {
            this.logger.error('Failed to fetch user game trophies:', error.message);
            throw new Error(`Failed to fetch user game trophies: ${error.message}`);
        }
    }

    /**
     * Get recently earned trophies for a user
     * @param {string} accessToken - PSN access token
     * @param {string} accountId - PSN account ID
     * @param {number} limit - Number of recent trophies to fetch
     * @returns {Array} - Array of recently earned trophies
     */
    async getRecentTrophies(accessToken, accountId, limit = 50) {
        try {
            this.logger.debug(`Fetching recent trophies for account: ${accountId}`);
            
            // Get all games first
            const games = await this.getUserGames(accessToken, accountId, limit);
            
            // Get recent trophies from games with recent activity
            const recentTrophies = [];
            
            for (const game of games.slice(0, 10)) { // Check only first 10 most recent games
                try {
                    const gameTrophies = await this.getUserGameTrophies(
                        accessToken, 
                        accountId, 
                        game.npCommunicationId
                    );
                    
                    // Add earned trophies with game context
                    const earnedTrophies = gameTrophies.trophies
                        .filter(trophy => trophy.earned)
                        .map(trophy => ({
                            ...trophy,
                            gameTitle: game.trophyTitleName,
                            gameIcon: game.trophyTitleIconUrl,
                            npCommunicationId: game.npCommunicationId
                        }));
                    
                    recentTrophies.push(...earnedTrophies);
                    
                } catch (gameError) {
                    this.logger.warn(`Failed to fetch trophies for game ${game.trophyTitleName}:`, gameError.message);
                }
            }
            
            // Sort by earned date and return most recent
            return recentTrophies
                .sort((a, b) => new Date(b.earnedDateTime) - new Date(a.earnedDateTime))
                .slice(0, limit);
            
        } catch (error) {
            this.logger.error('Failed to fetch recent trophies:', error.message);
            throw new Error(`Failed to fetch recent trophies: ${error.message}`);
        }
    }

    /**
     * Check if access token is still valid
     * @param {string} accessToken - PSN access token
     * @param {number} expiresAt - Token expiration timestamp
     * @returns {boolean} - Whether token is valid
     */
    isTokenValid(accessToken, expiresAt) {
        if (!accessToken || !expiresAt) {
            return false;
        }
        
        // Check if token expires in the next 5 minutes
        const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
        return expiresAt > fiveMinutesFromNow;
    }

    /**
     * Validate NPSSO token format
     * @param {string} npssoToken - NPSSO token to validate
     * @returns {boolean} - Whether token format is valid
     */
    isValidNpssoToken(npssoToken) {
        if (!npssoToken || typeof npssoToken !== 'string') {
            return false;
        }
        
        // NPSSO tokens are typically 64 character hex strings
        return /^[a-fA-F0-9]{64}$/.test(npssoToken);
    }
}

module.exports = PSNApi;
