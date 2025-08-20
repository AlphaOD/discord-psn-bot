const { SlashCommandBuilder } = require('discord.js');

// Mock Discord.js
jest.mock('discord.js', () => ({
    SlashCommandBuilder: jest.fn().mockImplementation(() => ({
        setName: jest.fn().mockReturnThis(),
        setDescription: jest.fn().mockReturnThis(),
        addUserOption: jest.fn().mockReturnThis(),
        addSubcommand: jest.fn().mockReturnThis(),
        addChannelOption: jest.fn().mockReturnThis(),
        setDefaultMemberPermissions: jest.fn().mockReturnThis()
    })),
    EmbedBuilder: jest.fn().mockImplementation(() => ({
        setTitle: jest.fn().mockReturnThis(),
        setDescription: jest.fn().mockReturnThis(),
        addFields: jest.fn().mockReturnThis(),
        setColor: jest.fn().mockReturnThis(),
        setTimestamp: jest.fn().mockReturnThis(),
        setFooter: jest.fn().mockReturnThis()
    })),
    PermissionFlagsBits: {
        ManageChannels: 'ManageChannels',
        Administrator: 'Administrator'
    },
    ActionRowBuilder: jest.fn(),
    ButtonBuilder: jest.fn(),
    ButtonStyle: { Primary: 1, Secondary: 2 }
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    logCommand: jest.fn()
}));

