/**
 * Database Utility Tests
 * 
 * Comprehensive tests for the Database utility including:
 * - Database initialization
 * - User management
 * - Trophy tracking
 * - Game management
 * - Server settings
 * - Error handling
 */

const Database = require('./database');
const fs = require('fs');
const path = require('path');

// Mock sqlite3 to avoid actual database operations
jest.mock('sqlite3', () => {
    const mockRun = jest.fn((sql, params, callback) => {
        if (callback) callback.call({ lastID: 1, changes: 1 });
    });
    
    const mockGet = jest.fn((sql, params, callback) => {
        if (callback) callback(null, { id: 1, discord_id: 'test123' });
    });
    
    const mockAll = jest.fn((sql, params, callback) => {
        if (callback) callback(null, [{ id: 1, discord_id: 'test123' }]);
    });
    
    const mockClose = jest.fn((callback) => {
        if (callback) callback();
    });
    
    return {
        Database: jest.fn().mockImplementation(() => ({
            run: mockRun,
            get: mockGet,
            all: mockAll,
            close: mockClose,
            serialize: jest.fn((callback) => callback()),
        })),
        OPEN_READWRITE: 1,
        OPEN_CREATE: 2,
    };
});

// Mock fs
jest.mock('fs');

describe('Database Utility', () => {
    let database;
    let mockDb;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock fs functions
        fs.existsSync = jest.fn().mockReturnValue(false);
        fs.mkdirSync = jest.fn();
        
        database = new Database();
        mockDb = database.db;
    });

    describe('Initialization', () => {
        test('should initialize database successfully', async () => {
            await database.init();
            
            expect(fs.mkdirSync).toHaveBeenCalledWith(
                expect.stringContaining('data'),
                { recursive: true }
            );
        });

        test('should create required tables', async () => {
            await database.init();
            
            // Check that run was called for each table creation
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('CREATE TABLE IF NOT EXISTS users'),
                expect.any(Function)
            );
            
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('CREATE TABLE IF NOT EXISTS trophies'),
                expect.any(Function)
            );
        });

        test('should handle initialization errors', async () => {
            mockDb.serialize.mockImplementation((callback) => {
                throw new Error('Database error');
            });
            
            await expect(database.init()).rejects.toThrow('Database error');
        });
    });

    describe('User Management', () => {
        test('should create user successfully', async () => {
            const userData = {
                discordId: 'user123',
                psnId: 'psn_user',
                accessToken: 'token123',
                refreshToken: 'refresh123'
            };
            
            await database.createUser(userData);
            
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO users'),
                expect.arrayContaining([userData.discordId, userData.psnId]),
                expect.any(Function)
            );
        });

        test('should get user by Discord ID', async () => {
            const user = await database.getUserByDiscordId('user123');
            
            expect(mockDb.get).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM users WHERE discord_id = ?'),
                ['user123'],
                expect.any(Function)
            );
            
            expect(user).toEqual({ id: 1, discord_id: 'test123' });
        });

        test('should get user by PSN ID', async () => {
            const user = await database.getUserByPsnId('psn_user');
            
            expect(mockDb.get).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM users WHERE psn_id = ?'),
                ['psn_user'],
                expect.any(Function)
            );
        });

        test('should update user tokens', async () => {
            await database.updateUserTokens('user123', 'new_access', 'new_refresh');
            
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users SET access_token = ?, refresh_token = ?, updated_at = CURRENT_TIMESTAMP'),
                ['new_access', 'new_refresh', 'user123'],
                expect.any(Function)
            );
        });

        test('should delete user', async () => {
            await database.deleteUser('user123');
            
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM users WHERE discord_id = ?'),
                ['user123'],
                expect.any(Function)
            );
        });

        test('should get all users for trophy checking', async () => {
            const users = await database.getAllUsersForTrophyCheck();
            
            expect(mockDb.all).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM users WHERE access_token IS NOT NULL'),
                expect.any(Function)
            );
        });
    });

    describe('Trophy Management', () => {
        test('should save trophy successfully', async () => {
            const trophyData = {
                userId: 1,
                gameId: 1,
                trophyId: 'trophy_123',
                name: 'Test Trophy',
                description: 'Test Description',
                type: 'bronze',
                earnedAt: '2024-01-01T00:00:00Z'
            };
            
            await database.saveTrophy(trophyData);
            
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT OR REPLACE INTO trophies'),
                expect.arrayContaining([
                    trophyData.userId,
                    trophyData.gameId,
                    trophyData.trophyId
                ]),
                expect.any(Function)
            );
        });

        test('should get user trophies', async () => {
            const trophies = await database.getUserTrophies('user123');
            
            expect(mockDb.all).toHaveBeenCalledWith(
                expect.stringContaining('SELECT t.*, g.name as game_name FROM trophies t'),
                ['user123'],
                expect.any(Function)
            );
        });

        test('should get trophy statistics', async () => {
            const stats = await database.getTrophyStats('user123');
            
            expect(mockDb.get).toHaveBeenCalledWith(
                expect.stringContaining('SELECT COUNT(*) as total'),
                ['user123'],
                expect.any(Function)
            );
        });

        test('should get recent trophies', async () => {
            const recent = await database.getRecentTrophies('user123', 10);
            
            expect(mockDb.all).toHaveBeenCalledWith(
                expect.stringContaining('ORDER BY t.earned_at DESC LIMIT ?'),
                ['user123', 10],
                expect.any(Function)
            );
        });

        test('should check if trophy exists', async () => {
            const exists = await database.trophyExists(1, 'trophy_123');
            
            expect(mockDb.get).toHaveBeenCalledWith(
                expect.stringContaining('SELECT 1 FROM trophies WHERE user_id = ? AND trophy_id = ?'),
                [1, 'trophy_123'],
                expect.any(Function)
            );
        });
    });

    describe('Game Management', () => {
        test('should save game successfully', async () => {
            const gameData = {
                gameId: 'game_123',
                name: 'Test Game',
                platform: 'PS5',
                imageUrl: 'https://example.com/image.jpg'
            };
            
            await database.saveGame(gameData);
            
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT OR REPLACE INTO games'),
                expect.arrayContaining([
                    gameData.gameId,
                    gameData.name,
                    gameData.platform
                ]),
                expect.any(Function)
            );
        });

        test('should get game by ID', async () => {
            const game = await database.getGameById('game_123');
            
            expect(mockDb.get).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM games WHERE game_id = ?'),
                ['game_123'],
                expect.any(Function)
            );
        });

        test('should get user games', async () => {
            const games = await database.getUserGames('user123');
            
            expect(mockDb.all).toHaveBeenCalledWith(
                expect.stringContaining('SELECT DISTINCT g.* FROM games g'),
                ['user123'],
                expect.any(Function)
            );
        });
    });

    describe('Server Settings', () => {
        test('should save server setting', async () => {
            await database.saveServerSetting('guild123', 'trophy_channel', 'channel456');
            
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT OR REPLACE INTO server_settings'),
                ['guild123', 'trophy_channel', 'channel456'],
                expect.any(Function)
            );
        });

        test('should get server setting', async () => {
            const setting = await database.getServerSetting('guild123', 'trophy_channel');
            
            expect(mockDb.get).toHaveBeenCalledWith(
                expect.stringContaining('SELECT value FROM server_settings'),
                ['guild123', 'trophy_channel'],
                expect.any(Function)
            );
        });

        test('should delete server setting', async () => {
            await database.deleteServerSetting('guild123', 'trophy_channel');
            
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM server_settings'),
                ['guild123', 'trophy_channel'],
                expect.any(Function)
            );
        });

        test('should get all server settings', async () => {
            const settings = await database.getAllServerSettings('guild123');
            
            expect(mockDb.all).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM server_settings WHERE guild_id = ?'),
                ['guild123'],
                expect.any(Function)
            );
        });
    });

    describe('Error Handling', () => {
        test('should handle database errors gracefully', async () => {
            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(new Error('Database error'));
            });
            
            await expect(database.getUserByDiscordId('user123')).rejects.toThrow('Database error');
        });

        test('should handle missing callbacks', async () => {
            mockDb.run.mockImplementation((sql, params) => {
                // No callback provided
            });
            
            // Should not throw
            await expect(database.createUser({
                discordId: 'user123',
                psnId: 'psn_user',
                accessToken: 'token',
                refreshToken: 'refresh'
            })).resolves.not.toThrow();
        });
    });

    describe('Database Cleanup', () => {
        test('should close database connection', async () => {
            await database.close();
            
            expect(mockDb.close).toHaveBeenCalled();
        });

        test('should handle close errors', async () => {
            mockDb.close.mockImplementation((callback) => {
                callback(new Error('Close error'));
            });
            
            await expect(database.close()).rejects.toThrow('Close error');
        });
    });

    describe('Advanced Queries', () => {
        test('should handle complex trophy statistics', async () => {
            // Mock complex return data
            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, {
                    total: 100,
                    bronze: 50,
                    silver: 30,
                    gold: 15,
                    platinum: 5
                });
            });
            
            const stats = await database.getTrophyStats('user123');
            
            expect(stats).toEqual({
                total: 100,
                bronze: 50,
                silver: 30,
                gold: 15,
                platinum: 5
            });
        });

        test('should handle empty results', async () => {
            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, null);
            });
            
            const user = await database.getUserByDiscordId('nonexistent');
            expect(user).toBeNull();
        });

        test('should handle array results', async () => {
            const mockTrophies = [
                { id: 1, name: 'Trophy 1' },
                { id: 2, name: 'Trophy 2' }
            ];
            
            mockDb.all.mockImplementation((sql, params, callback) => {
                callback(null, mockTrophies);
            });
            
            const trophies = await database.getUserTrophies('user123');
            expect(trophies).toEqual(mockTrophies);
        });
    });
}); 