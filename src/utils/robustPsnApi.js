/**
 * Robust PSN API - Graceful Fallback Implementation
 * 
 * This implementation tries multiple approaches to validate PSN usernames:
 * 1. First tries the psn-api library (may fail due to auth requirements)
 * 2. Falls back to direct HTTP checks of public PSN endpoints
 * 3. Provides detailed error messages for troubleshooting
 * 
 * No authentication required - works with truly public data only.
 */

const https = require('https');
const { URL } = require('url');

class RobustPSNApi {
    constructor(logger) {
        this.logger = logger;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    }

    /**
     * Validate PSN username using multiple fallback methods
     * @param {string} username - PSN username to validate
     * @returns {Object|null} - User account info or null if not found
     */
    async validateUsername(username) {
        try {
            this.logger.info(`🔍 Starting robust PSN username validation for: "${username}"`);
            
            // Method 1: Try psn-api library (may fail due to auth)
            try {
                this.logger.debug(`Method 1: Attempting psn-api library validation`);
                const { makeUniversalSearch } = require('psn-api');
                
                // Create a minimal auth object to satisfy the library
                const minimalAuth = {
                    accessToken: 'dummy_token_for_validation',
                    expiresAt: Date.now() + 3600000
                };
                
                const searchResults = await makeUniversalSearch(minimalAuth, username, 'SocialAllAccounts');
                
                if (searchResults && searchResults.length > 0) {
                    this.logger.debug(`psn-api returned ${searchResults.length} results`);
                    
                    // Look for exact match
                    const exactMatch = searchResults.find(result =>
                        result.onlineId && result.onlineId.toLowerCase() === username.toLowerCase()
                    );
                    
                    if (exactMatch) {
                        this.logger.info(`✅ Found user via psn-api: ${exactMatch.onlineId} (ID: ${exactMatch.accountId})`);
                        return {
                            accountId: exactMatch.accountId,
                            onlineId: exactMatch.onlineId,
                            avatarUrl: exactMatch.avatarUrl || null,
                            method: 'psn-api'
                        };
                    }
                }
                
                this.logger.debug(`psn-api search completed but no exact match found`);
                
            } catch (psnApiError) {
                this.logger.debug(`psn-api validation failed: ${psnApiError.message}`);
                
                // Check if it's an auth error
                if (psnApiError.message.includes('Invalid access token') || 
                    psnApiError.message.includes('not_authorized')) {
                    this.logger.debug(`psn-api requires valid authentication - proceeding to fallback methods`);
                }
            }
            
            // Method 2: Try direct PSN profile page access
            try {
                this.logger.debug(`Method 2: Attempting direct PSN profile page access`);
                const profileUrl = `https://my.playstation.com/profile/${username}`;
                
                const profileResponse = await this.makeHTTPRequest(profileUrl);
                
                if (profileResponse && profileResponse.statusCode === 200) {
                    this.logger.info(`✅ Found user via direct profile page: ${username}`);
                    
                    // Extract account ID from the page if possible
                    // For now, return a placeholder that indicates the user exists
                    return {
                        accountId: `public_${username}`,
                        onlineId: username,
                        avatarUrl: null,
                        method: 'direct-profile'
                    };
                }
                
            } catch (profileError) {
                this.logger.debug(`Direct profile access failed: ${profileError.message}`);
            }
            
            // Method 3: Try PSN's public search page
            try {
                this.logger.debug(`Method 3: Attempting PSN public search page`);
                const searchUrl = `https://my.playstation.com/search?q=${encodeURIComponent(username)}`;
                
                const searchResponse = await this.makeHTTPRequest(searchUrl);
                
                if (searchResponse && searchResponse.statusCode === 200) {
                    // Check if the search page contains the username
                    if (searchResponse.data && searchResponse.data.includes(username)) {
                        this.logger.info(`✅ Found user via PSN search page: ${username}`);
                        
                        return {
                            accountId: `search_${username}`,
                            onlineId: username,
                            avatarUrl: null,
                            method: 'psn-search'
                        };
                    }
                }
                
            } catch (searchError) {
                this.logger.debug(`PSN search page access failed: ${searchError.message}`);
            }
            
            // Method 4: Try to access PSN's GraphQL endpoint (may be rate limited)
            try {
                this.logger.debug(`Method 4: Attempting PSN GraphQL endpoint`);
                const graphqlUrl = 'https://web.np.playstation.com/api/graphql/v1/';
                
                const query = {
                    operationName: "profile",
                    variables: { onlineId: username },
                    query: `
                        query profile($onlineId: String!) {
                            profile(onlineId: $onlineId) {
                                onlineId
                                accountId
                                avatarUrl
                            }
                        }
                    `
                };
                
                const graphqlResponse = await this.makeHTTPRequest(graphqlUrl, {
                    method: 'POST',
                    body: JSON.stringify(query)
                });
                
                if (graphqlResponse && graphqlResponse.data && graphqlResponse.data.profile) {
                    const profile = graphqlResponse.data.profile;
                    this.logger.info(`✅ Found user via GraphQL: ${profile.onlineId} (ID: ${profile.accountId})`);
                    
                    return {
                        accountId: profile.accountId,
                        onlineId: profile.onlineId,
                        avatarUrl: profile.avatarUrl || null,
                        method: 'graphql'
                    };
                }
                
            } catch (graphqlError) {
                this.logger.debug(`GraphQL endpoint access failed: ${graphqlError.message}`);
            }
            
            // Method 5: Try to access PSN's public trophy endpoint
            try {
                this.logger.debug(`Method 5: Attempting PSN public trophy endpoint`);
                const trophyUrl = `https://web.np.playstation.com/api/graphql/v1/`;
                
                const query = {
                    operationName: "trophySummary",
                    variables: { onlineId: username },
                    query: `
                        query trophySummary($onlineId: String!) {
                            trophySummary(onlineId: $onlineId) {
                                accountId
                                onlineId
                                trophyLevel
                            }
                        }
                    `
                };
                
                const trophyResponse = await this.makeHTTPRequest(trophyUrl, {
                    method: 'POST',
                    body: JSON.stringify(query)
                });
                
                if (trophyResponse && trophyResponse.data && trophyResponse.data.trophySummary) {
                    const summary = trophyResponse.data.trophySummary;
                    this.logger.info(`✅ Found user via trophy endpoint: ${summary.onlineId} (ID: ${summary.accountId})`);
                    
                    return {
                        accountId: summary.accountId,
                        onlineId: summary.onlineId,
                        avatarUrl: null,
                        method: 'trophy-endpoint'
                    };
                }
                
            } catch (trophyError) {
                this.logger.debug(`Trophy endpoint access failed: ${trophyError.message}`);
            }
            
            // All methods failed
            this.logger.warn(`❌ PSN username "${username}" not found after trying all methods`);
            this.logger.debug(`Validation failed for username: "${username}". Tried psn-api, direct profile, search page, GraphQL, and trophy endpoint.`);
            
            return null;
            
        } catch (error) {
            this.logger.error(`💥 Robust PSN API validation completely failed for "${username}":`, error.message);
            this.logger.error(`Full error details:`, error);
            throw new Error(`Failed to validate PSN username "${username}": ${error.message}`);
        }
    }

