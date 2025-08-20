/**
 * Help Command - Comprehensive Bot Help and Instructions
 * 
 * Provides detailed help information including PSN linking instructions
 * and all available commands
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help and instructions for using the PSN Bot')
        .addStringOption(option =>
            option.setName('topic')
                .setDescription('Specific help topic')
                .setRequired(false)
                .addChoices(
                    { name: 'Getting Started', value: 'getting-started' },
                    { name: 'PSN Linking', value: 'psn-linking' },
                    { name: 'NPSSO Token', value: 'npsso-token' },
                    { name: 'Commands', value: 'commands' },
                    { name: 'Notifications', value: 'notifications' },
                    { name: 'Troubleshooting', value: 'troubleshooting' }
                )
        ),
    
    async execute(interaction) {
        const topic = interaction.options.getString('topic') || 'overview';
        
        let embed;
        
        switch (topic) {
            case 'getting-started':
                embed = createGettingStartedEmbed();
                break;
            case 'psn-linking':
                embed = createPSNLinkingEmbed();
                break;
            case 'npsso-token':
                embed = createNPSSOTokenEmbed();
                break;
            case 'commands':
                embed = createCommandsEmbed();
                break;
            case 'notifications':
                embed = createNotificationsEmbed();
                break;
            case 'troubleshooting':
                embed = createTroubleshootingEmbed();
                break;
            default:
                embed = createOverviewEmbed();
        }
        
        await interaction.reply({ embeds: [embed], flags: 64 }); // Ephemeral
    }
};

function createOverviewEmbed() {
    return new EmbedBuilder()
        .setTitle('🎮 Discord PSN Bot Help')
        .setDescription('Welcome to the PlayStation Network Discord Bot! I help track your PSN trophies and send notifications.')
        .addFields([
            {
                name: '🚀 Quick Start',
                value: '1. Use `/link` to connect your PSN account\n2. Use `/channel set #channel` to set notifications\n3. Start earning trophies!',
                inline: false
            },
            {
                name: '📚 Help Topics',
                value: 'Use `/help topic:` to get specific help:\n' +
                       '• `getting-started` - First time setup\n' +
                       '• `psn-linking` - How to link your PSN account\n' +
                       '• `npsso-token` - How to get your NPSSO token\n' +
                       '• `commands` - All available commands\n' +
                       '• `notifications` - Set up trophy notifications\n' +
                       '• `troubleshooting` - Fix common issues',
                inline: false
            },
            {
                name: '🏆 Features',
                value: '• Automatic trophy tracking\n• Real-time notifications\n• Trophy statistics\n• Platinum celebrations\n• Multi-server support',
                inline: false
            }
        ])
        .setColor(0x0099FF)
        .setFooter({ text: 'Need more help? Use /help with a specific topic!' })
        .setTimestamp();
}

function createGettingStartedEmbed() {
    return new EmbedBuilder()
        .setTitle('🚀 Getting Started with PSN Bot')
        .setDescription('Follow these steps to set up trophy tracking for your PlayStation account.')
        .addFields([
            {
                name: 'Step 1: Link Your PSN Account',
                value: '• Use `/link` command\n• Click "Start Linking Process"\n• Follow the modal instructions',
                inline: false
            },
            {
                name: 'Step 2: Get Your NPSSO Token',
                value: '• Go to [my.playstation.com](https://my.playstation.com)\n• Open browser developer tools\n• Find the `npsso` cookie\n• Use `/help topic:npsso-token` for detailed instructions',
                inline: false
            },
            {
                name: 'Step 3: Set Up Notifications',
                value: '• Use `/channel set #your-channel` to set where notifications go\n• Optionally use `/restrict add #bot-channel` to limit bot usage',
                inline: false
            },
            {
                name: 'Step 4: Start Gaming!',
                value: '• The bot checks for new trophies every 30 minutes\n• Use `/check` for manual trophy checks\n• Use `/profile` to view your statistics',
                inline: false
            }
        ])
        .setColor(0x00FF00)
        .setFooter({ text: 'Having trouble? Use /help topic:troubleshooting' })
        .setTimestamp();
}

function createPSNLinkingEmbed() {
    return new EmbedBuilder()
        .setTitle('🔗 Linking Your PlayStation Network Account')
        .setDescription('Connect your PSN account to enable trophy tracking and notifications.')
        .addFields([
            {
                name: '📋 Requirements',
                value: '• Valid PlayStation Network account\n• NPSSO authentication token\n• PSN privacy settings allowing trophy visibility',
                inline: false
            },
            {
                name: '🔒 Privacy & Security',
                value: '• Your token is encrypted and stored securely\n• We only access publicly visible trophy data\n• You can unlink anytime with `/unlink`',
                inline: false
            },
            {
                name: '📝 Linking Process',
                value: '1. Use `/link` command\n2. Click "Start Linking Process"\n3. Enter your NPSSO token in the modal\n4. Wait for confirmation',
                inline: false
            },
            {
                name: '❓ Need Your NPSSO Token?',
                value: 'Use `/help topic:npsso-token` for step-by-step instructions on finding your token.',
                inline: false
            }
        ])
        .setColor(0xFF9900)
        .setFooter({ text: 'Your account data is secure and encrypted' })
        .setTimestamp();
}

function createNPSSOTokenEmbed() {
    return new EmbedBuilder()
        .setTitle('🔑 How to Get Your NPSSO Token')
        .setDescription('Your NPSSO token is required to authenticate with PlayStation Network. Follow these browser-specific instructions:')
        .addFields([
            {
                name: '🌐 Method 1: Chrome/Edge/Most Browsers',
                value: '**IMPORTANT:** NPSSO cookies aren\'t on all pages! Try these URLs:\n' +
                       '1. Go to **[my.playstation.com/profile](https://my.playstation.com/profile)** ⭐ and **sign in**\n' +
                       '2. Press **F12** to open Developer Tools\n' +
                       '3. Go to **Application** tab → **Storage** → **Cookies** → **my.playstation.com**\n' +
                       '4. Find the cookie named `npsso`\n' +
                       '5. **If not found**, try [account.sonyentertainmentnetwork.com](https://account.sonyentertainmentnetwork.com)\n' +
                       '6. Copy the 64-character value',
                inline: false
            },
            {
                name: '🦊 Method 2: Firefox',
                value: '1. Go to [my.playstation.com](https://my.playstation.com) and **sign in**\n' +
                       '2. Press **F12** → **Storage** tab\n' +
                       '3. **Cookies** → **my.playstation.com**\n' +
                       '4. Find `npsso` and copy its value',
                inline: false
            },
            {
                name: '🧑‍💻 Method 3: JavaScript Console (Any Browser)',
                value: '1. Go to [my.playstation.com](https://my.playstation.com) and **sign in**\n' +
                       '2. Press **F12** → **Console** tab\n' +
                       '3. Paste this safe code:\n' +
                       '```javascript\n' +
                       'let cookies = document.cookie.split(\';\');\n' +
                       'let npsso = cookies.find(c => c.trim().startsWith(\'npsso\'));\n' +
                       'npsso ? npsso.split(\'=\')[1].trim() : "NPSSO cookie not found!"\n' +
                       '```\n' +
                       '4. Press **Enter** - your token will appear (or error message)',
                inline: false
            },
            {
                name: '⚠️ Important Notes',
                value: '• Token must be exactly **64 characters**\n• Keep your token **private and secure**\n• Tokens expire - you may need to get a new one occasionally\n• Make sure you\'re signed into the **correct PSN account**',
                inline: false
            },
            {
                name: '🔍 Can\'t Find the Cookie?',
                value: '• Make sure you\'re **fully signed in** to PlayStation\n• **Complete your sign-in process** - check if any 2FA prompts\n• Try refreshing the page after signing in\n• **Clear browser cache** and sign in fresh\n• Try **different PlayStation pages** like:\n  - [store.playstation.com](https://store.playstation.com)\n  - [account.sonyentertainmentnetwork.com](https://account.sonyentertainmentnetwork.com)\n• Use **incognito/private browsing** and sign in fresh\n• Try a **different browser**',
                inline: false
            }
        ])
        .setColor(0xFF3300)
        .setFooter({ text: 'Need more help? Contact support or try the troubleshooting guide' })
        .setTimestamp();
}

function createCommandsEmbed() {
    return new EmbedBuilder()
        .setTitle('🤖 Available Commands')
        .setDescription('Here are all the commands you can use with the PSN Bot:')
        .addFields([
            {
                name: '🔗 Account Management',
                value: '`/link` - Link your PSN account\n`/unlink` - Unlink your PSN account\n`/profile [user]` - View trophy profile and statistics',
                inline: false
            },
            {
                name: '🏆 Trophy Commands',
                value: '`/check` - Manually check for new trophies\n`/recent [user]` - Show recent trophies\n`/stats [user]` - Detailed trophy statistics',
                inline: false
            },
            {
                name: '🔔 Notification Setup',
                value: '`/channel set #channel` - Set notification channel\n`/channel remove` - Remove notification channel\n`/channel info` - View current settings',
                inline: false
            },
            {
                name: '🛡️ Server Management (Admin Only)',
                value: '`/restrict add #channel` - Restrict bot to specific channels\n`/restrict remove #channel` - Remove channel restriction\n`/restrict list` - List restricted channels\n`/restrict clear` - Remove all restrictions',
                inline: false
            },
            {
                name: '❓ Help & Support',
                value: '`/help` - This help menu\n`/help topic:` - Specific help topics\n`/status` - Bot status and information',
                inline: false
            }
        ])
        .setColor(0x9966CC)
        .setFooter({ text: 'Commands marked (Admin Only) require server management permissions' })
        .setTimestamp();
}

function createNotificationsEmbed() {
    return new EmbedBuilder()
        .setTitle('🔔 Setting Up Trophy Notifications')
        .setDescription('Configure where and how you receive trophy notifications.')
        .addFields([
            {
                name: '📍 Setting Notification Channel',
                value: '1. Use `/channel set #your-channel`\n2. Make sure the bot has permission to send messages\n3. Test with `/check` command',
                inline: false
            },
            {
                name: '🏆 What Gets Notified',
                value: '• New trophy achievements\n• **Special celebrations** for Platinum trophies\n• Batch notifications for multiple trophies\n• Trophy milestones and achievements',
                inline: false
            },
            {
                name: '⏰ Notification Timing',
                value: '• Automatic checks every **30 minutes**\n• Manual checks with `/check` command\n• Real-time when trophies are detected',
                inline: false
            },
            {
                name: '🎛️ Customization Options',
                value: '• Set different channels per server\n• Restrict bot usage to specific channels\n• Enable/disable notifications per user',
                inline: false
            },
            {
                name: '🔧 Troubleshooting Notifications',
                value: '• Check bot permissions in the channel\n• Verify notification channel is set\n• Ensure your PSN account is linked\n• Use `/channel info` to check settings',
                inline: false
            }
        ])
        .setColor(0xFFCC00)
        .setFooter({ text: 'Notifications work across multiple Discord servers!' })
        .setTimestamp();
}

function createTroubleshootingEmbed() {
    return new EmbedBuilder()
        .setTitle('🔧 Troubleshooting Common Issues')
        .setDescription('Solutions for the most common problems with the PSN Bot.')
        .addFields([
            {
                name: '❌ "PSN linking fails"',
                value: '• Verify NPSSO token is exactly 64 characters\n• Check PSN privacy settings allow trophy visibility\n• Use a fresh token (they expire)\n• Make sure you\'re signed into the correct PSN account',
                inline: false
            },
            {
                name: '🚫 "No trophy notifications"',
                value: '• Verify notification channel is set (`/channel info`)\n• Check bot has permission to send messages\n• Ensure trophy tracking is enabled\n• Try manual check with `/check`',
                inline: false
            },
            {
                name: '🔍 "Can\'t find NPSSO cookie" (Even when signed in)',
                value: '**NPSSO cookies aren\'t created on all PlayStation pages!** Try these specific URLs:\n' +
                       '• **[my.playstation.com/profile](https://my.playstation.com/profile)** ⭐ **Best option**\n' +
                       '• **[account.sonyentertainmentnetwork.com](https://account.sonyentertainmentnetwork.com)** ⭐\n' +
                       '• [store.playstation.com/cart](https://store.playstation.com/cart)\n' +
                       '• [web.np.playstation.com](https://web.np.playstation.com)\n\n' +
                       '**Other fixes:**\n' +
                       '• Sign in to PlayStation mobile app FIRST, then web\n' +
                       '• Use completely different browser\n' +
                       '• Use `/npsso` command for complete troubleshooting',
                inline: false
            },
            {
                name: '⏱️ "Commands are slow/timing out"',
                value: '• PlayStation Network might be slow\n• Try again in a few minutes\n• Check if PSN is experiencing issues\n• Use `/status` to check bot health',
                inline: false
            },
            {
                name: '🔒 "Authentication expired"',
                value: '• Your PSN token has expired\n• Use `/link` to re-authenticate\n• Get a fresh NPSSO token\n• This is normal and happens periodically',
                inline: false
            },
            {
                name: '💡 Still Need Help?',
                value: '• Check the full documentation\n• Contact server administrators\n• Report bugs on GitHub\n• Join our support Discord',
                inline: false
            }
        ])
        .setColor(0xFF6600)
        .setFooter({ text: 'Most issues are resolved by re-linking your PSN account' })
        .setTimestamp();
}
