/**
 * Link Command Unit Tests
 * 
 * Tests for the /link command functionality including
 * PSN username validation, user linking, and error handling
 */

// Mock the PublicPSNApi before importing the command
const mockValidateUsername = jest.fn();
const mockGetUserTrophySummary = jest.fn();

jest.mock('../../../src/utils/publicPsnApi', () => {
    return jest.fn().mockImplementation(() => ({
        validateUsername: mockValidateUsername,
        getUserTrophySummary: mockGetUserTrophySummary
    }));
});

const linkCommand = require('../../../src/commands/link');

describe('Link Command', () => {
    let mockInteraction;
    let mockDatabase;
    
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
        
        // Reset all mocks
        jest.clearAllMocks();
        mockValidateUsername.mockReset();
        mockGetUserTrophySummary.mockReset();
    });
    
    describe('Command Structure', () => {
        it('should have correct command structure', () => {
            expect(linkCommand.data).toBeDefined();
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
            expect(mockInteraction.editReply).toHaveBeenCalled();
        });
        
        it('should proceed with linking when user has no PSN username', async () => {
            const existingUser = {
                psn_username: null,
                notifications_enabled: 1
            };
            
            mockDatabase.getUser.mockResolvedValue(existingUser);
            mockDatabase.getUserByPsnUsername.mockResolvedValue(null);
            
            // Mock successful PSN validation
            mockValidateUsername.mockResolvedValue({
                accountId: '123456789',
                onlineId: 'TestPlayer',
                avatarUrl: 'https://example.com/avatar.png'
            });
            mockGetUserTrophySummary.mockResolvedValue({
                trophyLevel: 42,
                earnedTrophies: { platinum: 5, gold: 25, silver: 50, bronze: 100 }
            });
            
            mockDatabase.updateUser.mockResolvedValue({ changes: 1 });
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockValidateUsername).toHaveBeenCalledWith('TestPlayer');
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
            
            expect(mockInteraction.editReply).toHaveBeenCalled();
            const replyCall = mockInteraction.editReply.mock.calls[0][0];
            expect(replyCall.embeds).toBeDefined();
        });
        
        it('should allow linking when same Discord user', async () => {
            mockDatabase.getUser.mockResolvedValue(null);
            mockDatabase.getUserByPsnUsername.mockResolvedValue({
                discord_id: '123456789', // Same as interaction user
                psn_username: 'TestPlayer'
            });
            
            mockValidateUsername.mockResolvedValue({
                accountId: '123456789',
                onlineId: 'TestPlayer',
                avatarUrl: null
            });
            
            mockDatabase.createUser.mockResolvedValue({ id: 1, changes: 1 });
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockValidateUsername).toHaveBeenCalled();
            expect(mockDatabase.createUser).toHaveBeenCalled();
        });
    });
    
    describe('PSN Username Validation', () => {
        beforeEach(() => {
            mockDatabase.getUser.mockResolvedValue(null);
            mockDatabase.getUserByPsnUsername.mockResolvedValue(null);
        });
        
        it('should reject invalid PSN username', async () => {
            mockValidateUsername.mockResolvedValue(null);
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalled();
            const replyCall = mockInteraction.editReply.mock.calls[0][0];
            expect(replyCall.embeds).toBeDefined();
        });
        
        it('should handle PSN API validation errors', async () => {
            mockValidateUsername.mockRejectedValue(new Error('PSN API error'));
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalled();
            const replyCall = mockInteraction.editReply.mock.calls[0][0];
            expect(replyCall.embeds).toBeDefined();
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
            
            mockValidateUsername.mockResolvedValue(accountData);
            mockGetUserTrophySummary.mockResolvedValue(trophySummary);
            
            mockDatabase.createUser.mockResolvedValue({ id: 1, changes: 1 });
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockDatabase.createUser).toHaveBeenCalledWith('123456789', {
                psn_username: 'TestPlayer',
                psn_account_id: '123456789',
                notifications_enabled: 1,
                last_trophy_check: 0
            });
            
            expect(mockInteraction.editReply).toHaveBeenCalled();
            const replyCall = mockInteraction.editReply.mock.calls[0][0];
            expect(replyCall.embeds).toBeDefined();
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
            
            mockValidateUsername.mockResolvedValue(accountData);
            mockGetUserTrophySummary.mockResolvedValue({
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
            
            mockValidateUsername.mockResolvedValue(accountData);
            mockGetUserTrophySummary.mockRejectedValue(new Error('Trophy data not accessible'));
            
            mockDatabase.createUser.mockResolvedValue({ id: 1, changes: 1 });
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockDatabase.createUser).toHaveBeenCalled();
            expect(mockInteraction.editReply).toHaveBeenCalled();
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
            
            mockValidateUsername.mockResolvedValue({
                accountId: '123456789',
                onlineId: 'TestPlayer',
                avatarUrl: null
            });
            mockGetUserTrophySummary.mockResolvedValue({
                trophyLevel: 1,
                earnedTrophies: { platinum: 0, gold: 0, silver: 0, bronze: 0 }
            });
            
            mockDatabase.createUser.mockRejectedValue(new Error('Insert failed'));
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalled();
            const replyCall = mockInteraction.editReply.mock.calls[0][0];
            expect(replyCall.embeds).toBeDefined();
        });
    });
    
    describe('Edge Cases', () => {
        it('should handle missing username option', async () => {
            mockInteraction.options.getString.mockReturnValue(null);
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockInteraction.deferReply).toHaveBeenCalled();
        });
        
        it('should handle unexpected errors', async () => {
            mockDatabase.getUser.mockImplementation(() => {
                throw new Error('Unexpected error');
            });
            
            await linkCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalled();
        });
    });
});