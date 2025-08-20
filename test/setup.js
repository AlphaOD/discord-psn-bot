/**
 * Jest Test Setup
 * 
 * Global setup and configuration for all tests
 */

// Mock Discord.js components
jest.mock('discord.js', () => ({
    SlashCommandBuilder: jest.fn().mockImplementation(() => ({
        setName: jest.fn().mockReturnThis(),
        setDescription: jest.fn().mockReturnThis(),
        addStringOption: jest.fn().mockReturnThis(),
        addIntegerOption: jest.fn().mockReturnThis(),
        addBooleanOption: jest.fn().mockReturnThis(),
        addUserOption: jest.fn().mockReturnThis(),
        addChannelOption: jest.fn().mockReturnThis(),
        toJSON: jest.fn().mockReturnValue({})
    })),
    EmbedBuilder: jest.fn().mockImplementation(() => ({
        setTitle: jest.fn().mockReturnThis(),
        setDescription: jest.fn().mockReturnThis(),
        setColor: jest.fn().mockReturnThis(),
        setThumbnail: jest.fn().mockReturnThis(),
        setFooter: jest.fn().mockReturnThis(),
        addFields: jest.fn().mockReturnThis(),
        setTimestamp: jest.fn().mockReturnThis(),
        toJSON: jest.fn().mockReturnValue({})
    })),
    ActionRowBuilder: jest.fn().mockImplementation(() => ({
        addComponents: jest.fn().mockReturnThis(),
        toJSON: jest.fn().mockReturnValue({})
    })),
    ButtonBuilder: jest.fn().mockImplementation(() => ({
        setCustomId: jest.fn().mockReturnThis(),
        setLabel: jest.fn().mockReturnThis(),
        setStyle: jest.fn().mockReturnThis(),
        setEmoji: jest.fn().mockReturnThis(),
        toJSON: jest.fn().mockReturnValue({})
    })),
    ButtonStyle: {
        Primary: 1,
        Secondary: 2,
        Success: 3,
        Danger: 4,
        Link: 5
    },
    Client: jest.fn().mockImplementation(() => ({
        commands: new Map(),
        database: null,
        logger: console,
        login: jest.fn(),
        on: jest.fn(),
        once: jest.fn()
    })),
    GatewayIntentBits: {
        Guilds: 1,
        GuildMessages: 2,
        MessageContent: 4
    }
}));

// Mock psn-api functions
jest.mock('psn-api', () => ({
    getUserTitles: jest.fn(),
    getTitleTrophies: jest.fn(),
    getTitleTrophyGroups: jest.fn(),
    getUserTrophyProfileSummary: jest.fn(),
    makeUniversalSearch: jest.fn(),
    exchangeNpssoForCode: jest.fn(),
    exchangeCodeForAccessToken: jest.fn(),
    exchangeRefreshTokenForAuthTokens: jest.fn()
}));

// Mock sqlite3
jest.mock('sqlite3', () => ({
    Database: jest.fn().mockImplementation(() => ({
        run: jest.fn(),
        get: jest.fn(),
        all: jest.fn(),
        close: jest.fn(),
        on: jest.fn()
    }))
}));

// Mock node-cron
jest.mock('node-cron', () => ({
    schedule: jest.fn(),
    destroy: jest.fn()
}));

// Mock dotenv
jest.mock('dotenv', () => ({
    config: jest.fn()
}));

// Global test utilities
global.createMockInteraction = (options = {}) => ({
    user: { id: '123456789', username: 'testuser' },
    guild: { id: '987654321', name: 'Test Guild' },
    channel: { id: '555666777', name: 'test-channel' },
    options: {
        getString: jest.fn((key) => options.strings?.[key] || null),
        getInteger: jest.fn((key) => options.integers?.[key] || null),
        getBoolean: jest.fn((key) => options.booleans?.[key] || null),
        getUser: jest.fn((key) => options.users?.[key] || null),
        getChannel: jest.fn((key) => options.channels?.[key] || null)
    },
    reply: jest.fn().mockResolvedValue({}),
    editReply: jest.fn().mockResolvedValue({}),
    followUp: jest.fn().mockResolvedValue({}),
    deferReply: jest.fn().mockResolvedValue({}),
    client: {
        database: null,
        logger: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        }
    },
    ...options.overrides
});

global.createMockDatabase = () => ({
    getUser: jest.fn(),
    getUserByPsnUsername: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getUsersWithNotifications: jest.fn(),
    saveTrophy: jest.fn(),
    getRecentTrophies: jest.fn(),
    getPlatinumTrophies: jest.fn(),
    updateLastTrophyCheck: jest.fn(),
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    close: jest.fn()
});

global.createMockLogger = () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DISCORD_TOKEN = 'test_token';
process.env.DISCORD_CLIENT_ID = 'test_client_id';

// Increase timeout for integration tests
jest.setTimeout(30000);
