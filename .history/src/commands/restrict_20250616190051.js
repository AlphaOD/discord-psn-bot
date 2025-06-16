/**
 * Restrict Command - Server Channel Restrictions
 * 
 * Allows server administrators to restrict bot commands
 * to specific channels server-wide
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restrict')
        .setDescription('Restrict bot usage to specific channels (Admin only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a channel to the allowed list')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to allow bot usage in')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a channel from the allowed list')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to remove from allowed list')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all channel restrictions (allow bot everywhere)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Show current channel restrictions')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const database = interaction.client.database;
        const logger = interaction.client.logger;
        const subcommand = interaction.options.getSubcommand();
        
        try {
            switch (subcommand) {
                case 'add':
                    await handleAddRestriction(interaction, database, logger);
                    break;
                case 'remove':
                    await handleRemoveRestriction(interaction, database, logger);
                    break;
                case 'clear':
                    await handleClearRestrictions(interaction, database, logger);
                    break;
                case 'list':
                    await handleListRestrictions(interaction, database, logger);
                    break;
            }
        } catch (error) {
            logger.error('Error in restrict command:', error);
            await interaction.reply({
                content: '❌ An error occurred while configuring restrictions.',
                ephemeral: true
            });
        }
    }
};

/**
 * Add channel restriction
 */
async function handleAddRestriction(interaction, database, logger) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;
    
    try {
        // Create server_settings table if it doesn't exist
        await database.run(`
            CREATE TABLE IF NOT EXISTS server_settings (
                guild_id TEXT,
                channel_id TEXT,
                setting_type TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                PRIMARY KEY (guild_id, channel_id, setting_type)
            )
        `);
        
        // Add channel restriction
        await database.run(`
            INSERT OR IGNORE INTO server_settings (guild_id, channel_id, setting_type)
            VALUES (?, ?, 'allowed_channel')
        `, [guildId, channel.id]);
    } catch (dbError) {
        logger.error('Database error in handleAddRestriction:', dbError);
        await interaction.reply({
            content: '❌ Database error occurred while adding restriction. Please try again later.',
            ephemeral: true
        });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle('✅ Channel Restriction Added')
        .setDescription(`Bot commands are now allowed in ${channel}`)
        .addFields([
            {
                name: '📝 Note',
                value: 'Once you add the first restricted channel, the bot will ONLY work in specified channels. Use `/restrict clear` to remove all restrictions.',
                inline: false
            }
        ])
        .setColor(0x00FF00)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
    logger.info(`Channel restriction added: ${channel.id} in guild ${guildId} by ${interaction.user.tag}`);
}

/**
 * Remove channel restriction
 */
async function handleRemoveRestriction(interaction, database, logger) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;
    
    let result;
    try {
        result = await database.run(`
            DELETE FROM server_settings 
            WHERE guild_id = ? AND channel_id = ? AND setting_type = 'allowed_channel'
        `, [guildId, channel.id]);
    } catch (dbError) {
        logger.error('Database error in handleRemoveRestriction:', dbError);
        await interaction.reply({
            content: '❌ Database error occurred while removing restriction. Please try again later.',
            ephemeral: true
        });
        return;
    }
    
    if (result.changes === 0) {
        await interaction.reply({
            content: `❌ ${channel} was not in the restricted channels list.`,
            ephemeral: true
        });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle('❌ Channel Restriction Removed')
        .setDescription(`Bot commands are no longer specifically allowed in ${channel}`)
        .setColor(0xFF6B6B)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
    logger.info(`Channel restriction removed: ${channel.id} in guild ${guildId} by ${interaction.user.tag}`);
}

/**
 * Clear all restrictions
 */
async function handleClearRestrictions(interaction, database, logger) {
    const guildId = interaction.guild.id;
    
    let result;
    try {
        result = await database.run(`
            DELETE FROM server_settings 
            WHERE guild_id = ? AND setting_type = 'allowed_channel'
        `, [guildId]);
    } catch (dbError) {
        logger.error('Database error in handleClearRestrictions:', dbError);
        await interaction.reply({
            content: '❌ Database error occurred while clearing restrictions. Please try again later.',
            ephemeral: true
        });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🔓 All Restrictions Cleared')
        .setDescription(`Bot commands are now allowed in all channels where the bot has permissions.`)
        .addFields([
            {
                name: '📊 Removed',
                value: `${result.changes} channel restriction(s)`,
                inline: true
            }
        ])
        .setColor(0x0099FF)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
    logger.info(`All channel restrictions cleared in guild ${guildId} by ${interaction.user.tag}`);
}

/**
 * List current restrictions
 */
async function handleListRestrictions(interaction, database, logger) {
    const guildId = interaction.guild.id;
    
    let restrictions;
    try {
        restrictions = await database.all(`
            SELECT channel_id FROM server_settings 
            WHERE guild_id = ? AND setting_type = 'allowed_channel'
            ORDER BY created_at
        `, [guildId]);
    } catch (dbError) {
        logger.error('Database error in handleListRestrictions:', dbError);
        await interaction.reply({
            content: '❌ Database error occurred while fetching restrictions. Please try again later.',
            ephemeral: true
        });
        return;
    }
    
    let description;
    let color;
    
    if (restrictions.length === 0) {
        description = '🔓 **No channel restrictions active**\n\nBot commands are allowed in all channels where the bot has permissions.';
        color = 0x0099FF;
    } else {
        const channelList = [];
        for (const restriction of restrictions) {
            try {
                const channel = await interaction.client.channels.fetch(restriction.channel_id);
                channelList.push(`• ${channel} (${channel.name})`);
            } catch (error) {
                channelList.push(`• <#${restriction.channel_id}> (channel deleted)`);
            }
        }
        
        description = `🔒 **Bot commands restricted to ${restrictions.length} channel(s):**\n\n${channelList.join('\n')}`;
        color = 0xFF6B6B;
    }
    
    const embed = new EmbedBuilder()
        .setTitle('📍 Channel Restrictions')
        .setDescription(description)
        .addFields([
            {
                name: '🛠️ Management',
                value: '• Use `/restrict add` to add channels\n• Use `/restrict remove` to remove channels\n• Use `/restrict clear` to remove all restrictions',
                inline: false
            }
        ])
        .setColor(color)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Check if bot is allowed in current channel
 * @param {Object} interaction - Discord interaction
 * @param {Object} database - Database instance
 * @returns {boolean} - Whether bot is allowed
 */
async function isChannelAllowed(interaction, database) {
    try {
        if (!interaction.guild) return true; // Allow in DMs
        
        const guildId = interaction.guild.id;
        const channelId = interaction.channel.id;
        
        // Check if there are any restrictions for this guild
        const restrictions = await database.all(`
            SELECT channel_id FROM server_settings 
            WHERE guild_id = ? AND setting_type = 'allowed_channel'
        `, [guildId]);
        
        // If no restrictions, allow everywhere
        if (restrictions.length === 0) return true;
        
        // If restrictions exist, only allow in specified channels
        return restrictions.some(r => r.channel_id === channelId);
        
    } catch (error) {
        // If there's an error checking restrictions, default to allowing the command
        // This prevents database errors from completely blocking bot functionality
        console.error('Error checking channel restrictions:', error);
        return true;
    }
}

module.exports.isChannelAllowed = isChannelAllowed; 