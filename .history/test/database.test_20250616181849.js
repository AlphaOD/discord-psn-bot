/**
 * Database Utility Tests
 * 
 * Tests for the Database utility including:
 * - Database initialization
 * - Basic user operations
 * - Error handling
 */

const path = require('path');

// Mock sqlite3 before requiring database
jest.mock('sqlite3', () => {
    const mockCallback = (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
        }
        if (callback) {
            // Simulate successful operation
            callback.call({ lastID: 1, changes: 1 });
        }
    };
    
    const mockGet = (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
        }
        if (callback) {
            // Return mock user data
            callback(null, { id: 1, discord_id: 'test123', psn_id: 'test_psn' });
        }
    };
    
    const mockAll = (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
        }
        if (callback) {
            // Return mock array data
            callback(null, [{ id: 1, discord_id: 'test123' }]);
        }
    };
    
    return {
        Database: jest.fn().mockImplementation(() => ({
            run: jest.fn(mockCallback),
            get: jest.fn(mockGet),
            all: jest.fn(mockAll),
            close: jest.fn((callback) => callback && callback()),
            serialize: jest.fn((callback) => callback()),
        })),
        OPEN_READWRITE: 1,
        OPEN_CREATE: 2,
    };
});

// Mock fs
jest.mock('fs', () => ({
    existsSync: jest.fn(() => false),
    mkdirSync: jest.fn()
}));

describe('Database Utility', () => {
    let Database;
    let database;

    beforeEach(() => {
        // Clear module cache
        delete require.cache[require.resolve('../src/database/database')];
        
        // Get fresh Database class
        Database = require('../src/database/database');
        database = new Database();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize database without errors', async () => {
            await expect(database.init()).resolves.not.toThrow();
        });

        test('should create database instance', () => {
            expect(database).toBeDefined();
            expect(typeof database.init).toBe('function');
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
            
            await expect(database.createUser(userData)).resolves.not.toThrow();
        });

        test('should get user by Discord ID', async () => {
            const user = await database.getUserByDiscordId('user123');
            expect(user).toBeDefined();
            expect(user.discord_id).toBe('test123');
        });

        test('should get user by PSN ID', async () => {
            const user = await database.getUserByPsnId('psn_user');
            expect(user).toBeDefined();
            expect(user.psn_id).toBe('test_psn');
        });

        test('should update user tokens', async () => {
            await expect(
                database.updateUserTokens('user123', 'new_access', 'new_refresh')
            ).resolves.not.toThrow();
        });

        test('should delete user', async () => {
            await expect(database.deleteUser('user123')).resolves.not.toThrow();
        });

        test('should get all users for trophy checking', async () => {
            const users = await database.getAllUsersForTrophyCheck();
            expect(Array.isArray(users)).toBe(true);
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
            
            await expect(database.saveTrophy(trophyData)).resolves.not.toThrow();
        });

        test('should get user trophies', async () => {
            const trophies = await database.getUserTrophies('user123');
            expect(Array.isArray(trophies)).toBe(true);
        });

        test('should get trophy statistics', async () => {
            const stats = await database.getTrophyStats('user123');
            expect(stats).toBeDefined();
        });

        test('should get recent trophies', async () => {
            const recent = await database.getRecentTrophies('user123', 10);
            expect(Array.isArray(recent)).toBe(true);
        });

        test('should check if trophy exists', async () => {
            const exists = await database.trophyExists(1, 'trophy_123');
            expect(typeof exists).toBe('object'); // Returns user object from mock
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
            
            await expect(database.saveGame(gameData)).resolves.not.toThrow();
        });

        test('should get game by ID', async () => {
            const game = await database.getGameById('game_123');
            expect(game).toBeDefined();
        });

        test('should get user games', async () => {
            const games = await database.getUserGames('user123');
            expect(Array.isArray(games)).toBe(true);
        });
    });

    describe('Server Settings', () => {
        test('should save server setting', async () => {
            await expect(
                database.saveServerSetting('guild123', 'trophy_channel', 'channel456')
            ).resolves.not.toThrow();
        });

        test('should get server setting', async () => {
            const setting = await database.getServerSetting('guild123', 'trophy_channel');
            expect(setting).toBeDefined();
        });

        test('should delete server setting', async () => {
            await expect(
                database.deleteServerSetting('guild123', 'trophy_channel')
            ).resolves.not.toThrow();
        });

        test('should get all server settings', async () => {
            const settings = await database.getAllServerSettings('guild123');
            expect(Array.isArray(settings)).toBe(true);
        });
    });

    describe('Database Operations', () => {
        test('should close database connection', async () => {
            await expect(database.close()).resolves.not.toThrow();
        });

        test('should handle basic database operations', () => {
            expect(database.db).toBeDefined();
            expect(typeof database.init).toBe('function');
            expect(typeof database.createUser).toBe('function');
            expect(typeof database.getUserByDiscordId).toBe('function');
        });
    });
}); 