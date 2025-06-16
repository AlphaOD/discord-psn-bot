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
    }
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
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
            all: jest.fn()
        };
        
        // Mock logger
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
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

        test('should handle recent trophies fetch error', async () => {
            mockInteraction.options.getUser.mockReturnValue(null);
            mockDatabase.getUser.mockResolvedValue({
                psn_username: 'testuser',
                created_at: 1640995200
            });
            
            mockTrophyTracker.getUserTrophyStats.mockResolvedValue({
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
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                embeds: expect.any(Array)
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

    describe('Link Command Error Handling', () => {
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

        test('should handle database error when fetching channel info', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('info');
            mockDatabase.getUser.mockResolvedValue({
                psn_username: 'testuser'
            });
            
            mockDatabase.get.mockRejectedValue(
                new Error('SQLITE_ERROR: database corruption')
            );

            await channelCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error fetching notification settings:',
                expect.any(Error)
            );
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: '❌ Database error occurred while fetching settings. Please try again later.',
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

    describe('InteractionCreate Event Error Handling', () => {
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
            // Should continue to execute the command despite restriction check error
            expect(mockInteraction.client.commands.get('profile').execute).toHaveBeenCalled();
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

    describe('General Error Robustness', () => {
        test('should handle multiple concurrent database errors', async () => {
            const profileCommand = require('../src/commands/profile');
            
            mockInteraction.options.getUser.mockReturnValue(null);
            
            // Simulate multiple failing database operations
            mockDatabase.getUser.mockRejectedValue(new Error('SQLITE_BUSY'));
            mockDatabase.getRecentTrophies.mockRejectedValue(new Error('SQLITE_BUSY'));
            mockDatabase.getPlatinumTrophies.mockRejectedValue(new Error('SQLITE_BUSY'));

            await profileCommand.execute(mockInteraction);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Database error in profile command:',
                expect.any(Error)
            );
        });

        test('should provide appropriate error messages for different error types', async () => {
            const profileCommand = require('../src/commands/profile');
            
            mockInteraction.options.getUser.mockReturnValue(null);
            
            // Test "no such table" error
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