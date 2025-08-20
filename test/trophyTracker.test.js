const TrophyTracker = require('../src/utils/trophyTracker');
const PublicPSNApi = require('../src/utils/publicPsnApi');

// Mock dependencies
jest.mock('../src/utils/publicPsnApi');
jest.mock('../src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

describe('TrophyTracker Error Handling', () => {
    let trophyTracker;
    let mockDatabase;
    let mockLogger;
    let mockClient;
    let mockPsnApi;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock database
        mockDatabase = {
            getUsersWithNotifications: jest.fn(),
            updateLastTrophyCheck: jest.fn(),
            saveTrophy: jest.fn(),
            get: jest.fn(),
            run: jest.fn()
        };
        
        // Mock logger
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };
        
        // Mock Discord client and channel
        const mockChannel = {
            send: jest.fn().mockResolvedValue({})
        };
        
        mockClient = {
            channels: {
                fetch: jest.fn().mockResolvedValue(mockChannel)
            }
        };
        
        // Mock Public PSN API
        mockPsnApi = {
            getUserTrophySummary: jest.fn(),
            getUserGames: jest.fn(),
            getGameTrophies: jest.fn()
        };
        PublicPSNApi.mockImplementation(() => mockPsnApi);
        
        trophyTracker = new TrophyTracker(mockDatabase, mockLogger, mockClient);
    });

    describe('checkAllUsers', () => {
        test('should handle database error when fetching users', async () => {
            mockDatabase.getUsersWithNotifications.mockRejectedValue(
                new Error('SQLITE_ERROR: database is locked')
            );

            await trophyTracker.checkAllUsers();

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error fetching users for trophy check:',
                expect.any(Error)
            );
        });

        test.skip('should continue processing other users when one user fails', async () => {
            const users = [
                { discord_id: 'user1', psn_username: 'psn1', access_token: 'token1' },
                { discord_id: 'user2', psn_username: 'psn2', access_token: 'token2' }
            ];
            
            mockDatabase.getUsersWithNotifications.mockResolvedValue(users);
            
            // Make first user fail, second succeed
            mockPsnApi.isTokenValid.mockReturnValue(true);
            mockPsnApi.getRecentTrophies
                .mockRejectedValueOnce(new Error('PSN API error'))
                .mockResolvedValueOnce([]);
            
            mockDatabase.updateLastTrophyCheck.mockResolvedValue();

            await trophyTracker.checkAllUsers();

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error checking trophies for user user1:',
                'PSN API error'
            );
            expect(mockDatabase.updateLastTrophyCheck).toHaveBeenCalledWith('user2');
        });
    });

    describe('checkUserTrophies', () => {
        const mockUser = {
            discord_id: 'user123',
            psn_username: 'testuser',
            access_token: 'token123',
            psn_account_id: 'account123',
            last_trophy_check: 1640995200
        };

        test('should handle updateLastTrophyCheck database errors', async () => {
            // Mock successful API calls
            mockPsnApi.getUserTrophySummary.mockResolvedValue({ trophyLevel: 50 });
            mockPsnApi.getUserGames.mockResolvedValue([]);
            
            // Mock database error
            mockDatabase.updateLastTrophyCheck.mockRejectedValue(
                new Error('SQLITE_ERROR: database is busy')
            );

            await trophyTracker.checkUserTrophies(mockUser);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error updating last trophy check for user user123:',
                expect.any(Error)
            );
        });

        test('should handle PSN API errors gracefully', async () => {
            // Mock API error
            mockPsnApi.getUserTrophySummary.mockRejectedValue(
                new Error('PSN API error')
            );

            await trophyTracker.checkUserTrophies(mockUser);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Unable to get trophy summary for user user123: PSN API error'
            );
        });
    });

    describe('processTrophy', () => {
        const mockUser = {
            discord_id: 'user123',
            psn_username: 'testuser'
        };

        const mockTrophy = {
            trophyId: 'trophy123',
            trophyName: 'Test Trophy',
            trophyType: 'bronze',
            earnedDateTime: '2024-01-01T12:00:00Z'
        };

        test('should handle saveTrophy database errors', async () => {
            mockDatabase.saveTrophy.mockRejectedValue(
                new Error('SQLITE_ERROR: disk I/O error')
            );

            await trophyTracker.processTrophy(mockUser, mockTrophy);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error saving trophy for user user123:',
                expect.any(Error)
            );
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error processing trophy:',
                'SQLITE_ERROR: disk I/O error'
            );
        });
    });

    describe('sendTrophyNotifications', () => {
        const mockUser = {
            discord_id: 'user123',
            psn_username: 'testuser'
        };

        const mockTrophies = [
            {
                trophyType: 'gold',
                trophyName: 'Golden Trophy',
                gameTitle: 'Test Game'
            }
        ];

        test('should handle database error when fetching notification settings', async () => {
            mockDatabase.get.mockRejectedValue(
                new Error('SQLITE_ERROR: no such table')
            );

            await trophyTracker.sendTrophyNotifications(mockUser, mockTrophies);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error fetching notification settings for user user123:',
                expect.any(Error)
            );
        });

        test.skip('should handle missing notification channel gracefully', async () => {
            mockDatabase.get.mockResolvedValue({
                channel_id: 'channel123',
                trophy_notifications: 1
            });
            
            mockClient.channels.fetch.mockRejectedValue(
                new Error('Unknown Channel')
            );

            await trophyTracker.sendTrophyNotifications(mockUser, mockTrophies);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Cannot find notification channel channel123'
            );
        });
    });

    describe('getUserTrophyStats', () => {
        test('should handle database errors and return default stats', async () => {
            mockDatabase.get.mockRejectedValue(
                new Error('SQLITE_ERROR: malformed database')
            );

            const result = await trophyTracker.getUserTrophyStats('user123');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error fetching trophy stats for user user123:',
                expect.any(Error)
            );
            
            expect(result).toEqual({
                total_trophies: 0,
                platinum_count: 0,
                gold_count: 0,
                silver_count: 0,
                bronze_count: 0,
                games_played: 0
            });
        });

        test('should return default stats on general errors', async () => {
            mockDatabase.get.mockImplementation(() => {
                throw new Error('Unexpected error');
            });

            const result = await trophyTracker.getUserTrophyStats('user123');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error fetching trophy stats for user user123:',
                expect.any(Error)
            );
            
            expect(result).toEqual({
                total_trophies: 0,
                platinum_count: 0,
                gold_count: 0,
                silver_count: 0,
                bronze_count: 0,
                games_played: 0
            });
        });
    });

    describe('Edge Cases and Robustness', () => {
        test('should handle null/undefined database responses', async () => {
            mockDatabase.getUsersWithNotifications.mockResolvedValue([]);

            await trophyTracker.checkAllUsers();

            expect(mockLogger.info).toHaveBeenCalledWith('Found 0 users to check for trophies');
        });

        test('should handle empty trophy arrays', async () => {
            const mockUser = {
                discord_id: 'user123',
                psn_username: 'testuser',
                psn_account_id: 'account123'
            };

            // Mock successful API calls with no new trophies
            mockPsnApi.getUserTrophySummary.mockResolvedValue({ trophyLevel: 50 });
            mockPsnApi.getUserGames.mockResolvedValue([]);
            mockDatabase.updateLastTrophyCheck.mockResolvedValue();

            await trophyTracker.checkUserTrophies(mockUser);

            expect(mockDatabase.updateLastTrophyCheck).toHaveBeenCalledWith('user123');
        });

        test('should handle malformed trophy data', async () => {
            const mockUser = {
                discord_id: 'user123',
                psn_username: 'testuser'
            };

            const malformedTrophy = {
                // Missing required fields
                trophyId: null,
                trophyName: undefined
            };

            mockDatabase.saveTrophy.mockResolvedValue();

            await trophyTracker.processTrophy(mockUser, malformedTrophy);

            expect(mockDatabase.saveTrophy).toHaveBeenCalledWith(
                expect.objectContaining({
                    trophyName: 'Unknown Trophy',
                    trophyDescription: ''
                })
            );
        });
    });
}); 