describe('Command Error Handling', () => {
    let mockInteraction;
    let mockDatabase;
    let mockLogger;
    let mockTrophyTracker;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock interaction
        mockInteraction = {
            reply: jest.fn().mockResolvedValue(),
            editReply: jest.fn().mockResolvedValue(),
            deferReply: jest.fn().mockResolvedValue(),
            user: { 
                id: 'user123',
                tag: 'TestUser#1234',
                displayName: 'TestUser',
                displayAvatarURL: jest.fn().mockReturnValue('avatar.png')
            },
            guild: { id: 'guild123' },
            channel: { id: 'channel123' },
            options: {
                getUser: jest.fn(),
                getSubcommand: jest.fn(),
                getChannel: jest.fn()
            },
            client: {}
        };
        
        // Mock database
        mockDatabase = {
            getUser: jest.fn(),
            getRecentTrophies: jest.fn(),
            getPlatinumTrophies: jest.fn(),
            run: jest.fn(),
            get: jest.fn(),
            all: jest.fn(),
            saveUser: jest.fn()
        };
        
        // Mock logger
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            logCommand: jest.fn()
        };
        
        // Mock trophy tracker
        mockTrophyTracker = {
            getUserTrophyStats: jest.fn(),
            checkUserTrophies: jest.fn()
        };
        
        // Set up client references
        mockInteraction.client.database = mockDatabase;
        mockInteraction.client.logger = mockLogger;
        mockInteraction.client.trophyTracker = mockTrophyTracker;
    });

    describe('Profile Command Error Handling', () => {
        let profileCommand;

        beforeEach(() => {
            delete require.cache[require.resolve('../src/commands/profile')];
            profileCommand = require('../src/commands/profile');
        });

        test('should handle database error when fetching user data', async () => {
            mockInteraction.options.getUser.mockReturnValue(null);
            mockDatabase.getUser.mockRejectedValue(
                new Error('SQLITE_ERROR: database is locked')
            );

            await profileCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error in profile command:',
                expect.any(Error)
            );
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: '❌ Database error occurred. Please try again later.'
            });
        });

        test('should handle trophy stats error gracefully', async () => {
            mockInteraction.options.getUser.mockReturnValue(null);
            mockDatabase.getUser.mockResolvedValue({
                psn_username: 'testuser',
                created_at: 1640995200
            });
            
            mockTrophyTracker.getUserTrophyStats.mockRejectedValue(
                new Error('SQLITE_ERROR: no such table')
            );
            
            mockDatabase.getRecentTrophies.mockResolvedValue([]);
            mockDatabase.getPlatinumTrophies.mockResolvedValue([]);

            await profileCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error getting trophy stats:',
                expect.any(Error)
            );
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                embeds: expect.any(Array)
            });
        });

        test('should handle no such table error specifically', async () => {
            mockInteraction.options.getUser.mockReturnValue(null);
            mockDatabase.getUser.mockRejectedValue(
                new Error('SQLITE_ERROR: no such table: users')
            );

            await profileCommand.execute(mockInteraction);

            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: '❌ Database not properly initialized. Please contact an administrator.'
            });
        });
    });

    describe('Check Command Error Handling', () => {
        let checkCommand;

        beforeEach(() => {
            delete require.cache[require.resolve('../src/commands/check')];
            checkCommand = require('../src/commands/check');
        });

        test('should handle database error when fetching user data', async () => {
            mockDatabase.getUser.mockRejectedValue(
                new Error('SQLITE_ERROR: database is busy')
            );

            await checkCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error in check command:',
                expect.any(Error)
            );
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: '❌ Database error occurred. Please try again later.'
            });
        });

        test('should handle stats error during check', async () => {
            mockDatabase.getUser.mockResolvedValue({
                psn_username: 'testuser',
                access_token: 'token123',
                psn_account_id: 'account123'
            });
            
            mockTrophyTracker.checkUserTrophies.mockResolvedValue();
            mockTrophyTracker.getUserTrophyStats.mockRejectedValue(
                new Error('SQLITE_ERROR: malformed database')
            );
            
            mockDatabase.getRecentTrophies.mockResolvedValue([]);

            await checkCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error getting stats in check command:',
                expect.any(Error)
            );
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                embeds: expect.any(Array)
            });
        });
    });

    describe.skip('Link Command Error Handling', () => {
        let linkCommand;

        beforeEach(() => {
            delete require.cache[require.resolve('../src/commands/link')];
            linkCommand = require('../src/commands/link');
        });

        test('should handle database error when checking existing user', async () => {
            mockDatabase.getUser.mockRejectedValue(
                new Error('SQLITE_ERROR: permission denied')
            );

            await linkCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error in link command:',
                expect.any(Error)
            );
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: '❌ Database error occurred. Please try again later.',
                ephemeral: true
            });
        });
    });

    describe('Channel Command Error Handling', () => {
        let channelCommand;

        beforeEach(() => {
            delete require.cache[require.resolve('../src/commands/channel')];
            channelCommand = require('../src/commands/channel');
        });

        test('should handle database error when fetching user data', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('set');
            mockDatabase.getUser.mockRejectedValue(
                new Error('SQLITE_ERROR: out of memory')
            );

            await channelCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error checking user:',
                expect.any(Error)
            );
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: '❌ Database error occurred. Please try again later.',
                ephemeral: true
            });
        });

        test('should handle database error when setting notification channel', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('set');
            mockInteraction.options.getChannel.mockReturnValue({
                id: 'channel123',
                name: 'test-channel',
                permissionsFor: jest.fn().mockReturnValue({
                    has: jest.fn().mockReturnValue(true)
                })
            });
            
            mockDatabase.getUser.mockResolvedValue({
                psn_username: 'testuser'
            });
            
            mockDatabase.run.mockRejectedValue(
                new Error('SQLITE_ERROR: constraint failed')
            );

            await channelCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error saving notification settings:',
                expect.any(Error)
            );
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: '❌ Database error occurred while saving settings. Please try again later.',
                ephemeral: true
            });
        });
    });

    describe('Restrict Command Error Handling', () => {
        let restrictCommand;

        beforeEach(() => {
            delete require.cache[require.resolve('../src/commands/restrict')];
            restrictCommand = require('../src/commands/restrict');
        });

        test('should handle database error when adding restriction', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('add');
            mockInteraction.options.getChannel.mockReturnValue({
                id: 'channel123',
                name: 'test-channel'
            });
            
            mockDatabase.run.mockRejectedValue(
                new Error('SQLITE_ERROR: readonly database')
            );

            await restrictCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error in handleAddRestriction:',
                expect.any(Error)
            );
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: '❌ Database error occurred while adding restriction. Please try again later.',
                ephemeral: true
            });
        });

        test('should handle database error when listing restrictions', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('list');
            mockDatabase.all.mockRejectedValue(
                new Error('SQLITE_ERROR: file is not a database')
            );

            await restrictCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error in handleListRestrictions:',
                expect.any(Error)
            );
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: '❌ Database error occurred while fetching restrictions. Please try again later.',
                ephemeral: true
            });
        });
    });

    describe.skip('InteractionCreate Event Error Handling', () => {
        let interactionCreateEvent;

        beforeEach(() => {
            delete require.cache[require.resolve('../src/events/interactionCreate')];
            interactionCreateEvent = require('../src/events/interactionCreate');
        });

        test('should handle channel restriction check errors gracefully', async () => {
            mockInteraction.isChatInputCommand = jest.fn().mockReturnValue(true);
            mockInteraction.commandName = 'profile';
            
            mockInteraction.client.commands = new Map();
            mockInteraction.client.commands.set('profile', {
                execute: jest.fn().mockResolvedValue()
            });
            
            // Mock the isChannelAllowed function to throw an error
            jest.doMock('../src/commands/restrict', () => ({
                isChannelAllowed: jest.fn().mockRejectedValue(
                    new Error('SQLITE_ERROR: database is locked')
                )
            }));

            await interactionCreateEvent.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error checking channel restrictions:',
                expect.any(Error)
            );
        });

        test('should handle PSN token modal database save errors', async () => {
            mockInteraction.isModalSubmit = jest.fn().mockReturnValue(true);
            mockInteraction.customId = 'psn_token_modal';
            mockInteraction.fields = {
                getTextInputValue: jest.fn().mockReturnValue('a'.repeat(64))
            };
            mockInteraction.deferReply = jest.fn().mockResolvedValue();
            
            // Mock PSN API
            const mockPsnApi = {
                isValidNpssoToken: jest.fn().mockReturnValue(true),
                authenticateWithNpsso: jest.fn().mockResolvedValue({
                    accessToken: 'token',
                    refreshToken: 'refresh',
                    expiresAt: Date.now() + 3600000
                }),
                getUserProfile: jest.fn().mockResolvedValue({
                    onlineId: 'testuser',
                    accountId: 'account123'
                })
            };
            
            jest.doMock('../src/utils/psnApi', () => jest.fn(() => mockPsnApi));
            
            mockDatabase.saveUser.mockRejectedValue(
                new Error('SQLITE_ERROR: constraint violation')
            );

            await interactionCreateEvent.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error saving user to database:',
                expect.any(Error)
            );
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: expect.stringContaining('Failed to save account information to database')
            });
        });
    });

    describe('TrophyTracker Error Handling', () => {
        test('should handle isChannelAllowed database errors', async () => {
            const { isChannelAllowed } = require('../src/commands/restrict');
            
            mockDatabase.all.mockRejectedValue(
                new Error('SQLITE_ERROR: database is locked')
            );
            
            const result = await isChannelAllowed(mockInteraction, mockDatabase);
            
            // Should default to allowing the command when there's a database error
            expect(result).toBe(true);
        });
    });

    describe.skip('General Error Robustness', () => {
        test('should handle multiple concurrent database errors', async () => {
            const profileCommand = require('../src/commands/profile');
            
            mockInteraction.options.getUser.mockReturnValue(null);
            
            // Simulate multiple failing database operations
            mockDatabase.getUser.mockRejectedValue(new Error('SQLITE_BUSY'));

            await profileCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error in profile command:',
                expect.any(Error)
            );
        });

        test('should handle database initialization errors', async () => {
            // Test that index.js handles database init errors
            const originalProcess = process.exit;
            process.exit = jest.fn();
            
            delete require.cache[require.resolve('../index')];
            
            // Mock database to fail on init
            jest.doMock('../src/database/database', () => ({
                init: jest.fn().mockRejectedValue(new Error('Database init failed'))
            }));
            
            try {
                require('../index');
                
                // Wait for async operations
                await new Promise(resolve => setTimeout(resolve, 100));
                
                expect(mockLogger.error).toHaveBeenCalledWith(
                    '❌ Database initialization failed:',
                    expect.any(Error)
                );
            } finally {
                process.exit = originalProcess;
            }
        });

        test('should handle database close errors gracefully', async () => {
            const originalProcess = process.exit;
            process.exit = jest.fn();
            
            // Mock database with failing close
            const mockFailingDatabase = {
                close: jest.fn().mockRejectedValue(new Error('Close error'))
            };
            
            const mockClient = {
                database: mockFailingDatabase,
                destroy: jest.fn()
            };
            
            // Simulate SIGINT
            const sigintHandler = process.listeners('SIGINT')[0];
            await sigintHandler();
            
            expect(mockLogger.error).toHaveBeenCalledWith(
                '❌ Error closing database:',
                expect.any(Error)
            );
            
            process.exit = originalProcess;
        });
    });
});

