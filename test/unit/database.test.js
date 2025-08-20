/**
 * Database Unit Tests
 * 
 * Tests for the Database singleton functionality including
 * user management, trophy storage, and data retrieval
 */

describe('Database', () => {
    let database;
    let mockDb;
    let originalDb;
    
    beforeAll(() => {
        // Import the database singleton
        database = require('../../src/database/database');
        // Store the original db for restoration
        originalDb = database.db;
    });
    
    beforeEach(() => {
        // Create mock SQLite database
        mockDb = {
            run: jest.fn(),
            get: jest.fn(),
            all: jest.fn(),
            close: jest.fn(),
            on: jest.fn()
        };
        
        // Replace the db property with our mock
        database.db = mockDb;
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    afterAll(() => {
        // Restore original db
        database.db = originalDb;
    });
    
    describe('User Management', () => {
        describe('getUser', () => {
            it('should retrieve user by Discord ID', async () => {
                const expectedUser = {
                    discord_id: '123456789',
                    psn_username: 'TestPlayer',
                    psn_account_id: 'abc123',
                    notifications_enabled: 1
                };
                
                mockDb.get.mockImplementation((sql, params, callback) => {
                    callback(null, expectedUser);
                });
                
                const user = await database.getUser('123456789');
                
                expect(mockDb.get).toHaveBeenCalledWith(
                    'SELECT * FROM users WHERE discord_id = ?',
                    ['123456789'],
                    expect.any(Function)
                );
                expect(user).toEqual(expectedUser);
            });
            
            it('should return null when user not found', async () => {
                mockDb.get.mockImplementation((sql, params, callback) => {
                    callback(null, null);
                });
                
                const user = await database.getUser('nonexistent');
                
                expect(user).toBeNull();
            });
            
            it('should reject on database error', async () => {
                const error = new Error('Database error');
                mockDb.get.mockImplementation((sql, params, callback) => {
                    callback(error);
                });
                
                await expect(database.getUser('123456789')).rejects.toThrow('Database error');
            });
        });
        
        describe('getUserByPsnUsername', () => {
            it('should retrieve user by PSN username', async () => {
                const expectedUser = {
                    discord_id: '123456789',
                    psn_username: 'TestPlayer',
                    psn_account_id: 'abc123'
                };
                
                mockDb.get.mockImplementation((sql, params, callback) => {
                    callback(null, expectedUser);
                });
                
                const user = await database.getUserByPsnUsername('TestPlayer');
                
                expect(mockDb.get).toHaveBeenCalledWith(
                    'SELECT * FROM users WHERE psn_username = ?',
                    ['TestPlayer'],
                    expect.any(Function)
                );
                expect(user).toEqual(expectedUser);
            });
        });
        
        describe('createUser', () => {
            it('should create new user with provided data', async () => {
                const userData = {
                    psn_username: 'NewPlayer',
                    psn_account_id: 'xyz789',
                    notifications_enabled: 1,
                    last_trophy_check: 0
                };
                
                mockDb.run.mockImplementation((sql, params, callback) => {
                    callback.call({ lastID: 1, changes: 1 }, null);
                });
                
                const result = await database.createUser('123456789', userData);
                
                expect(mockDb.run).toHaveBeenCalledWith(
                    expect.stringContaining('INSERT INTO users'),
                    ['123456789', 'NewPlayer', 'xyz789', 1, 0],
                    expect.any(Function)
                );
                expect(result).toEqual({ id: 1, changes: 1 });
            });
            
            it('should use default values when not provided', async () => {
                const userData = {
                    psn_username: 'NewPlayer',
                    psn_account_id: 'xyz789'
                };
                
                mockDb.run.mockImplementation((sql, params, callback) => {
                    callback.call({ lastID: 1, changes: 1 }, null);
                });
                
                await database.createUser('123456789', userData);
                
                expect(mockDb.run).toHaveBeenCalledWith(
                    expect.stringContaining('INSERT INTO users'),
                    ['123456789', 'NewPlayer', 'xyz789', 1, 0],
                    expect.any(Function)
                );
            });
        });
        
        describe('updateUser', () => {
            it('should update user with provided fields', async () => {
                const updateData = {
                    psn_username: 'UpdatedPlayer',
                    notifications_enabled: 0,
                    updated_at: 1234567890
                };
                
                mockDb.run.mockImplementation((sql, params, callback) => {
                    callback.call({ changes: 1 }, null);
                });
                
                const result = await database.updateUser('123456789', updateData);
                
                expect(mockDb.run).toHaveBeenCalledWith(
                    'UPDATE users SET psn_username = ?, notifications_enabled = ?, updated_at = ? WHERE discord_id = ?',
                    ['UpdatedPlayer', 0, 1234567890, '123456789'],
                    expect.any(Function)
                );
                expect(result).toEqual({ changes: 1 });
            });
            
            it('should handle partial updates', async () => {
                const updateData = {
                    notifications_enabled: 0
                };
                
                mockDb.run.mockImplementation((sql, params, callback) => {
                    callback.call({ changes: 1 }, null);
                });
                
                await database.updateUser('123456789', updateData);
                
                expect(mockDb.run).toHaveBeenCalledWith(
                    'UPDATE users SET notifications_enabled = ? WHERE discord_id = ?',
                    [0, '123456789'],
                    expect.any(Function)
                );
            });
            
            it('should throw error when no update fields provided', async () => {
                await expect(database.updateUser('123456789', {})).rejects.toThrow('No update fields provided');
            });
        });
        
        describe('deleteUser', () => {
            it('should delete user by Discord ID', async () => {
                mockDb.run.mockImplementation((sql, params, callback) => {
                    callback.call({ changes: 1 }, null);
                });
                
                const result = await database.deleteUser('123456789');
                
                expect(mockDb.run).toHaveBeenCalledWith(
                    'DELETE FROM users WHERE discord_id = ?',
                    ['123456789'],
                    expect.any(Function)
                );
                expect(result).toEqual({ changes: 1 });
            });
        });
        
        describe('getUsersWithNotifications', () => {
            it('should retrieve users with notifications enabled', async () => {
                const expectedUsers = [
                    { discord_id: '123', psn_username: 'Player1', notifications_enabled: 1 },
                    { discord_id: '456', psn_username: 'Player2', notifications_enabled: 1 }
                ];
                
                mockDb.all.mockImplementation((sql, params, callback) => {
                    callback(null, expectedUsers);
                });
                
                const users = await database.getUsersWithNotifications();
                
                expect(mockDb.all).toHaveBeenCalledWith(
                    'SELECT * FROM users WHERE notifications_enabled = 1 AND psn_username IS NOT NULL',
                    [],
                    expect.any(Function)
                );
                expect(users).toEqual(expectedUsers);
            });
        });
    });
    
    describe('Trophy Management', () => {
        describe('saveTrophy', () => {
            it('should save trophy data to database', async () => {
                const trophyData = {
                    discordId: '123456789',
                    trophyId: 'trophy001',
                    trophyName: 'Test Trophy',
                    trophyDescription: 'A test trophy',
                    trophyType: 'Gold',
                    trophyIconUrl: 'https://example.com/icon.png',
                    gameTitle: 'Test Game',
                    gameId: 'game001',
                    earnedDate: 1234567890,
                    isPlatinum: false
                };
                
                mockDb.run.mockImplementation((sql, params, callback) => {
                    callback.call({ lastID: 1, changes: 1 }, null);
                });
                
                const result = await database.saveTrophy(trophyData);
                
                expect(mockDb.run).toHaveBeenCalledWith(
                    expect.stringContaining('INSERT OR IGNORE INTO trophies'),
                    [
                        '123456789', 'trophy001', 'Test Trophy', 'A test trophy',
                        'Gold', 'https://example.com/icon.png', 'Test Game', 'game001',
                        1234567890, false
                    ],
                    expect.any(Function)
                );
                expect(result).toEqual({ id: 1, changes: 1 });
            });
        });
        
        describe('getRecentTrophies', () => {
            it('should retrieve recent trophies for user', async () => {
                const expectedTrophies = [
                    { trophy_name: 'Recent Trophy 1', earned_date: 1234567890 },
                    { trophy_name: 'Recent Trophy 2', earned_date: 1234567880 }
                ];
                
                mockDb.all.mockImplementation((sql, params, callback) => {
                    callback(null, expectedTrophies);
                });
                
                const trophies = await database.getRecentTrophies('123456789', 5);
                
                expect(mockDb.all).toHaveBeenCalledWith(
                    expect.stringContaining('SELECT * FROM trophies'),
                    ['123456789', 5],
                    expect.any(Function)
                );
                expect(trophies).toEqual(expectedTrophies);
            });
        });
        
        describe('getPlatinumTrophies', () => {
            it('should retrieve platinum trophies for user', async () => {
                const expectedTrophies = [
                    { trophy_name: 'Platinum Trophy 1', is_platinum: 1 }
                ];
                
                mockDb.all.mockImplementation((sql, params, callback) => {
                    callback(null, expectedTrophies);
                });
                
                const trophies = await database.getPlatinumTrophies('123456789');
                
                expect(mockDb.all).toHaveBeenCalledWith(
                    expect.stringContaining('WHERE discord_id = ? AND is_platinum = 1'),
                    ['123456789'],
                    expect.any(Function)
                );
                expect(trophies).toEqual(expectedTrophies);
            });
        });
    });
    
    describe('Database Operations', () => {
        describe('run', () => {
            it('should execute SQL and return result', async () => {
                mockDb.run.mockImplementation((sql, params, callback) => {
                    callback.call({ lastID: 5, changes: 1 }, null);
                });
                
                const result = await database.run('INSERT INTO test VALUES (?)', ['value']);
                
                expect(mockDb.run).toHaveBeenCalledWith(
                    'INSERT INTO test VALUES (?)',
                    ['value'],
                    expect.any(Function)
                );
                expect(result).toEqual({ id: 5, changes: 1 });
            });
            
            it('should reject on SQL error', async () => {
                const error = new Error('SQL error');
                mockDb.run.mockImplementation((sql, params, callback) => {
                    callback(error);
                });
                
                await expect(database.run('INVALID SQL')).rejects.toThrow('SQL error');
            });
        });
        
        describe('get', () => {
            it('should retrieve single row', async () => {
                const expectedRow = { id: 1, name: 'test' };
                mockDb.get.mockImplementation((sql, params, callback) => {
                    callback(null, expectedRow);
                });
                
                const row = await database.get('SELECT * FROM test WHERE id = ?', [1]);
                
                expect(mockDb.get).toHaveBeenCalledWith(
                    'SELECT * FROM test WHERE id = ?',
                    [1],
                    expect.any(Function)
                );
                expect(row).toEqual(expectedRow);
            });
        });
        
        describe('all', () => {
            it('should retrieve multiple rows', async () => {
                const expectedRows = [
                    { id: 1, name: 'test1' },
                    { id: 2, name: 'test2' }
                ];
                mockDb.all.mockImplementation((sql, params, callback) => {
                    callback(null, expectedRows);
                });
                
                const rows = await database.all('SELECT * FROM test');
                
                expect(mockDb.all).toHaveBeenCalledWith(
                    'SELECT * FROM test',
                    [],
                    expect.any(Function)
                );
                expect(rows).toEqual(expectedRows);
            });
        });
    });
});