/**
 * Browse Player Command - View Any PSN Player's Public Profile
 * 
 * Allows anyone to view public trophy information for any PSN player
 * without requiring authentication or linking
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PublicPSNApi = require('../utils/publicPsnApi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('browse-player')
        .setDescription('View public trophy information for any PlayStation Network player')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('PlayStation Network username to look up')
                .setRequired(true)
                .setMaxLength(16)
                .setMinLength(3)),
    
    async execute(interaction) {
        const logger = interaction.client.logger;
        const psnApi = new PublicPSNApi(logger);
        
        const username = interaction.options.getString('username');
        
        try {
            await interaction.deferReply();
            
            // Validate and get PSN account info
            logger.info(`Looking up public PSN profile for: ${username}`);
            
            let accountData;
            try {
                accountData = await psnApi.validateUsername(username);
                
                if (!accountData) {
                    const embed = new EmbedBuilder()
                        .setTitle('❌ PSN Player Not Found')
                        .setDescription(`Could not find a PlayStation Network player with username: **${username}**`)
                        .addFields([
                            {
                                name: '🔍 Search Tips',
                                value: '• PSN usernames are case-sensitive\\n• Check for typos in the username\\n• Make sure the player has a public profile\\n• Try using `/search-player` for similar usernames'
                            }
                        ])
                        .setColor('#FF4757')
                        .setFooter({ text: 'Only public PSN profiles can be viewed' });
                    
                    await interaction.editReply({ embeds: [embed] });
                    return;
                }
            } catch (error) {
                logger.error('Error validating username:', error);
                
                const embed = new EmbedBuilder()
                    .setTitle('❌ PSN Lookup Failed')
                    .setDescription('Failed to look up the PlayStation Network player.')
                    .addFields([
                        {
                            name: '🔄 Try Again',
                            value: 'This could be a temporary issue. Please try again in a moment.'
                        }
                    ])
                    .setColor('#FF4757');
                
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            
            // Get detailed trophy statistics
            let trophyStats;
            try {
                trophyStats = await psnApi.getDetailedTrophyStats(accountData.accountId);
            } catch (error) {
                logger.warn(`Could not retrieve detailed stats for ${username}:`, error.message);
                
                // Try basic trophy summary instead
                try {
                    trophyStats = await psnApi.getUserTrophySummary(accountData.accountId);
                } catch (summaryError) {
                    logger.error('Could not retrieve any trophy data:', summaryError.message);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('🔒 Profile Not Accessible')
                        .setDescription(`**${accountData.onlineId}**'s trophy information is not publicly accessible.`)
                        .addFields([
                            {
                                name: 'ℹ️ Why can\'t I see their trophies?',
                                value: 'The player may have privacy settings that restrict public access to their trophy information.'
                            },
                            {
                                name: '✅ What you can still do',
                                value: '• The player exists and has a valid PSN account\\n• They can link their account using `/link` if they want to share their trophies\\n• You can try again later as privacy settings may change'
                            }
                        ])
                        .setThumbnail(accountData.avatarUrl)
                        .setColor('#FFA502')
                        .setFooter({ text: 'Player found but trophy data is private' });
                    
                    await interaction.editReply({ embeds: [embed] });
                    return;
                }
            }
            
            // Create profile embed
            const profileEmbed = new EmbedBuilder()
                .setTitle(`🎮 ${accountData.onlineId}`)
                .setDescription('**PlayStation Network Public Profile**')
                .setThumbnail(accountData.avatarUrl)
                .addFields([
                    {
                        name: '🏆 Trophy Level',
                        value: `**${trophyStats.trophyLevel}**`,
                        inline: true
                    },
                    {
                        name: '📊 Progress',
                        value: `${trophyStats.progress || 0}%`,
                        inline: true
                    },
                    {
                        name: '⭐ Tier',
                        value: `${trophyStats.tier || 'N/A'}`,
                        inline: true
                    }
                ])
                .setColor('#00D2FF');
            
            // Add trophy counts
            const trophyCounts = trophyStats.earnedTrophies || {};
            profileEmbed.addFields([
                {
                    name: '🏅 Trophy Collection',
                    value: `🥇 **${trophyCounts.platinum || 0}** Platinum\\n🥈 **${trophyCounts.gold || 0}** Gold\\n🥉 **${trophyCounts.silver || 0}** Silver\\n🎖️ **${trophyCounts.bronze || 0}** Bronze`,
                    inline: true
                }
            ]);
            
            // Add game statistics if available
            if (trophyStats.gameStats) {
                const gameStats = trophyStats.gameStats;
                profileEmbed.addFields([
                    {
                        name: '🎮 Gaming Stats',
                        value: `**Games Played:** ${gameStats.totalGames}\\n**Completed:** ${gameStats.completedGames}\\n**With Platinum:** ${gameStats.gamesWithPlatinum}\\n**Avg. Completion:** ${gameStats.averageCompletion}%`,
                        inline: true
                    }
                ]);
                
                // Add recent games if available
                if (gameStats.recentGames && gameStats.recentGames.length > 0) {
                    const recentGamesText = gameStats.recentGames
                        .slice(0, 3)
                        .map(game => `• **${game.trophyTitleName}** (${game.progress}%)`)
                        .join('\\n');
                    
                    if (recentGamesText) {
                        profileEmbed.addFields([
                            {
                                name: '🕹️ Recent Games',
                                value: recentGamesText,
                                inline: false
                            }
                        ]);
                    }
                }
            }
            
            // Add account info
            profileEmbed.addFields([
                {
                    name: '🔗 Account Info',
                    value: `**Account ID:** \`${accountData.accountId}\`\\n**Last Updated:** ${trophyStats.lastUpdatedDateTime ? `<t:${Math.floor(new Date(trophyStats.lastUpdatedDateTime).getTime() / 1000)}:R>` : 'Unknown'}`,
                    inline: false
                }
            ]);
            
            // Add helpful actions
            profileEmbed.addFields([
                {
                    name: '💡 More Actions',
                    value: '• Use `/browse-game` to explore specific game trophies\\n• Use `/link` to link your own PSN account\\n• Use `/search-player` to find similar usernames',
                    inline: false
                }
            ]);
            
            profileEmbed.setFooter({ 
                text: `Public PSN profile • Data from PlayStation Network`,
                iconURL: 'https://i.imgur.com/5J7RwaR.png' // PlayStation logo
            });
            
            await interaction.editReply({ embeds: [profileEmbed] });
            
            logger.info(`Successfully displayed profile for ${accountData.onlineId} (Level ${trophyStats.trophyLevel})`);
            
        } catch (error) {
            logger.error('Error in browse-player command:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Unexpected Error')
                .setDescription('An unexpected error occurred while looking up the player profile.')
                .addFields([
                    {
                        name: '🔧 What to do',
                        value: '• Please try the command again\\n• If the problem persists, contact a server administrator\\n• Check `/help` for more information'
                    }
                ])
                .setColor('#FF4757')
                .setFooter({ text: 'Error has been logged for investigation' });
            
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
