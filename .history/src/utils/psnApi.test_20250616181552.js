/**
 * PSN API Utility Tests
 * 
 * Comprehensive tests for the PSN API utility including:
 * - Authentication
 * - Trophy fetching
 * - Profile data
 * - Error handling
 * - Rate limiting
 * - Token management
 */

const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock psn-api
jest.mock('psn-api', () => ({
    exchangeCodeForAccessToken: jest.fn(),
    refreshTokens: jest.fn(),
    makeUniversalSearch: jest.fn(),
    getUserTrophies: jest.fn(),
    getBasicPresence: jest.fn(),
}));

describe('PSN API Utility', () => {
    let psnApi;
    let mockLogger;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock logger
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            logApiCall: jest.fn(),
        };
        
        // Fresh require to get a new instance
        delete require.cache[require.resolve('./psnApi')];
        const PSNApi = require('./psnApi');
        psnApi = new PSNApi(mockLogger);
    });

    describe('Authentication', () => {
        test('should exchange code for access token successfully', async () => {
            const mockTokens = {
                accessToken: 'test_access_token',
                refreshToken: 'test_refresh_token',
                expiresIn: 3600
            };
            
            const psnApiLib = require('psn-api');
            psnApiLib.exchangeCodeForAccessToken.mockResolvedValue(mockTokens);
            
            const result = await psnApi.exchangeCodeForAccessToken('test_code');
            
            expect(result).toEqual(mockTokens);
            expect(psnApiLib.exchangeCodeForAccessToken).toHaveBeenCalledWith('test_code');
            expect(mockLogger.info).toHaveBeenCalledWith('Successfully exchanged code for access token');
        });

        test('should handle authentication errors', async () => {
            const error = new Error('Invalid code');
            const psnApiLib = require('psn-api');
            psnApiLib.exchangeCodeForAccessToken.mockRejectedValue(error);
            
            await expect(psnApi.exchangeCodeForAccessToken('invalid_code')).rejects.toThrow('Invalid code');
            expect(mockLogger.error).toHaveBeenCalledWith('Error exchanging code for access token:', error);
        });

        test('should refresh tokens successfully', async () => {
            const mockNewTokens = {
                accessToken: 'new_access_token',
                refreshToken: 'new_refresh_token',
                expiresIn: 3600
            };
            
            const psnApiLib = require('psn-api');
            psnApiLib.refreshTokens.mockResolvedValue(mockNewTokens);
            
            const result = await psnApi.refreshTokens('refresh_token');
            
            expect(result).toEqual(mockNewTokens);
            expect(psnApiLib.refreshTokens).toHaveBeenCalledWith('refresh_token');
            expect(mockLogger.info).toHaveBeenCalledWith('Successfully refreshed tokens');
        });

        test('should handle token refresh errors', async () => {
            const error = new Error('Invalid refresh token');
            const psnApiLib = require('psn-api');
            psnApiLib.refreshTokens.mockRejectedValue(error);
            
            await expect(psnApi.refreshTokens('invalid_refresh')).rejects.toThrow('Invalid refresh token');
            expect(mockLogger.error).toHaveBeenCalledWith('Error refreshing tokens:', error);
        });
    });

    describe('User Search', () => {
        test('should search users successfully', async () => {
            const mockSearchResults = {
                domainResponses: [{
                    results: [{
                        socialMetadata: {
                            accountId: 'user123',
                            onlineId: 'testuser',
                            isPsPlus: true
                        }
                    }]
                }]
            };
            
            const psnApiLib = require('psn-api');
            psnApiLib.makeUniversalSearch.mockResolvedValue(mockSearchResults);
            
            const result = await psnApi.searchUser('testuser', 'access_token');
            
            expect(result).toEqual(mockSearchResults);
            expect(psnApiLib.makeUniversalSearch).toHaveBeenCalledWith(
                'access_token',
                'testuser',
                'SocialAllAccounts'
            );
            expect(mockLogger.debug).toHaveBeenCalledWith('Searching for user:', 'testuser');
        });

        test('should handle user search errors', async () => {
            const error = new Error('User not found');
            const psnApiLib = require('psn-api');
            psnApiLib.makeUniversalSearch.mockRejectedValue(error);
            
            await expect(psnApi.searchUser('nonexistent', 'token')).rejects.toThrow('User not found');
            expect(mockLogger.error).toHaveBeenCalledWith('Error searching for user:', error);
        });
    });

    describe('Trophy Management', () => {
        test('should get user trophies successfully', async () => {
            const mockTrophies = {
                trophyTitles: [{
                    npCommunicationId: 'game123',
                    trophyTitleName: 'Test Game',
                    definedTrophies: {
                        bronze: 10,
                        silver: 5,
                        gold: 3,
                        platinum: 1
                    },
                    earnedTrophies: {
                        bronze: 8,
                        silver: 3,
                        gold: 1,
                        platinum: 0
                    }
                }]
            };
            
            const psnApiLib = require('psn-api');
            psnApiLib.getUserTrophies.mockResolvedValue(mockTrophies);
            
            const result = await psnApi.getUserTrophies('access_token', 'user123');
            
            expect(result).toEqual(mockTrophies);
            expect(psnApiLib.getUserTrophies).toHaveBeenCalledWith('access_token', 'user123');
            expect(mockLogger.debug).toHaveBeenCalledWith('Fetching trophies for user:', 'user123');
        });

        test('should handle trophy fetch errors', async () => {
            const error = new Error('Trophy data unavailable');
            const psnApiLib = require('psn-api');
            psnApiLib.getUserTrophies.mockRejectedValue(error);
            
            await expect(psnApi.getUserTrophies('token', 'user123')).rejects.toThrow('Trophy data unavailable');
            expect(mockLogger.error).toHaveBeenCalledWith('Error fetching user trophies:', error);
        });

        test('should get game trophies successfully', async () => {
            const mockGameTrophies = {
                trophies: [{
                    trophyId: 1,
                    trophyName: 'First Trophy',
                    trophyDetail: 'Complete the tutorial',
                    trophyType: 'bronze',
                    earned: true,
                    earnedDateTime: '2024-01-01T00:00:00Z'
                }]
            };
            
            mockedAxios.get.mockResolvedValue({ data: mockGameTrophies });
            
            const result = await psnApi.getGameTrophies('access_token', 'user123', 'game123');
            
            expect(result).toEqual(mockGameTrophies);
            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('/trophies'),
                expect.objectContaining({
                    headers: {
                        'Authorization': 'Bearer access_token'
                    }
                })
            );
        });
    });

    describe('User Profile', () => {
        test('should get user profile successfully', async () => {
            const mockProfile = {
                profile: {
                    onlineId: 'testuser',
                    accountId: 'user123',
                    npId: 'testuser',
                    avatarUrls: [{
                    size: 'xl',
                    avatarUrl: 'https://example.com/avatar.jpg'
                    }],
                    plus: 1,
                    aboutMe: 'Test user profile',
                    languagesUsed: ['en'],
                    trophySummary: {
                        level: 150,
                        progress: 45,
                        earnedTrophies: {
                            bronze: 500,
                            silver: 300,
                            gold: 150,
                            platinum: 25
                        }
                    }
                }
            };
            
            const psnApiLib = require('psn-api');
            psnApiLib.getBasicPresence.mockResolvedValue(mockProfile);
            
            const result = await psnApi.getUserProfile('access_token', 'user123');
            
            expect(result).toEqual(mockProfile);
            expect(psnApiLib.getBasicPresence).toHaveBeenCalledWith('access_token', 'user123');
            expect(mockLogger.debug).toHaveBeenCalledWith('Fetching profile for user:', 'user123');
        });

        test('should handle profile fetch errors', async () => {
            const error = new Error('Profile not found');
            const psnApiLib = require('psn-api');
            psnApiLib.getBasicPresence.mockRejectedValue(error);
            
            await expect(psnApi.getUserProfile('token', 'user123')).rejects.toThrow('Profile not found');
            expect(mockLogger.error).toHaveBeenCalledWith('Error fetching user profile:', error);
        });
    });

    describe('Rate Limiting', () => {
        test('should respect rate limits', async () => {
            const mockTrophies = { trophyTitles: [] };
            const psnApiLib = require('psn-api');
            psnApiLib.getUserTrophies.mockResolvedValue(mockTrophies);
            
            // Make multiple requests
            const promises = [
                psnApi.getUserTrophies('token', 'user1'),
                psnApi.getUserTrophies('token', 'user2'),
                psnApi.getUserTrophies('token', 'user3')
            ];
            
            await Promise.all(promises);
            
            // Should have been called 3 times but with delays
            expect(psnApiLib.getUserTrophies).toHaveBeenCalledTimes(3);
        });

        test('should handle rate limit errors', async () => {
            const rateLimitError = new Error('Rate limit exceeded');
            rateLimitError.response = { status: 429 };
            
            mockedAxios.get.mockRejectedValue(rateLimitError);
            
            await expect(psnApi.makeRequest('GET', '/test', 'token')).rejects.toThrow('Rate limit exceeded');
            expect(mockLogger.warn).toHaveBeenCalledWith('Rate limit exceeded, waiting before retry...');
        });
    });

    describe('Error Handling', () => {
        test('should handle network errors', async () => {
            const networkError = new Error('Network unavailable');
            networkError.code = 'ENOTFOUND';
            
            mockedAxios.get.mockRejectedValue(networkError);
            
            await expect(psnApi.makeRequest('GET', '/test', 'token')).rejects.toThrow('Network unavailable');
            expect(mockLogger.error).toHaveBeenCalledWith('Network error in PSN API request:', networkError);
        });

        test('should handle authentication errors', async () => {
            const authError = new Error('Unauthorized');
            authError.response = { status: 401 };
            
            mockedAxios.get.mockRejectedValue(authError);
            
            await expect(psnApi.makeRequest('GET', '/test', 'invalid_token')).rejects.toThrow('Unauthorized');
            expect(mockLogger.error).toHaveBeenCalledWith('Authentication failed:', authError);
        });

        test('should handle API errors with retry logic', async () => {
            const serverError = new Error('Internal Server Error');
            serverError.response = { status: 500 };
            
            mockedAxios.get
                .mockRejectedValueOnce(serverError)
                .mockResolvedValueOnce({ data: { success: true } });
            
            const result = await psnApi.makeRequestWithRetry('GET', '/test', 'token');
            
            expect(result).toEqual({ success: true });
            expect(mockedAxios.get).toHaveBeenCalledTimes(2);
            expect(mockLogger.warn).toHaveBeenCalledWith('API request failed, retrying...', serverError);
        });
    });

    describe('Request Helpers', () => {
        test('should make GET requests successfully', async () => {
            const mockData = { data: 'test' };
            mockedAxios.get.mockResolvedValue({ data: mockData });
            
            const result = await psnApi.makeRequest('GET', '/test', 'token');
            
            expect(result).toEqual(mockData);
            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('/test'),
                expect.objectContaining({
                    headers: {
                        'Authorization': 'Bearer token'
                    }
                })
            );
        });

        test('should make POST requests successfully', async () => {
            const mockData = { success: true };
            const postData = { key: 'value' };
            
            mockedAxios.post.mockResolvedValue({ data: mockData });
            
            const result = await psnApi.makeRequest('POST', '/test', 'token', postData);
            
            expect(result).toEqual(mockData);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/test'),
                postData,
                expect.objectContaining({
                    headers: {
                        'Authorization': 'Bearer token'
                    }
                })
            );
        });

        test('should include proper headers', async () => {
            mockedAxios.get.mockResolvedValue({ data: {} });
            
            await psnApi.makeRequest('GET', '/test', 'token');
            
            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer token',
                        'Content-Type': 'application/json',
                        'User-Agent': expect.stringContaining('Discord-PSN-Bot')
                    })
                })
            );
        });
    });

    describe('Token Validation', () => {
        test('should validate tokens before making requests', async () => {
            await expect(psnApi.makeRequest('GET', '/test', '')).rejects.toThrow('Access token is required');
            expect(mockLogger.error).toHaveBeenCalledWith('Access token is required for PSN API requests');
        });

        test('should handle expired tokens', async () => {
            const expiredError = new Error('Token expired');
            expiredError.response = { status: 401, data: { error: 'invalid_token' } };
            
            mockedAxios.get.mockRejectedValue(expiredError);
            
            await expect(psnApi.makeRequest('GET', '/test', 'expired_token')).rejects.toThrow('Token expired');
            expect(mockLogger.warn).toHaveBeenCalledWith('Access token appears to be expired or invalid');
        });
    });

    describe('Data Processing', () => {
        test('should process trophy data correctly', async () => {
            const rawTrophyData = {
                trophyTitles: [{
                    npCommunicationId: 'NPWR12345_00',
                    trophyTitleName: 'Test Game',
                    trophyTitleDetail: 'A test game',
                    trophyTitleIconUrl: 'https://example.com/icon.jpg',
                    trophyTitlePlatform: 'PS5',
                    hasTrophyGroups: false,
                    definedTrophies: {
                        bronze: 10,
                        silver: 5,
                        gold: 3,
                        platinum: 1
                    },
                    earnedTrophies: {
                        bronze: 8,
                        silver: 3,
                        gold: 1,
                        platinum: 0
                    },
                    hiddenFlag: false,
                    progress: 63,
                    lastUpdatedDateTime: '2024-01-01T12:00:00Z'
                }]
            };
            
            const processedData = psnApi.processTrophyData(rawTrophyData);
            
            expect(processedData).toEqual({
                totalGames: 1,
                totalTrophies: {
                    bronze: 8,
                    silver: 3,
                    gold: 1,
                    platinum: 0,
                    total: 12
                },
                games: expect.arrayContaining([
                    expect.objectContaining({
                        id: 'NPWR12345_00',
                        name: 'Test Game',
                        platform: 'PS5',
                        progress: 63
                    })
                ])
            });
        });

        test('should handle empty trophy data', async () => {
            const emptyData = { trophyTitles: [] };
            
            const processedData = psnApi.processTrophyData(emptyData);
            
            expect(processedData).toEqual({
                totalGames: 0,
                totalTrophies: {
                    bronze: 0,
                    silver: 0,
                    gold: 0,
                    platinum: 0,
                    total: 0
                },
                games: []
            });
        });
    });
}); 