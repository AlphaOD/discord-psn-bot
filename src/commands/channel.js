/**
 * Channel Command - Set Trophy Notification Channel
 * 
 * Allows server administrators to set which channel receives
 * trophy notifications and restrict bot usage to specific channels
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Configure trophy notification channels')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set the channel for trophy notifications')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to receive trophy notifications')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove trophy notifications from this server')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Show current notification channel settings')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        const database = interaction.client.database;
        const logger = interaction.client.logger;
        const subcommand = interaction.options.getSubcommand();
        
        // Check if user has PSN account linked
        const userData = await database.getUser(interaction.user.id);
        if (!userData || !userData.psn_username) {
            await interaction.reply({
                content: '❌ You need to link your PSN account first using `/link`',
                ephemeral: true
            });
            return;
        }
        
        try {
            switch (subcommand) {
                case 'set':
                    await handleSetChannel(interaction, database, logger);
                    break;
                case 'remove':
                    await handleRemoveChannel(interaction, database, logger);
                    break;
                case 'info':
                    await handleChannelInfo(interaction, database, logger);
                    break;
            }
        } catch (error) {
            logger.error('Error in channel command:', error);
            await interaction.reply({
                content: '❌ An error occurred while configuring channels.',
                ephemeral: true
            });
        }
    }
};

/**
 * Set notification channel
 */
async function handleSetChannel(interaction, database, logger) {
    const channel = interaction.options.getChannel('channel');
    const userId = interaction.user.id;
    
    // Verify bot can send messages in the channel
    if (!channel.permissionsFor(interaction.client.user).has(['SendMessages', 'EmbedLinks'])) {
        await interaction.reply({
            content: `❌ I don't have permission to send messages in ${channel}. Please ensure I have "Send Messages" and "Embed Links" permissions.`,
            ephemeral: true
        });
        return;
    }
    
    // Save notification settings
    await database.run(`
        INSERT OR REPLACE INTO notification_settings 
        (discord_id, trophy_notifications, platinum_notifications, channel_id)
        VALUES (?, 1, 1, ?)
    `, [userId, channel.id]);
    
    const embed = new EmbedBuilder()
        .setTitle('✅ Notification Channel Set')
        .setDescription(`Trophy notifications will now be sent to ${channel}`)
        .addFields([
            {
                name: '📋 Settings',
                value: `
                    🏆 **Trophy Notifications:** ✅ Enabled
                    🏅 **Platinum Celebrations:** ✅ Enabled
                    📍 **Channel:** ${channel}
                `,
                inline: false
            },
            {
                name: '🎮 What happens next?',
                value: 'New trophies will automatically appear in this channel when detected!',
                inline: false
            }
        ])
        .setColor(0x00FF00)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
    // Send a test message to the channel
    const testEmbed = new EmbedBuilder()
        .setTitle('🎮 Trophy Notifications Configured')
        .setDescription(`${interaction.user} has set this channel to receive PlayStation trophy notifications!`)
        .setColor(0x0099FF)
        .setTimestamp();
    
    await channel.send({ embeds: [testEmbed] });
    
    logger.info(`Channel ${channel.id} set for trophy notifications by ${interaction.user.tag}`);
}

/**
 * Remove notification channel
 */
async function handleRemoveChannel(interaction, database, logger) {
    const userId = interaction.user.id;
    
    await database.run(`
        UPDATE notification_settings 
        SET channel_id = NULL, trophy_notifications = 0, platinum_notifications = 0
        WHERE discord_id = ?
    `, [userId]);
    
    const embed = new EmbedBuilder()
        .setTitle('❌ Notifications Disabled')
        .setDescription('Trophy notifications have been disabled for this server.')
        .addFields([
            {
                name: '📝 Note',
                value: 'You can re-enable notifications anytime using `/channel set`',
                inline: false
            }
        ])
        .setColor(0xFF6B6B)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
    logger.info(`Trophy notifications disabled by ${interaction.user.tag}`);
}

/**
 * Show channel info
 */
async function handleChannelInfo(interaction, database, logger) {
    const userId = interaction.user.id;
    
    const settings = await database.get(`
        SELECT * FROM notification_settings WHERE discord_id = ?
    `, [userId]);
    
    let channelInfo = 'Not configured';
    let statusColor = 0xFF6B6B;
    
    if (settings && settings.channel_id) {
        try {
            const channel = await interaction.client.channels.fetch(settings.channel_id);
            channelInfo = `${channel} (${channel.name})`;
            statusColor = 0x00FF00;
        } catch (error) {
            channelInfo = 'Channel not found (may have been deleted)';
            statusColor = 0xFFB347;
        }
    }
    
    const embed = new EmbedBuilder()
        .setTitle('📍 Notification Channel Settings')
        .setDescription(`Current trophy notification configuration for ${interaction.user}`)
        .addFields([
            {
                name: '📍 Notification Channel',
                value: channelInfo,
                inline: false
            },
            {
                name: '🏆 Trophy Notifications',
                value: settings?.trophy_notifications ? '✅ Enabled' : '❌ Disabled',
                inline: true
            },
            {
                name: '🏅 Platinum Celebrations',
                value: settings?.platinum_notifications ? '✅ Enabled' : '❌ Disabled',
                inline: true
            }
        ])
        .setColor(statusColor)
        .setTimestamp()
        .setFooter({ text: 'Use /channel set to configure notifications' });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
} 