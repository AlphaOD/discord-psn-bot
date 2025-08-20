const https = require('https');
const logger = require('./logger');

class RealPSNApi {
    constructor() {
        this.clientId = process.env.PSN_CLIENT_ID || '09515159-7237-4370-9b40-3806e67c0891';
        this.clientSecretBase64 = process.env.PSN_CLIENT_SECRET_BASE64 || 'MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=';
        this.redirectUri = process.env.PSN_REDIRECT_URI || 'com.scee.psxandroid.scecompcall://redirect';
        
        logger.info('🔑 RealPSNApi initialized with PlayStation OAuth credentials');
    }

    async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ statusCode: res.statusCode, headers: res.headers, data });
                    } else {
                        reject({ statusCode: res.statusCode, headers: res.headers, data });
                    }
                });
            });
            
            req.on('error', reject);
            if (options.body) req.write(options.body);
            req.end();
        });
    }

    async getAuthCode(npssoToken) {
        logger.debug(`🔑 Getting authorization code for NPSSO token...`);
        
        const authUrl = `https://ca.account.sony.com/api/authz/v3/oauth/authorize?` +
            `client_id=${this.clientId}&` +
            `response_type=code&` +
            `scope=psn:mobile.v2.core%20psn:clientapp&` +
            `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
            `npsso=${npssoToken}`;
        
        try {
            const response = await this.makeRequest(authUrl, {
                method: 'GET',
                headers: {
                    'Cookie': `npsso=${npssoToken}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            logger.debug(`✅ Got response: ${response.statusCode}`);
            return null;
        } catch (error) {
            if (error.statusCode === 302 || error.statusCode === 301) {
                const location = error.headers.location;
                logger.debug(`✅ Got redirect to: ${location}`);
                
                // Extract code from redirect URL
                const codeMatch = location.match(/[?&]code=([^&]+)/);
                if (codeMatch) {
                    const authCode = codeMatch[1];
                    logger.debug(`🎯 Authorization code: ${authCode}`);
                    return authCode;
                } else {
                    logger.warn(`❌ No authorization code found in redirect`);
                    return null;
                }
            } else {
                logger.warn(`❌ Error getting auth code: ${error.statusCode}`);
                return null;
            }
        }
    }

    async getAccessToken(authCode) {
        logger.debug(`🔑 Exchanging auth code for access token...`);
        
        const tokenUrl = 'https://ca.account.sony.com/api/authz/v3/oauth/token';
        const body = new URLSearchParams({
            code: authCode,
            redirect_uri: this.redirectUri,
            grant_type: 'authorization_code',
            token_format: 'jwt'
        }).toString();
        
        try {
            const response = await this.makeRequest(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${this.clientSecretBase64}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: body
            });
            
            logger.debug(`✅ Got access token response: ${response.statusCode}`);
            const tokenData = JSON.parse(response.data);
            
            if (tokenData.access_token) {
                logger.info(`✅ Successfully obtained PlayStation access token`);
                return tokenData.access_token;
            } else {
                logger.error(`❌ No access token in response: ${JSON.stringify(tokenData)}`);
                return null;
            }
        } catch (error) {
            logger.error(`❌ Error getting access token: ${error.statusCode} - ${error.data}`);
            return null;
        }
    }

    async validateUsername(username) {
        logger.info(`🔍 Validating PSN username: "${username}" with real OAuth API`);
        
        try {
            // For now, we'll need an NPSSO token to validate usernames
            // In production, we could implement a token management system
            logger.warn(`⚠️ Username validation requires NPSSO token. Implementing fallback validation...`);
            
            // Try to validate using public endpoints as fallback
            return await this.validateUsernameFallback(username);
            
        } catch (error) {
            logger.error(`💥 Username validation failed: ${error.message}`);
            throw error;
        }
    }

    async validateUsernameFallback(username) {
        logger.debug(`🔄 Using fallback validation for: "${username}"`);
        
        // This is a placeholder - in production, we'd implement proper token management
        // For now, return a mock validation result
        return {
            accountId: null,
            onlineId: username,
            avatarUrl: null,
            isValid: false,
            reason: 'OAuth token required for real validation'
        };
    }

    async getUserProfile(accessToken, username) {
        logger.info(`👤 Getting profile for ${username} with access token...`);
        
        const profileUrl = `https://us-prof.np.community.playstation.net/userProfile/v1/users/${username}/profile2?fields=accountId,onlineId,currentOnlineId`;
        
        try {
            const response = await this.makeRequest(profileUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            logger.debug(`✅ Got profile response: ${response.statusCode}`);
            const profileData = JSON.parse(response.data);
            
            if (profileData.profile?.accountId) {
                logger.info(`✅ Found user profile: ${username} (ID: ${profileData.profile.accountId})`);
                return {
                    accountId: profileData.profile.accountId,
                    onlineId: profileData.profile.onlineId,
                    currentOnlineId: profileData.profile.currentOnlineId,
                    isValid: true
                };
            } else {
                logger.warn(`❌ No profile data found for: ${username}`);
                return { isValid: false, reason: 'Profile not found' };
            }
        } catch (error) {
            logger.error(`❌ Error getting profile: ${error.statusCode} - ${error.data}`);
            return { isValid: false, reason: `API error: ${error.statusCode}` };
        }
    }

    async getUserTrophies(accessToken, accountId) {
        logger.info(`🏆 Getting trophies for account ${accountId}...`);
        
        const trophiesUrl = `https://m.np.playstation.com/api/trophy/v1/users/${accountId}/trophyTitles`;
        
        try {
            const response = await this.makeRequest(trophiesUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            logger.debug(`✅ Got trophies response: ${response.statusCode}`);
            const trophiesData = JSON.parse(response.data);
            
            return {
                isValid: true,
                data: trophiesData,
                totalGames: trophiesData.trophyTitles?.length || 0
            };
        } catch (error) {
            logger.error(`❌ Error getting trophies: ${error.statusCode} - ${error.data}`);
            return { isValid: false, reason: `API error: ${error.statusCode}` };
        }
    }

    // Method to get NPSSO token from user (for manual validation)
    async validateWithNPSSO(npssoToken, username) {
        logger.info(`🔐 Validating ${username} with NPSSO token...`);
        
        try {
            // Step 1: Get authorization code
            const authCode = await this.getAuthCode(npssoToken);
            if (!authCode) {
                throw new Error('Failed to get authorization code from NPSSO token');
            }
            
            // Step 2: Get access token
            const accessToken = await this.getAccessToken(authCode);
            if (!accessToken) {
                throw new Error('Failed to get access token');
            }
            
            // Step 3: Validate username
            const profile = await this.getUserProfile(accessToken, username);
            if (!profile.isValid) {
                throw new Error(`Username validation failed: ${profile.reason}`);
            }
            
            logger.info(`✅ Successfully validated ${username} with real PSN API!`);
            return {
                isValid: true,
                accountId: profile.accountId,
                onlineId: profile.onlineId,
                accessToken: accessToken
            };
            
        } catch (error) {
            logger.error(`❌ NPSSO validation failed: ${error.message}`);
            throw error;
        }
    }
}

module.exports = RealPSNApi;