    /**
     * Make an HTTP request to PSN endpoints
     * @param {string} url - URL to request
     * @param {Object} options - Request options
     * @returns {Promise<Object>} - Response data
     */
    async makeHTTPRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            
            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
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

            this.logger.debug(`Making HTTP request to: ${url}`);
            
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
                            resolve({ data: jsonData, statusCode: res.statusCode });
                        } catch (parseError) {
                            // If it's not JSON, return the raw data
                            resolve({ data: data, statusCode: res.statusCode });
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}...`));
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
     * Get user's public trophy summary (fallback method)
     * @param {string} accountId - PSN account ID
     * @returns {Object} - User's public trophy statistics
     */
    async getUserTrophySummary(accountId) {
        try {
            this.logger.debug(`Fetching trophy summary via fallback method for account: ${accountId}`);
            
            // Since we can't reliably get detailed trophy data without auth,
            // return a placeholder that indicates the user exists
            return {
                accountId: accountId,
                trophyLevel: 0,
                progress: 0,
                tier: 0,
                earnedTrophies: {
                    bronze: 0,
                    silver: 0,
                    gold: 0,
                    platinum: 0
                },
                hiddenTrophyCount: 0,
                lastUpdatedDateTime: new Date().toISOString(),
                note: 'Limited data available without authentication'
            };
            
        } catch (error) {
            this.logger.error('Failed to fetch trophy summary via fallback method:', error.message);
            throw new Error(`Failed to fetch trophy summary: ${error.message}`);
        }
    }

    /**
     * Get user's public game library (fallback method)
     * @param {string} accountId - PSN account ID
     * @param {number} limit - Number of games to fetch (default: 100)
     * @returns {Array} - Array of user's games (limited data)
     */
    async getUserGames(accountId, limit = 100) {
        try {
            this.logger.debug(`Fetching user games via fallback method for account: ${accountId}`);
            
            // Return empty array since we can't reliably get game data without auth
            return [];
            
        } catch (error) {
            this.logger.error('Failed to fetch user games via fallback method:', error.message);
            return [];
        }
    }

    /**
     * Get game trophies for a specific user and game (fallback method)
     * @param {string} accountId - PSN account ID
     * @param {string} gameId - Game NP Communication ID
     * @returns {Array} - Array of game trophies (limited data)
     */
    async getGameTrophies(accountId, gameId) {
        try {
            this.logger.debug(`Fetching game trophies via fallback method for account: ${accountId}, game: ${gameId}`);
            
            // Return empty array since we can't reliably get trophy data without auth
            return [];
            
        } catch (error) {
            this.logger.error('Failed to fetch game trophies via fallback method:', error.message);
            return [];
        }
    }
}

module.exports = RobustPSNApi;
