/**
 * Database Utility Tests
 * 
 * Tests for the Database utility including:
 * - Database initialization
 * - Basic user operations
 * - Error handling
 */

const path = require('path');
const Database = require('../src/database/database');
const Logger = require('../src/utils/logger');

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

// Mock the logger
jest.mock('../src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
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
            
            await expect(database.createUser('discord123', userData)).resolves.not.toThrow();
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
            expect(typeof database.createUser).toBe('function');
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

describe('Database Error Handling', () => {
    let database;
    let mockSqlite3;
    let mockDb;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Mock sqlite3
        mockDb = {
            close: jest.fn((callback) => callback()),
            run: jest.fn(),
            get: jest.fn(),
            all: jest.fn(),
            exec: jest.fn()
        };
        
        mockSqlite3 = {
            Database: jest.fn(() => mockDb)
        };
        
        // Mock require for sqlite3
        jest.doMock('sqlite3', () => mockSqlite3);
        
        // Fresh database instance
        delete require.cache[require.resolve('../src/database/database')];
        database = require('../src/database/database');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Database Initialization', () => {
        test('should handle database initialization errors', async () => {
            mockSqlite3.Database.mockImplementation((path, callback) => {
                callback(new Error('Database initialization failed'));
            });

            await expect(database.init()).rejects.toThrow('Database initialization failed');
            expect(Logger.error).toHaveBeenCalledWith(
                'Database initialization failed:',
                expect.any(Error)
            );
        });

        test('should handle table creation errors', async () => {
            mockSqlite3.Database.mockImplementation((path, callback) => {
                callback(null);
                return mockDb;
            });
            
            mockDb.exec.mockImplementation((sql, callback) => {
                callback(new Error('Table creation failed'));
            });

            await expect(database.init()).rejects.toThrow('Failed to create database tables');
        });
    });

    describe('User Operations', () => {
        beforeEach(async () => {
            mockSqlite3.Database.mockImplementation((path, callback) => {
                callback(null);
                return mockDb;
            });
            
            mockDb.exec.mockImplementation((sql, callback) => {
                callback(null);
            });
            
            await database.init();
        });

        test('getUser should handle database errors gracefully', async () => {
            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(new Error('SQLITE_ERROR: database is locked'));
            });

            await expect(database.getUser('user123')).rejects.toThrow('SQLITE_ERROR: database is locked');
        });

        test('createUser should handle database errors gracefully', async () => {
            mockDb.run.mockImplementation((sql, params, callback) => {
                callback(new Error('SQLITE_ERROR: constraint failed'));
            });

            const userData = {
                discordId: 'user123',
                psnUsername: 'testuser',
                psnAccountId: 'account123'
            };

            await expect(database.createUser('discord123', userData)).rejects.toThrow('SQLITE_ERROR: constraint failed');
        });

        test('getUsersWithNotifications should handle database errors', async () => {
            mockDb.all.mockImplementation((sql, callback) => {
                callback(new Error('SQLITE_ERROR: no such table'));
            });

            await expect(database.getUsersWithNotifications()).rejects.toThrow('SQLITE_ERROR: no such table');
        });

        test('updateLastTrophyCheck should handle database errors', async () => {
            mockDb.run.mockImplementation((sql, params, callback) => {
                callback(new Error('SQLITE_ERROR: database is busy'));
            });

            await expect(database.updateLastTrophyCheck('user123')).rejects.toThrow('SQLITE_ERROR: database is busy');
        });
    });

    describe('Trophy Operations', () => {
        beforeEach(async () => {
            mockSqlite3.Database.mockImplementation((path, callback) => {
                callback(null);
                return mockDb;
            });
            
            mockDb.exec.mockImplementation((sql, callback) => {
                callback(null);
            });
            
            await database.init();
        });

        test('saveTrophy should handle database errors', async () => {
            mockDb.run.mockImplementation((sql, params, callback) => {
                callback(new Error('SQLITE_ERROR: disk I/O error'));
            });

            const trophyData = {
                discordId: 'user123',
                trophyId: 'trophy123',
                trophyName: 'Test Trophy'
            };

            await expect(database.saveTrophy(trophyData)).rejects.toThrow('SQLITE_ERROR: disk I/O error');
        });

        test('getRecentTrophies should handle database errors', async () => {
            mockDb.all.mockImplementation((sql, params, callback) => {
                callback(new Error('SQLITE_ERROR: malformed database'));
            });

            await expect(database.getRecentTrophies('user123', 5)).rejects.toThrow('SQLITE_ERROR: malformed database');
        });

        test('getPlatinumTrophies should handle database errors', async () => {
            mockDb.all.mockImplementation((sql, params, callback) => {
                callback(new Error('SQLITE_ERROR: database corruption'));
            });

            await expect(database.getPlatinumTrophies('user123')).rejects.toThrow('SQLITE_ERROR: database corruption');
        });
    });

    describe('Server Settings Operations', () => {
        beforeEach(async () => {
            mockSqlite3.Database.mockImplementation((path, callback) => {
                callback(null);
                return mockDb;
            });
            
            mockDb.exec.mockImplementation((sql, callback) => {
                callback(null);
            });
            
            await database.init();
        });

        test('run method should handle database errors', async () => {
            mockDb.run.mockImplementation((sql, params, callback) => {
                callback(new Error('SQLITE_ERROR: syntax error'));
            });

            await expect(database.run('INVALID SQL', [])).rejects.toThrow('SQLITE_ERROR: syntax error');
        });

        test('get method should handle database errors', async () => {
            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(new Error('SQLITE_ERROR: out of memory'));
            });

            await expect(database.get('SELECT * FROM test', [])).rejects.toThrow('SQLITE_ERROR: out of memory');
        });

        test('all method should handle database errors', async () => {
            mockDb.all.mockImplementation((sql, params, callback) => {
                callback(new Error('SQLITE_ERROR: permission denied'));
            });

            await expect(database.all('SELECT * FROM test', [])).rejects.toThrow('SQLITE_ERROR: permission denied');
        });
    });

    describe('Database Closing', () => {
        test('should handle database close errors', async () => {
            mockSqlite3.Database.mockImplementation((path, callback) => {
                callback(null);
                return mockDb;
            });
            
            mockDb.exec.mockImplementation((sql, callback) => {
                callback(null);
            });
            
            await database.init();

            mockDb.close.mockImplementation((callback) => {
                callback(new Error('Close error'));
            });

            await expect(database.close()).rejects.toThrow('Close error');
        });
    });

    describe('Robustness Tests', () => {
        test('should handle multiple concurrent database errors', async () => {
            mockSqlite3.Database.mockImplementation((path, callback) => {
                callback(null);
                return mockDb;
            });
            
            mockDb.exec.mockImplementation((sql, callback) => {
                callback(null);
            });
            
            await database.init();

            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(new Error('SQLITE_BUSY'));
            });

            // Test multiple concurrent failing operations
            const promises = [
                database.getUser('user1'),
                database.getUser('user2'),
                database.getUser('user3')
            ];

            const results = await Promise.allSettled(promises);
            
            results.forEach(result => {
                expect(result.status).toBe('rejected');
                expect(result.reason.message).toBe('SQLITE_BUSY');
            });
        });

        test('should handle corrupted database state', async () => {
            mockSqlite3.Database.mockImplementation((path, callback) => {
                callback(null);
                return mockDb;
            });
            
            mockDb.exec.mockImplementation((sql, callback) => {
                callback(null);
            });
            
            await database.init();

            // Simulate database corruption
            mockDb.all.mockImplementation((sql, params, callback) => {
                callback(new Error('SQLITE_CORRUPT'));
            });

            await expect(database.getUsersWithNotifications()).rejects.toThrow('SQLITE_CORRUPT');
        });
    });
}); 