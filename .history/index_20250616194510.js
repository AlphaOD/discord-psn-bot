/**
 * Discord PSN Bot - Main Entry Point
 * 
 * A Discord bot that tracks PlayStation Network trophies and provides
 * user statistics, notifications, and trophy information.
 * 
 * Features:
 * - PSN account linking
 * - Trophy notifications
 * - User statistics
 * - Trophy comparisons
 * - Automatic trophy checking
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Database = require('./src/database/database');
const logger = require('./src/utils/logger');
const cron = require('node-cron');
const http = require('http');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        // Note: MessageContent intent removed to avoid privileged intent requirement
        // The bot works with slash commands only, which don't need MessageContent
    ]
});

// Initialize collections for commands
client.commands = new Collection();
client.logger = logger;
client.database = Database;

/**
 * Create a simple HTTP server for Render port binding
 */
function createHealthServer() {
    const server = http.createServer((req, res) => {
        if (req.url === '/health' || req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'healthy',
                bot: client.user ? `Logged in as ${client.user.tag}` : 'Not logged in',
                guilds: client.guilds ? client.guilds.cache.size : 0,
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            }));
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    });

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
        logger.info(`🌐 Health server listening on port ${port}`);
    });

    return server;
}

/**
 * Load command files dynamically
 */
async function loadCommands() {
    const commandsPath = path.join(__dirname, 'src', 'commands');
    
    if (!fs.existsSync(commandsPath)) {
        logger.warn('Commands directory does not exist, skipping command loading');
        return;
    }
    
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            logger.info(`Loaded command: ${command.data.name}`);
        } else {
            logger.warn(`Command at ${filePath} is missing required "data" or "execute" property`);
        }
    }
}

/**
 * Load event files dynamically
 */
async function loadEvents() {
    const eventsPath = path.join(__dirname, 'src', 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        
        logger.info(`Loaded event: ${event.name}`);
    }
}

/**
 * Setup automatic trophy checking cron job
 * Runs every 30 minutes to check for new trophies
 */
function setupTrophyChecker() {
    // Run every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        try {
            logger.info('Starting scheduled trophy check...');
            
            // Add timeout protection to prevent hanging cron jobs
            await Promise.race([
                client.trophyTracker.checkAllUsers(),
                new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(new Error('Scheduled trophy check timed out after 10 minutes'));
                    }, 600000); // 10 minute timeout for scheduled checks
                })
            ]);
            
            logger.info('Scheduled trophy check completed');
        } catch (error) {
            if (error.message.includes('timed out')) {
                logger.warn('Scheduled trophy check timed out - PSN may be slow');
            } else {
                logger.error('Error during scheduled trophy check:', error);
            }
        }
    });
    
    logger.info('Trophy checking scheduled to run every 30 minutes');
}

/**
 * Initialize the bot
 */
async function init() {
    try {
        logger.info('🚀 Starting Discord PSN Bot...');
        
        // Create health server for Render port binding
        createHealthServer();
        
        // Validate environment variables
        if (!process.env.DISCORD_TOKEN) {
            throw new Error('DISCORD_TOKEN environment variable is required');
        }
        
        // Log token info (without exposing the actual token)
        const tokenStart = process.env.DISCORD_TOKEN.substring(0, 10);
        logger.info(`✅ Environment variables validated - Token starts with: ${tokenStart}...`);
        logger.info('Available environment variables:', Object.keys(process.env).filter(key => key.startsWith('DISCORD')));
        
        // Initialize database
        try {
            await client.database.init();
            logger.info('✅ Database initialized');
        } catch (dbError) {
            logger.error('❌ Database initialization failed:', dbError);
            throw new Error(`Database initialization failed: ${dbError.message}`);
        }
        
        // Initialize trophy tracker
        const TrophyTracker = require('./src/utils/trophyTracker');
        client.trophyTracker = new TrophyTracker(client.database, logger, client);
        logger.info('✅ Trophy tracker initialized');
        
        // Load commands and events
        await loadCommands();
        await loadEvents();
        
        // Setup trophy checking
        setupTrophyChecker();
        
        // Login to Discord
        logger.info('🔑 Attempting to login to Discord...');
        await client.login(process.env.DISCORD_TOKEN);
        logger.info('✅ Successfully logged in to Discord');
        
    } catch (error) {
        logger.error('❌ Failed to initialize bot:');
        logger.error('Error message:', error.message);
        logger.error('Error stack:', error.stack);
        logger.error('Full error object:', JSON.stringify(error, null, 2));
        process.exit(1);
    }
}

/**
 * Graceful shutdown handler
 */
process.on('SIGINT', async () => {
    logger.info('🛑 Shutting down bot...');
    
    try {
        if (client.database) {
            try {
                await client.database.close();
                logger.info('✅ Database connection closed');
            } catch (dbError) {
                logger.error('❌ Error closing database:', dbError);
            }
        }
        
        client.destroy();
        logger.info('✅ Discord client destroyed');
        
    } catch (error) {
        logger.error('❌ Error during shutdown:', error);
    }
    
    process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

// Start the bot
init(); 