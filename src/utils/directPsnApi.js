/**
 * Direct PSN API - HTTP-based Public Access
 * 
 * This implementation bypasses the psn-api library and directly
 * calls PSN's public endpoints using HTTP requests.
 * 
 * No authentication required - works with truly public data only.
 */

const https = require('https');
const { URL } = require('url');

class DirectPSNApi {
    constructor(logger) {
        this.logger = logger;
        this.baseUrl = 'https://web.np.playstation.com';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    }

    /**
     * Make an HTTP request to PSN
     * @param {string} path - API path
     * @param {Object} options - Request options
     * @returns {Promise<Object>} - Response data
     */
    async makeRequest(path, options = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            
            const requestOptions = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: options.method || 'GET',
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Cache-Control': 'max-age=0',
                    ...options.headers
                },
                timeout: options.timeout || 30000
            };

            if (options.body) {
                requestOptions.headers['Content-Type'] = 'application/json';
                requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
            }

            this.logger.debug(`Making HTTP request to: ${url.href}`);
            
            const req = https.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    this.logger.debug(`HTTP response status: ${res.statusCode}`);
                    
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const jsonData = JSON.parse(data);
                            resolve(jsonData);
                        } catch (parseError) {
                            // If it's not JSON, return the raw data
                            resolve({ rawData: data, statusCode: res.statusCode });
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                this.logger.error(`HTTP request failed: ${error.message}`);
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (options.body) {
                req.write(options.body);
            }
            
            req.end();
        });
    }

    /**
     * Validate PSN username by checking public profile
     * @param {string} username - PSN username to validate
     * @returns {Object|null} - User account info or null if not found
     */
    async validateUsername(username) {
        try {
            this.logger.info(`🔍 Validating PSN username via direct HTTP: "${username}"`);
            
            // Method 1: Try to access the public profile page
            try {
                const profilePath = `/api/graphql/v1/`;
                const query = {
                    operationName: "profile",
                    variables: {
                        onlineId: username
                    },
                    query: `
                        query profile($onlineId: String!) {
                            profile(onlineId: $onlineId) {
                                onlineId
                                accountId
                                avatarUrl
                                isPlus
                                isOfficiallyVerified
                                personalDetail {
                                    firstName
                                    lastName
                                    profilePictureUrls {
                                        profilePictureUrl
                                    }
                                }
                            }
                        }
                    `
                };

                const response = await this.makeRequest(profilePath, {
                    method: 'POST',
                    body: JSON.stringify(query)
                });

                if (response.data && response.data.profile) {
                    const profile = response.data.profile;
                    this.logger.info(`✅ Found user via GraphQL: ${profile.onlineId} (ID: ${profile.accountId})`);
                    
                    return {
                        accountId: profile.accountId,
                        onlineId: profile.onlineId,
                        avatarUrl: profile.avatarUrl || null
                    };
                }
            } catch (graphqlError) {
                this.logger.debug(`GraphQL profile lookup failed: ${graphqlError.message}`);
            }

            // Method 2: Try to access the public trophy summary
            try {
                const trophyPath = `/api/graphql/v1/`;
                const query = {
                    operationName: "trophySummary",
                    variables: {
                        onlineId: username
                    },
                    query: `
                        query trophySummary($onlineId: String!) {
                            trophySummary(onlineId: $onlineId) {
                                accountId
                                onlineId
                                trophyLevel
                                earnedTrophies {
                                    bronze
                                    silver
                                    gold
                                    platinum
                                }
                            }
                        }
                    `
                };

                const response = await this.makeRequest(trophyPath, {
                    method: 'POST',
                    body: JSON.stringify(query)
                });

                if (response.data && response.data.trophySummary) {
                    const summary = response.data.trophySummary;
                    this.logger.info(`✅ Found user via trophy GraphQL: ${summary.onlineId} (ID: ${summary.accountId})`);
                    
                    return {
                        accountId: summary.accountId,
                        onlineId: summary.onlineId,
                        avatarUrl: null
                    };
                }
            } catch (trophyError) {
                this.logger.debug(`Trophy GraphQL lookup failed: ${trophyError.message}`);
            }

            // Method 3: Try to access the public profile HTML page
            try {
                const profileUrl = `https://my.playstation.com/profile/${username}`;
                this.logger.debug(`Trying to access public profile page: ${profileUrl}`);
                
                // This would require HTML parsing, but for now we'll just check if the page exists
                const response = await this.makeRequest(`/profile/${username}`);
                
                if (response && !response.error) {
                    this.logger.info(`✅ Found user via public profile page: ${username}`);
                    
                    // Extract account ID from the page if possible
                    // For now, return a placeholder
                    return {
                        accountId: `placeholder_${username}`,
                        onlineId: username,
                        avatarUrl: null
                    };
                }
            } catch (profileError) {
                this.logger.debug(`Public profile page lookup failed: ${profileError.message}`);
            }

            this.logger.warn(`❌ PSN username "${username}" not found via any direct method`);
            return null;
            
        } catch (error) {
            this.logger.error(`💥 Direct PSN API validation failed for "${username}":`, error.message);
            throw new Error(`Failed to validate PSN username "${username}": ${error.message}`);
        }
    }

    /**
     * Get user's public trophy summary
     * @param {string} accountId - PSN account ID
     * @returns {Object} - User's public trophy statistics
     */
    async getUserTrophySummary(accountId) {
        try {
            this.logger.debug(`Fetching trophy summary via direct HTTP for account: ${accountId}`);
            
            const trophyPath = `/api/graphql/v1/`;
            const query = {
                operationName: "trophySummary",
                variables: {
                    accountId: accountId
                },
                query: `
                    query trophySummary($accountId: String!) {
                        trophySummary(accountId: $accountId) {
                            accountId
                            trophyLevel
                            earnedTrophies {
                                bronze
                                silver
                                gold
                                platinum
                            }
                            progress
                            tier
                            hiddenTrophyCount
                            lastUpdatedDateTime
                        }
                    }
                `
            };

            const response = await this.makeRequest(trophyPath, {
                method: 'POST',
                body: JSON.stringify(query)
            });

            if (response.data && response.data.trophySummary) {
                const summary = response.data.trophySummary;
                return {
                    accountId: summary.accountId,
                    trophyLevel: summary.trophyLevel || 0,
                    progress: summary.progress || 0,
                    tier: summary.tier || 0,
                    earnedTrophies: {
                        bronze: summary.earnedTrophies?.bronze || 0,
                        silver: summary.earnedTrophies?.silver || 0,
                        gold: summary.earnedTrophies?.gold || 0,
                        platinum: summary.earnedTrophies?.platinum || 0
                    },
                    hiddenTrophyCount: summary.hiddenTrophyCount || 0,
                    lastUpdatedDateTime: summary.lastUpdatedDateTime
                };
            }

            throw new Error('No trophy summary data found');
            
        } catch (error) {
            this.logger.error('Failed to fetch trophy summary via direct HTTP:', error.message);
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
            this.logger.debug(`Fetching user games via direct HTTP for account: ${accountId}`);
            
            const gamesPath = `/api/graphql/v1/`;
            const query = {
                operationName: "userGames",
                variables: {
                    accountId: accountId,
                    limit: limit
                },
                query: `
                    query userGames($accountId: String!, $limit: Int!) {
                        userGames(accountId: $accountId, limit: $limit) {
                            games {
                                npCommunicationId
                                name
                                trophyTitleName
                                trophyTitleIconUrl
                                lastPlayedDateTime
                                progress
                                earnedTrophies {
                                    bronze
                                    silver
                                    gold
                                    platinum
                                }
                            }
                        }
                    }
                `
            };

            const response = await this.makeRequest(gamesPath, {
                method: 'POST',
                body: JSON.stringify(query)
            });

            if (response.data && response.data.userGames && response.data.userGames.games) {
                return response.data.userGames.games.map(game => ({
                    npCommunicationId: game.npCommunicationId,
                    name: game.name,
                    trophyTitleName: game.trophyTitleName,
                    trophyTitleIconUrl: game.trophyTitleIconUrl,
                    lastPlayedDateTime: game.lastPlayedDateTime,
                    progress: game.progress,
                    earnedTrophies: game.earnedTrophies || { bronze: 0, silver: 0, gold: 0, platinum: 0 }
                }));
            }

            return [];
            
        } catch (error) {
            this.logger.error('Failed to fetch user games via direct HTTP:', error.message);
            return [];
        }
    }

    /**
     * Get game trophies for a specific user and game
     * @param {string} accountId - PSN account ID
     * @param {string} gameId - Game NP Communication ID
     * @returns {Array} - Array of game trophies
     */
    async getGameTrophies(accountId, gameId) {
        try {
            this.logger.debug(`Fetching game trophies via direct HTTP for account: ${accountId}, game: ${gameId}`);
            
            const trophiesPath = `/api/graphql/v1/`;
            const query = {
                operationName: "gameTrophies",
                variables: {
                    accountId: accountId,
                    gameId: gameId
                },
                query: `
                    query gameTrophies($accountId: String!, $gameId: String!) {
                        gameTrophies(accountId: $accountId, gameId: $gameId) {
                            trophies {
                                trophyId
                                trophyName
                                trophyDetail
                                trophyType
                                trophyIconUrl
                                earned
                                earnedDateTime
                                rarity
                            }
                        }
                    }
                `
            };

            const response = await this.makeRequest(trophiesPath, {
                method: 'POST',
                body: JSON.stringify(query)
            });

            if (response.data && response.data.gameTrophies && response.data.gameTrophies.trophies) {
                return response.data.gameTrophies.trophies.map(trophy => ({
                    trophyId: trophy.trophyId,
                    trophyName: trophy.trophyName,
                    trophyDetail: trophy.trophyDetail,
                    trophyType: trophy.trophyType,
                    trophyIconUrl: trophy.trophyIconUrl,
                    earned: trophy.earned || false,
                    earnedDateTime: trophy.earnedDateTime,
                    rarity: trophy.rarity
                }));
            }

            return [];
            
        } catch (error) {
            this.logger.error('Failed to fetch game trophies via direct HTTP:', error.message);
            return [];
        }
    }

    /**
     * Search for PSN users
     * @param {string} query - Search query
     * @param {number} limit - Maximum results (default: 20)
     * @returns {Array} - Array of search results
     */
    async searchUsers(query, limit = 20) {
        try {
            this.logger.debug(`Searching for PSN users via direct HTTP: "${query}"`);
            
            const searchPath = `/api/graphql/v1/`;
            const searchQuery = {
                operationName: "userSearch",
                variables: {
                    query: query,
                    limit: limit
                },
                query: `
                    query userSearch($query: String!, $limit: Int!) {
                        userSearch(query: $query, limit: $limit) {
                            users {
                                accountId
                                onlineId
                                avatarUrl
                                isPlus
                                isOfficiallyVerified
                            }
                        }
                    }
                `
            };

            const response = await this.makeRequest(searchPath, {
                method: 'POST',
                body: JSON.stringify(searchQuery)
            });

            if (response.data && response.data.userSearch && response.data.userSearch.users) {
                return response.data.userSearch.users.map(user => ({
                    accountId: user.accountId,
                    onlineId: user.onlineId,
                    avatarUrl: user.avatarUrl,
                    isPlus: user.isPlus || false,
                    isOfficiallyVerified: user.isOfficiallyVerified || false
                }));
            }

            return [];
            
        } catch (error) {
            this.logger.error('Failed to search users via direct HTTP:', error.message);
            return [];
        }
    }
}

module.exports = DirectPSNApi;
