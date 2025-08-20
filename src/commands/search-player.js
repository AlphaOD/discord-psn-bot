/**
 * Search Player Command - Find PSN Players by Username
 * 
 * Allows users to search for PlayStation Network players by username
 * to help find the correct username for linking or browsing
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PublicPSNApi = require('../utils/publicPsnApi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search-player')
        .setDescription('Search for PlayStation Network players by username')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Username or partial username to search for')
                .setRequired(true)
                .setMinLength(3)
                .setMaxLength(16)),
    
    async execute(interaction) {
        const logger = interaction.client.logger;
        const psnApi = new PublicPSNApi(logger);
        
        const query = interaction.options.getString('query');
        
        try {
            await interaction.deferReply();
            
            logger.info(`Searching for PSN players with query: ${query}`);
            
            // Search for players
            let searchResults;
            try {
                searchResults = await psnApi.searchUsers(query, 10);
            } catch (error) {
                logger.error('PSN search error:', error);
                
                const embed = new EmbedBuilder()
                    .setTitle('❌ Search Failed')
                    .setDescription('Failed to search PlayStation Network for players.')
                    .addFields([
                        {
                            name: '🔄 Try Again',
                            value: 'This could be a temporary issue with PlayStation Network. Please try again in a moment.'
                        },
                        {
                            name: '💡 Search Tips',
                            value: '• Use at least 3 characters\\n• Try different variations of the username\\n• PSN usernames are case-sensitive'
                        }
                    ])
                    .setColor('#FF4757');
                
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            
            // Check if no results found
            if (!searchResults || searchResults.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('🔍 No Players Found')
                    .setDescription(`No PlayStation Network players found matching: **${query}**`)
                    .addFields([
                        {
                            name: '💡 Search Tips',
                            value: '• Try a shorter or longer search term\\n• Check your spelling\\n• Use only letters, numbers, and basic symbols\\n• Some players may have private profiles'
                        },
                        {
                            name: '🔄 Other Options',
                            value: '• Try `/browse-player` with the exact username if you know it\\n• Ask the player for their exact PSN username\\n• Search with different variations'
                        }
                    ])
                    .setColor('#FFA502')
                    .setFooter({ text: 'PSN search results may be limited by privacy settings' });
                
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            
            // Create results embed
            const resultsEmbed = new EmbedBuilder()
                .setTitle('🔍 PSN Player Search Results')
                .setDescription(`Found **${searchResults.length}** player${searchResults.length === 1 ? '' : 's'} matching: **${query}**`)
                .setColor('#00D2FF');
            
            // Add each player as a field
            const playerFields = [];
            
            for (let i = 0; i < Math.min(searchResults.length, 10); i++) {
                const player = searchResults[i];
                
                // Add field for each player
                playerFields.push({
                    name: `${i + 1}. ${player.onlineId}`,
                    value: `**Account ID:** \`${player.accountId}\`\\n**Commands:** \`/browse-player ${player.onlineId}\` | \`/link ${player.onlineId}\``,
                    inline: false
                });
            }
            
            // Add fields in batches (Discord has a 25 field limit)
            const batchSize = 5;
            for (let i = 0; i < playerFields.length; i += batchSize) {
                const batch = playerFields.slice(i, i + batchSize);
                resultsEmbed.addFields(batch);
            }
            
            // Add helpful information
            resultsEmbed.addFields([
                {
                    name: '💡 How to Use These Results',
                    value: '• Click on a username to copy it\\n• Use `/browse-player [username]` to view their public profile\\n• Use `/link [username]` to link that account to your Discord\\n• Account IDs are shown for reference',
                    inline: false
                }
            ]);
            
            // Add limitations notice if we hit the limit
            if (searchResults.length >= 10) {
                resultsEmbed.addFields([
                    {
                        name: '📝 Note',
                        value: 'Showing first 10 results. Try a more specific search term if you don\'t see the player you\'re looking for.',
                        inline: false
                    }
                ]);
            }
            
            resultsEmbed.setFooter({ 
                text: `Search: "${query}" • Results from PlayStation Network`,
                iconURL: 'https://i.imgur.com/5J7RwaR.png' // PlayStation logo
            });
            
            await interaction.editReply({ embeds: [resultsEmbed] });
            
            logger.info(`Search for "${query}" returned ${searchResults.length} results`);
            
        } catch (error) {
            logger.error('Error in search-player command:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Unexpected Error')
                .setDescription('An unexpected error occurred while searching for players.')
                .addFields([
                    {
                        name: '🔧 What to do',
                        value: '• Please try the command again\\n• Try a different search term\\n• If the problem persists, contact a server administrator'
                    }
                ])
                .setColor('#FF4757')
                .setFooter({ text: 'Error has been logged for investigation' });
            
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