describe('Database Error Handling Tests', () => {
    let mockDatabase;
    let mockLogger;
    let mockInteraction;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockDatabase = {
            getUser: jest.fn(),
            getRecentTrophies: jest.fn(),
            getPlatinumTrophies: jest.fn(),
            run: jest.fn(),
            get: jest.fn(),
            all: jest.fn(),
            saveUser: jest.fn()
        };
        
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            logCommand: jest.fn()
        };
        
        mockInteraction = {
            reply: jest.fn().mockResolvedValue(),
            editReply: jest.fn().mockResolvedValue(),
            deferReply: jest.fn().mockResolvedValue(),
            user: { 
                id: 'user123',
                tag: 'TestUser#1234',
                displayName: 'TestUser',
                displayAvatarURL: jest.fn().mockReturnValue('avatar.png')
            },
            guild: { id: 'guild123' },
            channel: { id: 'channel123' },
            options: {
                getUser: jest.fn(),
                getSubcommand: jest.fn(),
                getChannel: jest.fn()
            },
            client: {
                database: mockDatabase,
                logger: mockLogger,
                trophyTracker: {
                    getUserTrophyStats: jest.fn(),
                    checkUserTrophies: jest.fn()
                }
            }
        };
    });

    describe('Profile Command Database Errors', () => {
        test('should handle getUser database error', async () => {
            const profileCommand = require('../src/commands/profile');
            
            mockInteraction.options.getUser.mockReturnValue(null);
            mockDatabase.getUser.mockRejectedValue(
                new Error('SQLITE_ERROR: database is locked')
            );

            await profileCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error in profile command:',
                expect.any(Error)
            );
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: '❌ Database error occurred. Please try again later.'
            });
        });

        test('should handle getRecentTrophies database error', async () => {
            const profileCommand = require('../src/commands/profile');
            
            mockInteraction.options.getUser.mockReturnValue(null);
            mockDatabase.getUser.mockResolvedValue({
                psn_username: 'testuser',
                created_at: 1640995200
            });
            
            mockInteraction.client.trophyTracker.getUserTrophyStats.mockResolvedValue({
                total_trophies: 10,
                platinum_count: 1
            });
            
            mockDatabase.getRecentTrophies.mockRejectedValue(
                new Error('SQLITE_ERROR: disk I/O error')
            );
            
            mockDatabase.getPlatinumTrophies.mockResolvedValue([]);

            await profileCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error getting recent trophies:',
                expect.any(Error)
            );
        });
    });

    describe('Check Command Database Errors', () => {
        test('should handle getUser database error', async () => {
            const checkCommand = require('../src/commands/check');
            
            mockDatabase.getUser.mockRejectedValue(
                new Error('SQLITE_ERROR: database is busy')
            );

            await checkCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error in check command:',
                expect.any(Error)
            );
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: '❌ Database error occurred. Please try again later.'
            });
        });
    });

            describe.skip('Link Command Database Errors', () => {
        test('should handle database error when checking existing user', async () => {
            const linkCommand = require('../src/commands/link');
            
            mockDatabase.getUser.mockRejectedValue(
                new Error('SQLITE_ERROR: permission denied')
            );

            await linkCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error in link command:',
                expect.any(Error)
            );
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: '❌ Database error occurred. Please try again later.',
                ephemeral: true
            });
        });
    });

    describe('Channel Command Database Errors', () => {
        test('should handle database error when checking user', async () => {
            const channelCommand = require('../src/commands/channel');
            
            mockInteraction.options.getSubcommand.mockReturnValue('set');
            mockDatabase.getUser.mockRejectedValue(
                new Error('SQLITE_ERROR: out of memory')
            );

            await channelCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error checking user:',
                expect.any(Error)
            );
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: '❌ Database error occurred. Please try again later.',
                ephemeral: true
            });
        });

        test('should handle database error when saving notification settings', async () => {
            const channelCommand = require('../src/commands/channel');
            
            mockInteraction.options.getSubcommand.mockReturnValue('set');
            mockInteraction.options.getChannel.mockReturnValue({
                id: 'channel123',
                name: 'test-channel',
                permissionsFor: jest.fn().mockReturnValue({
                    has: jest.fn().mockReturnValue(true)
                })
            });
            
            mockDatabase.getUser.mockResolvedValue({
                psn_username: 'testuser'
            });
            
            mockDatabase.run.mockRejectedValue(
                new Error('SQLITE_ERROR: constraint failed')
            );

            await channelCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error saving notification settings:',
                expect.any(Error)
            );
        });
    });

    describe('Restrict Command Database Errors', () => {
        test('should handle database error when adding restriction', async () => {
            const restrictCommand = require('../src/commands/restrict');
            
            mockInteraction.options.getSubcommand.mockReturnValue('add');
            mockInteraction.options.getChannel.mockReturnValue({
                id: 'channel123',
                name: 'test-channel'
            });
            
            mockDatabase.run.mockRejectedValue(
                new Error('SQLITE_ERROR: readonly database')
            );

            await restrictCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error in handleAddRestriction:',
                expect.any(Error)
            );
        });

        test('should handle isChannelAllowed database error gracefully', async () => {
            const { isChannelAllowed } = require('../src/commands/restrict');
            
            mockDatabase.all.mockRejectedValue(
                new Error('SQLITE_ERROR: database is locked')
            );
            
            const result = await isChannelAllowed(mockInteraction, mockDatabase);
            
            // Should default to allowing when there's an error
            expect(result).toBe(true);
        });
    });

            describe.skip('Trophy Tracker Database Errors', () => {
        test('should handle getUsersWithNotifications error', async () => {
            const TrophyTracker = require('../src/utils/trophyTracker');
            const tracker = new TrophyTracker(mockDatabase, mockLogger);
            
            mockDatabase.getUsersWithNotifications.mockRejectedValue(
                new Error('SQLITE_ERROR: database is locked')
            );

            await tracker.checkAllUsers();

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error fetching users for trophy check:',
                expect.any(Error)
            );
        });

        test('should handle saveTrophy error', async () => {
            const TrophyTracker = require('../src/utils/trophyTracker');
            const tracker = new TrophyTracker(mockDatabase, mockLogger);
            
            const mockUser = { discord_id: 'user123', psn_username: 'testuser' };
            const mockTrophy = {
                trophyId: 'trophy123',
                trophyName: 'Test Trophy',
                trophyType: 'bronze',
                earnedDateTime: '2024-01-01T12:00:00Z'
            };
            
            mockDatabase.saveTrophy.mockRejectedValue(
                new Error('SQLITE_ERROR: disk I/O error')
            );

            await tracker.processTrophy(mockUser, mockTrophy);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error saving trophy for user user123:',
                expect.any(Error)
            );
        });

        test('should handle getUserTrophyStats error and return defaults', async () => {
            const TrophyTracker = require('../src/utils/trophyTracker');
            const tracker = new TrophyTracker(mockDatabase, mockLogger);
            
            mockDatabase.get.mockRejectedValue(
                new Error('SQLITE_ERROR: malformed database')
            );

            const result = await tracker.getUserTrophyStats('user123');

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

    describe('General Database Error Patterns', () => {
        test('should handle SQLITE_BUSY errors', async () => {
            const profileCommand = require('../src/commands/profile');
            
            mockInteraction.options.getUser.mockReturnValue(null);
            mockDatabase.getUser.mockRejectedValue(new Error('SQLITE_BUSY'));

            await profileCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalled();
        });

        test('should handle SQLITE_CORRUPT errors', async () => {
            const profileCommand = require('../src/commands/profile');
            
            mockInteraction.options.getUser.mockReturnValue(null);
            mockDatabase.getUser.mockRejectedValue(new Error('SQLITE_CORRUPT'));

            await profileCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalled();
        });

        test('should handle no such table errors specifically', async () => {
            const profileCommand = require('../src/commands/profile');
            
            mockInteraction.options.getUser.mockReturnValue(null);
            mockDatabase.getUser.mockRejectedValue(
                new Error('SQLITE_ERROR: no such table: users')
            );

            await profileCommand.execute(mockInteraction);

            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: '❌ Database not properly initialized. Please contact an administrator.'
            });
        });
    });
}); 