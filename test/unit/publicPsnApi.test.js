/**
 * Public PSN API Unit Tests
 * 
 * Tests for the PublicPSNApi class functionality including
 * username validation, trophy data retrieval, and search
 */

const PublicPSNApi = require('../../src/utils/publicPsnApi');
const {
    getUserTitles,
    getTitleTrophies,
    getTitleTrophyGroups,
    getUserTrophyProfileSummary,
    makeUniversalSearch
} = require('psn-api');

// Mock the psn-api functions
jest.mock('psn-api');

describe('PublicPSNApi', () => {
    let psnApi;
    let mockLogger;
    
    beforeEach(() => {
        mockLogger = createMockLogger();
        psnApi = new PublicPSNApi(mockLogger);
        jest.clearAllMocks();
    });
    
    describe('validateUsername', () => {
        it('should return account data for valid username', async () => {
            const mockSearchResults = [
                {
                    accountId: '123456789',
                    onlineId: 'TestPlayer',
                    avatarUrl: 'https://example.com/avatar.png'
                }
            ];
            
            makeUniversalSearch.mockResolvedValue(mockSearchResults);
            
            const result = await psnApi.validateUsername('TestPlayer');
            
            expect(makeUniversalSearch).toHaveBeenCalledWith(
                {},
                'TestPlayer',
                'SocialAllAccounts'
            );
            expect(result).toEqual({
                accountId: '123456789',
                onlineId: 'TestPlayer',
                avatarUrl: 'https://example.com/avatar.png'
            });
            expect(mockLogger.debug).toHaveBeenCalledWith('Validating PSN username: TestPlayer');
        });
        
        it('should find case-insensitive exact match', async () => {
            const mockSearchResults = [
                {
                    accountId: '123456789',
                    onlineId: 'TestPlayer',
                    avatarUrl: 'https://example.com/avatar.png'
                },
                {
                    accountId: '987654321',
                    onlineId: 'TestPlayerABC',
                    avatarUrl: 'https://example.com/avatar2.png'
                }
            ];
            
            makeUniversalSearch.mockResolvedValue(mockSearchResults);
            
            const result = await psnApi.validateUsername('testplayer');
            
            expect(result).toEqual({
                accountId: '123456789',
                onlineId: 'TestPlayer',
                avatarUrl: 'https://example.com/avatar.png'
            });
        });
        
        it('should return null when username not found', async () => {
            makeUniversalSearch.mockResolvedValue([]);
            
            const result = await psnApi.validateUsername('NonExistentPlayer');
            
            expect(result).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith('PSN username not found: NonExistentPlayer');
        });
        
        it('should return null when no exact match found', async () => {
            const mockSearchResults = [
                {
                    accountId: '123456789',
                    onlineId: 'SimilarPlayer',
                    avatarUrl: 'https://example.com/avatar.png'
                }
            ];
            
            makeUniversalSearch.mockResolvedValue(mockSearchResults);
            
            const result = await psnApi.validateUsername('TestPlayer');
            
            expect(result).toBeNull();
        });
        
        it('should handle API errors', async () => {
            const error = new Error('PSN API error');
            makeUniversalSearch.mockRejectedValue(error);
            
            await expect(psnApi.validateUsername('TestPlayer')).rejects.toThrow('Failed to validate PSN username: PSN API error');
            expect(mockLogger.error).toHaveBeenCalledWith('PSN username validation failed:', 'PSN API error');
        });
        
        it('should handle timeout', async () => {
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => resolve([]), 35000); // Longer than timeout
            });
            makeUniversalSearch.mockReturnValue(timeoutPromise);
            
            await expect(psnApi.validateUsername('TestPlayer')).rejects.toThrow('PSN API request timed out after 30000ms');
        });
    });
    
    describe('getUserTrophySummary', () => {
        it('should return formatted trophy summary', async () => {
            const mockSummary = {
                accountId: '123456789',
                trophyLevel: 42,
                progress: 75,
                tier: 'Gold',
                earnedTrophies: {
                    bronze: 100,
                    silver: 50,
                    gold: 25,
                    platinum: 5
                },
                hiddenTrophyCount: 10,
                lastUpdatedDateTime: '2023-12-01T10:00:00Z'
            };
            
            getUserTrophyProfileSummary.mockResolvedValue(mockSummary);
            
            const result = await psnApi.getUserTrophySummary('123456789');
            
            expect(getUserTrophyProfileSummary).toHaveBeenCalledWith({}, '123456789');
            expect(result).toEqual(mockSummary);
            expect(mockLogger.debug).toHaveBeenCalledWith('Fetching trophy summary for account: 123456789');
        });
        
        it('should handle missing trophy data with defaults', async () => {
            const mockSummary = {
                accountId: '123456789',
                trophyLevel: 1
            };
            
            getUserTrophyProfileSummary.mockResolvedValue(mockSummary);
            
            const result = await psnApi.getUserTrophySummary('123456789');
            
            expect(result.earnedTrophies).toEqual({
                bronze: 0,
                silver: 0,
                gold: 0,
                platinum: 0
            });
            expect(result.hiddenTrophyCount).toBe(0);
        });
        
        it('should handle API errors', async () => {
            const error = new Error('Trophy API error');
            getUserTrophyProfileSummary.mockRejectedValue(error);
            
            await expect(psnApi.getUserTrophySummary('123456789')).rejects.toThrow('Failed to fetch trophy summary: Trophy API error');
        });
    });
    
    describe('getUserGames', () => {
        it('should return formatted user games', async () => {
            const mockTitles = {
                trophyTitles: [
                    {
                        npCommunicationId: 'NPWR00001_00',
                        trophyTitleName: 'Test Game 1',
                        trophyTitleDetail: 'A test game',
                        trophyTitleIconUrl: 'https://example.com/icon1.png',
                        trophyTitlePlatform: 'PS5',
                        hasTrophyGroups: false,
                        definedTrophies: { bronze: 10, silver: 5, gold: 2, platinum: 1 },
                        progress: 50,
                        earnedTrophies: { bronze: 5, silver: 2, gold: 1, platinum: 0 },
                        hiddenFlag: false,
                        lastUpdatedDateTime: '2023-12-01T10:00:00Z'
                    }
                ]
            };
            
            getUserTitles.mockResolvedValue(mockTitles);
            
            const result = await psnApi.getUserGames('123456789', 50);
            
            expect(getUserTitles).toHaveBeenCalledWith(
                {},
                '123456789',
                { limit: 50, offset: 0 }
            );
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(expect.objectContaining({
                npCommunicationId: 'NPWR00001_00',
                trophyTitleName: 'Test Game 1',
                progress: 50
            }));
        });
        
        it('should handle API errors', async () => {
            const error = new Error('Games API error');
            getUserTitles.mockRejectedValue(error);
            
            await expect(psnApi.getUserGames('123456789')).rejects.toThrow('Failed to fetch user games: Games API error');
        });
    });
    
    describe('getGameTrophies', () => {
        it('should return formatted game trophies', async () => {
            const mockTrophies = {
                trophyTitleName: 'Test Game',
                trophyTitleDetail: 'A test game',
                trophyTitleIconUrl: 'https://example.com/icon.png',
                trophyTitlePlatform: 'PS5',
                definedTrophies: { bronze: 10, silver: 5, gold: 2, platinum: 1 },
                trophies: [
                    {
                        trophyId: 'trophy001',
                        trophyHidden: false,
                        trophyType: 'Gold',
                        trophyName: 'Test Trophy',
                        trophyDetail: 'A test trophy',
                        trophyIconUrl: 'https://example.com/trophy.png',
                        trophyGroupId: 'default',
                        trophyRare: 3,
                        trophyEarnedRate: '25.5%'
                    }
                ]
            };
            
            getTitleTrophies.mockResolvedValue(mockTrophies);
            
            const result = await psnApi.getGameTrophies('NPWR00001_00');
            
            expect(getTitleTrophies).toHaveBeenCalledWith(
                {},
                'NPWR00001_00',
                'all',
                { npServiceName: 'trophy' }
            );
            expect(result.trophyTitleName).toBe('Test Game');
            expect(result.trophies).toHaveLength(1);
            expect(result.trophies[0]).toEqual(expect.objectContaining({
                trophyId: 'trophy001',
                trophyType: 'Gold',
                trophyName: 'Test Trophy'
            }));
        });
        
        it('should handle missing trophy rarity data', async () => {
            const mockTrophies = {
                trophyTitleName: 'Test Game',
                trophies: [
                    {
                        trophyId: 'trophy001',
                        trophyType: 'Bronze',
                        trophyName: 'Basic Trophy'
                    }
                ]
            };
            
            getTitleTrophies.mockResolvedValue(mockTrophies);
            
            const result = await psnApi.getGameTrophies('NPWR00001_00');
            
            expect(result.trophies[0].trophyRare).toBe(0);
            expect(result.trophies[0].trophyEarnedRate).toBe('0.0%');
        });
    });
    
    describe('searchUsers', () => {
        it('should return formatted search results', async () => {
            const mockResults = [
                {
                    accountId: '123456789',
                    onlineId: 'TestPlayer1',
                    avatarUrl: 'https://example.com/avatar1.png'
                },
                {
                    accountId: '987654321',
                    onlineId: 'TestPlayer2',
                    avatarUrl: null
                }
            ];
            
            makeUniversalSearch.mockResolvedValue(mockResults);
            
            const result = await psnApi.searchUsers('TestPlayer', 5);
            
            expect(makeUniversalSearch).toHaveBeenCalledWith(
                {},
                'TestPlayer',
                'SocialAllAccounts'
            );
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                accountId: '123456789',
                onlineId: 'TestPlayer1',
                avatarUrl: 'https://example.com/avatar1.png'
            });
            expect(result[1].avatarUrl).toBeNull();
        });
        
        it('should limit results to specified limit', async () => {
            const mockResults = Array.from({ length: 20 }, (_, i) => ({
                accountId: `id${i}`,
                onlineId: `Player${i}`,
                avatarUrl: null
            }));
            
            makeUniversalSearch.mockResolvedValue(mockResults);
            
            const result = await psnApi.searchUsers('Player', 5);
            
            expect(result).toHaveLength(5);
        });
        
        it('should return empty array when no results', async () => {
            makeUniversalSearch.mockResolvedValue([]);
            
            const result = await psnApi.searchUsers('NonExistent');
            
            expect(result).toEqual([]);
        });
        
        it('should handle null search results', async () => {
            makeUniversalSearch.mockResolvedValue(null);
            
            const result = await psnApi.searchUsers('TestPlayer');
            
            expect(result).toEqual([]);
        });
    });
    
    describe('usernameExists', () => {
        it('should return true for existing username', async () => {
            const mockSearchResults = [
                {
                    accountId: '123456789',
                    onlineId: 'TestPlayer',
                    avatarUrl: null
                }
            ];
            
            makeUniversalSearch.mockResolvedValue(mockSearchResults);
            
            const result = await psnApi.usernameExists('TestPlayer');
            
            expect(result).toBe(true);
        });
        
        it('should return false for non-existent username', async () => {
            makeUniversalSearch.mockResolvedValue([]);
            
            const result = await psnApi.usernameExists('NonExistent');
            
            expect(result).toBe(false);
        });
        
        it('should return false on API error', async () => {
            makeUniversalSearch.mockRejectedValue(new Error('API error'));
            
            const result = await psnApi.usernameExists('TestPlayer');
            
            expect(result).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });
    
    describe('getDetailedTrophyStats', () => {
        it('should combine summary and games data', async () => {
            const mockSummary = {
                accountId: '123456789',
                trophyLevel: 42,
                earnedTrophies: { platinum: 5, gold: 25, silver: 50, bronze: 100 }
            };
            
            const mockGames = [
                { progress: 100, earnedTrophies: { platinum: 1 } },
                { progress: 50, earnedTrophies: { platinum: 0 } },
                { progress: 75, earnedTrophies: { platinum: 1 } }
            ];
            
            getUserTrophyProfileSummary.mockResolvedValue(mockSummary);
            getUserTitles.mockResolvedValue({ trophyTitles: mockGames });
            
            const result = await psnApi.getDetailedTrophyStats('123456789');
            
            expect(result.trophyLevel).toBe(42);
            expect(result.gameStats).toEqual({
                totalGames: 3,
                completedGames: 1,
                gamesWithPlatinum: 2,
                averageCompletion: 75,
                recentGames: mockGames.slice(0, 5)
            });
        });
        
        it('should handle empty games list', async () => {
            const mockSummary = {
                accountId: '123456789',
                trophyLevel: 1,
                earnedTrophies: { platinum: 0, gold: 0, silver: 0, bronze: 0 }
            };
            
            getUserTrophyProfileSummary.mockResolvedValue(mockSummary);
            getUserTitles.mockResolvedValue({ trophyTitles: [] });
            
            const result = await psnApi.getDetailedTrophyStats('123456789');
            
            expect(result.gameStats.averageCompletion).toBe(0);
            expect(result.gameStats.totalGames).toBe(0);
        });
    });
    
    describe('withTimeout', () => {
        it('should resolve when promise completes within timeout', async () => {
            const quickPromise = Promise.resolve('success');
            
            const result = await psnApi.withTimeout(quickPromise, 1000);
            
            expect(result).toBe('success');
        });
        
        it('should reject when promise exceeds timeout', async () => {
            const slowPromise = new Promise((resolve) => {
                setTimeout(() => resolve('too late'), 2000);
            });
            
            await expect(psnApi.withTimeout(slowPromise, 100)).rejects.toThrow('PSN API request timed out after 100ms');
        });
    });
});
