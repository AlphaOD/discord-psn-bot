/**
 * Link Command Unit Tests
 * 
 * Tests for the /link command functionality including
 * PSN username validation, user linking, and error handling
 */

const linkCommand = require('../../../src/commands/link');

describe('Link Command', () => {
    let mockInteraction;
    let mockDatabase;
    let mockPsnApi;
    
    beforeEach(() => {
        mockDatabase = createMockDatabase();
        
        mockInteraction = createMockInteraction({
            strings: { username: 'TestPlayer' },
            overrides: {
                client: {
                    database: mockDatabase,
                    logger: createMockLogger()
                }
            }
        });
        
        // Mock the PublicPSNApi constructor and methods
        jest.doMock('../../../src/utils/publicPsnApi', () => {
            return jest.fn().mockImplementation(() => ({
                validateUsername: jest.fn(),
                getUserTrophySummary: jest.fn()
            }));
        });
    });
    
    afterEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });
    
    describe('Command Structure', () => {
        it('should have correct command data', () => {
            expect(linkCommand.data.name).toBe('link');
            expect(linkCommand.data.description).toBeDefined();
            expect(linkCommand.execute).toBeInstanceOf(Function);
        });
    });
    
    describe('User Already Linked', () => {
        it('should show already linked message when user exists', async () => {
            const existingUser = {
                psn_username: 'ExistingPlayer',
                notifications_enabled: 1,
                last_trophy_check: 1234567890
            };
            
            mockDatabase.getUser.mockResolvedValue(existingUser);
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockInteraction.deferReply).toHaveBeenCalledWith({ flags: 64 });
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                embeds: [expect.objectContaining({
                    data: expect.objectContaining({
                        title: '🔗 PSN Account Already Linked'
                    })
                })]
            });
        });
        
        it('should handle user with no PSN username', async () => {
            const existingUser = {
                psn_username: null,
                notifications_enabled: 1
            };
            
            mockDatabase.getUser.mockResolvedValue(existingUser);
            
            // Mock PSN API validation
            const { validateUsername, getUserTrophySummary } = require('../../../src/utils/publicPsnApi')();
            validateUsername.mockResolvedValue({
                accountId: '123456789',
                onlineId: 'TestPlayer',
                avatarUrl: 'https://example.com/avatar.png'
            });
            getUserTrophySummary.mockResolvedValue({
                trophyLevel: 42,
                earnedTrophies: { platinum: 5, gold: 25, silver: 50, bronze: 100 }
            });
            
            mockDatabase.updateUser.mockResolvedValue({ changes: 1 });
            
            await linkCommand.execute(mockInteraction);
            
            expect(validateUsername).toHaveBeenCalledWith('TestPlayer');
            expect(mockDatabase.updateUser).toHaveBeenCalled();
        });
    });
    
    describe('PSN Username Already Taken', () => {
        it('should reject when PSN username is linked to another Discord user', async () => {
            mockDatabase.getUser.mockResolvedValue(null);
            mockDatabase.getUserByPsnUsername.mockResolvedValue({
                discord_id: 'another_user_id',
                psn_username: 'TestPlayer'
            });
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                embeds: [expect.objectContaining({
                    data: expect.objectContaining({
                        title: '❌ PSN Username Already Linked'
                    })
                })]
            });
        });
        
        it('should allow linking when same Discord user', async () => {
            mockDatabase.getUser.mockResolvedValue(null);
            mockDatabase.getUserByPsnUsername.mockResolvedValue({
                discord_id: '123456789', // Same as interaction user
                psn_username: 'TestPlayer'
            });
            
            const { validateUsername } = require('../../../src/utils/publicPsnApi')();
            validateUsername.mockResolvedValue({
                accountId: '123456789',
                onlineId: 'TestPlayer',
                avatarUrl: null
            });
            
            mockDatabase.createUser.mockResolvedValue({ id: 1, changes: 1 });
            
            await linkCommand.execute(mockInteraction);
            
            expect(validateUsername).toHaveBeenCalled();
            expect(mockDatabase.createUser).toHaveBeenCalled();
        });
    });
    
    describe('PSN Username Validation', () => {
        beforeEach(() => {
            mockDatabase.getUser.mockResolvedValue(null);
            mockDatabase.getUserByPsnUsername.mockResolvedValue(null);
        });
        
        it('should reject invalid PSN username', async () => {
            const { validateUsername } = require('../../../src/utils/publicPsnApi')();
            validateUsername.mockResolvedValue(null);
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                embeds: [expect.objectContaining({
                    data: expect.objectContaining({
                        title: '❌ PSN Username Not Found'
                    })
                })]
            });
        });
        
        it('should handle PSN API validation errors', async () => {
            const { validateUsername } = require('../../../src/utils/publicPsnApi')();
            validateUsername.mockRejectedValue(new Error('PSN API error'));
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                embeds: [expect.objectContaining({
                    data: expect.objectContaining({
                        title: '❌ PSN Validation Failed'
                    })
                })]
            });
        });
    });
    
    describe('Successful Linking', () => {
        beforeEach(() => {
            mockDatabase.getUser.mockResolvedValue(null);
            mockDatabase.getUserByPsnUsername.mockResolvedValue(null);
        });
        
        it('should successfully link new user', async () => {
            const accountData = {
                accountId: '123456789',
                onlineId: 'TestPlayer',
                avatarUrl: 'https://example.com/avatar.png'
            };
            
            const trophySummary = {
                trophyLevel: 42,
                earnedTrophies: { platinum: 5, gold: 25, silver: 50, bronze: 100 }
            };
            
            const { validateUsername, getUserTrophySummary } = require('../../../src/utils/publicPsnApi')();
            validateUsername.mockResolvedValue(accountData);
            getUserTrophySummary.mockResolvedValue(trophySummary);
            
            mockDatabase.createUser.mockResolvedValue({ id: 1, changes: 1 });
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockDatabase.createUser).toHaveBeenCalledWith('123456789', {
                psn_username: 'TestPlayer',
                psn_account_id: '123456789',
                notifications_enabled: 1,
                last_trophy_check: 0
            });
            
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                embeds: [expect.objectContaining({
                    data: expect.objectContaining({
                        title: '✅ PSN Account Successfully Linked!'
                    })
                })]
            });
        });
        
        it('should successfully update existing user', async () => {
            const existingUser = {
                discord_id: '123456789',
                psn_username: null,
                psn_account_id: null
            };
            
            mockDatabase.getUser.mockResolvedValue(existingUser);
            
            const accountData = {
                accountId: '123456789',
                onlineId: 'TestPlayer',
                avatarUrl: null
            };
            
            const { validateUsername, getUserTrophySummary } = require('../../../src/utils/publicPsnApi')();
            validateUsername.mockResolvedValue(accountData);
            getUserTrophySummary.mockResolvedValue({
                trophyLevel: 1,
                earnedTrophies: { platinum: 0, gold: 0, silver: 0, bronze: 0 }
            });
            
            mockDatabase.updateUser.mockResolvedValue({ changes: 1 });
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockDatabase.updateUser).toHaveBeenCalledWith('123456789', {
                psn_username: 'TestPlayer',
                psn_account_id: '123456789',
                updated_at: expect.any(Number)
            });
        });
        
        it('should handle linking without trophy summary', async () => {
            const accountData = {
                accountId: '123456789',
                onlineId: 'TestPlayer',
                avatarUrl: null
            };
            
            const { validateUsername, getUserTrophySummary } = require('../../../src/utils/publicPsnApi')();
            validateUsername.mockResolvedValue(accountData);
            getUserTrophySummary.mockRejectedValue(new Error('Trophy data not accessible'));
            
            mockDatabase.createUser.mockResolvedValue({ id: 1, changes: 1 });
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockDatabase.createUser).toHaveBeenCalled();
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                embeds: [expect.objectContaining({
                    data: expect.objectContaining({
                        title: '✅ PSN Account Successfully Linked!'
                    })
                })]
            });
        });
    });
    
    describe('Database Errors', () => {
        beforeEach(() => {
            mockDatabase.getUserByPsnUsername.mockResolvedValue(null);
        });
        
        it('should handle database errors during user lookup', async () => {
            mockDatabase.getUser.mockRejectedValue(new Error('Database connection failed'));
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: '❌ Database error occurred. Please try again later.'
            });
        });
        
        it('should handle "no such table" database error', async () => {
            mockDatabase.getUser.mockRejectedValue(new Error('no such table: users'));
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: '❌ Database not properly initialized. Please contact an administrator.'
            });
        });
        
        it('should handle database error during linking', async () => {
            mockDatabase.getUser.mockResolvedValue(null);
            
            const { validateUsername, getUserTrophySummary } = require('../../../src/utils/publicPsnApi')();
            validateUsername.mockResolvedValue({
                accountId: '123456789',
                onlineId: 'TestPlayer',
                avatarUrl: null
            });
            getUserTrophySummary.mockResolvedValue({
                trophyLevel: 1,
                earnedTrophies: { platinum: 0, gold: 0, silver: 0, bronze: 0 }
            });
            
            mockDatabase.createUser.mockRejectedValue(new Error('Insert failed'));
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                embeds: [expect.objectContaining({
                    data: expect.objectContaining({
                        title: '❌ Database Error'
                    })
                })]
            });
        });
    });
    
    describe('Edge Cases', () => {
        it('should handle missing username option', async () => {
            mockInteraction.options.getString.mockReturnValue(null);
            
            await linkCommand.execute(mockInteraction);
            
            // Should handle gracefully - exact behavior depends on Discord.js validation
            expect(mockInteraction.deferReply).toHaveBeenCalled();
        });
        
        it('should handle unexpected errors', async () => {
            mockDatabase.getUser.mockImplementation(() => {
                throw new Error('Unexpected error');
            });
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                embeds: [expect.objectContaining({
                    data: expect.objectContaining({
                        title: '❌ Unexpected Error'
                    })
                })]
            });
        });
    });
});
