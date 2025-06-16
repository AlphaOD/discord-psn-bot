/**
 * Ready Event Handler
 * 
 * Executed when the Discord bot successfully connects and is ready to operate
 * Sets up the trophy tracker and logs important startup information
 */

const { Events, ActivityType } = require('discord.js');
const TrophyTracker = require('../utils/trophyTracker');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        const logger = client.logger;
        
        try {
            logger.info(`✅ Discord bot logged in as ${client.user.tag}`);
            logger.info(`🤖 Bot is ready and serving ${client.guilds.cache.size} guild(s)`);
            
            // Set bot activity status
            client.user.setActivity('🏆 PlayStation Trophies', { 
                type: ActivityType.Watching 
            });
            
            // Initialize trophy tracker with client reference
            client.trophyTracker = new TrophyTracker(
                client.database,
                logger,
                client
            );
            
            logger.info('🏆 Trophy tracker initialized');
            
            // Register slash commands (if any exist)
            if (client.commands.size > 0) {
                logger.info(`📝 Loaded ${client.commands.size} slash command(s)`);
                
                // You can register commands globally here if needed
                // const commands = Array.from(client.commands.values()).map(cmd => cmd.data.toJSON());
                // await client.application.commands.set(commands);
            }
            
            // Log guild information
            client.guilds.cache.forEach(guild => {
                logger.debug(`Connected to guild: ${guild.name} (${guild.id}) with ${guild.memberCount} members`);
            });
            
            logger.info('🚀 Discord PSN Bot is fully operational!');
            
        } catch (error) {
            logger.error('❌ Error during bot ready event:', error);
        }
    }
};
