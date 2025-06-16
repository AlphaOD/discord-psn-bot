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
    
    const mockDatabase = jest.fn().mockImplementation(() => ({
        run: jest.fn(mockCallback),
        get: jest.fn(mockGet),
        all: jest.fn(mockAll),
        close: jest.fn((callback) => callback && callback()),
        serialize: jest.fn((callback) => callback()),
    }));
    
    return {
        Database: mockDatabase,
        verbose: jest.fn(() => ({
            Database: mockDatabase,
            OPEN_READWRITE: 1,
            OPEN_CREATE: 2,
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
    let database;

    beforeEach(() => {
        // Clear module cache
        delete require.cache[require.resolve('../src/database/database')];
        
        // Get fresh Database instance (singleton)
        database = require('../src/database/database');
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
        test('should save user successfully', async () => {
            const userData = {
                discordId: 'user123',
                psnUsername: 'psn_user',
                psnAccountId: 'psn123',
                accessToken: 'token123',
                refreshToken: 'refresh123'
            };
            
            await expect(database.saveUser(userData)).resolves.not.toThrow();
        });

        test('should get user by Discord ID', async () => {
            const user = await database.getUser('user123');
            expect(user).toBeDefined();
            expect(user.discord_id).toBe('test123');
        });

        test('should get users with notifications', async () => {
            const users = await database.getUsersWithNotifications();
            expect(Array.isArray(users)).toBe(true);
        });

        test('should update last trophy check', async () => {
            await expect(
                database.updateLastTrophyCheck('user123')
            ).resolves.not.toThrow();
        });
    });

    describe('Trophy Management', () => {
        test('should save trophy successfully', async () => {
            const trophyData = {
                discordId: 'user123',
                trophyId: 'trophy_123',
                trophyName: 'Test Trophy',
                trophyDescription: 'Test Description',
                trophyType: 'bronze',
                gameTitle: 'Test Game',
                gameId: 'game123',
                earnedDate: '2024-01-01T00:00:00Z'
            };
            
            await expect(database.saveTrophy(trophyData)).resolves.not.toThrow();
        });

        test('should get recent trophies', async () => {
            const trophies = await database.getRecentTrophies('user123', 10);
            expect(Array.isArray(trophies)).toBe(true);
        });

        test('should get platinum trophies', async () => {
            const platinums = await database.getPlatinumTrophies('user123');
            expect(Array.isArray(platinums)).toBe(true);
        });
    });

    describe('Game Management', () => {
        test('should save game successfully', async () => {
            const gameData = {
                gameId: 'game_123',
                title: 'Test Game',
                platform: 'PS5',
                iconUrl: 'https://example.com/icon.jpg',
                trophyCountBronze: 10,
                trophyCountSilver: 5,
                trophyCountGold: 3,
                trophyCountPlatinum: 1
            };
            
            await expect(database.saveGame(gameData)).resolves.not.toThrow();
        });
    });

    describe('Database Operations', () => {
        test('should close database connection', async () => {
            await expect(database.close()).resolves.not.toThrow();
        });

        test('should handle basic database operations', () => {
            expect(database.db).toBeDefined();
            expect(typeof database.init).toBe('function');
            expect(typeof database.saveUser).toBe('function');
            expect(typeof database.getUser).toBe('function');
            expect(typeof database.saveTrophy).toBe('function');
            expect(typeof database.saveGame).toBe('function');
        });

        test('should have SQL helper methods', () => {
            expect(typeof database.run).toBe('function');
            expect(typeof database.get).toBe('function');
            expect(typeof database.all).toBe('function');
        });
    });
}); 