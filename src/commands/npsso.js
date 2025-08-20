/**
 * NPSSO Command - Dedicated NPSSO Token Help
 * 
 * Provides focused help specifically for finding NPSSO tokens
 * with step-by-step troubleshooting
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('npsso')
        .setDescription('Get detailed help for finding your PlayStation NPSSO token'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔑 NPSSO Token - Complete Guide')
            .setDescription('**Having trouble finding your NPSSO token?** Follow this step-by-step guide:')
            .addFields([
                {
                    name: '🔄 Step 1: Ensure You\'re Properly Signed In',
                    value: '• Go to [my.playstation.com](https://my.playstation.com)\n' +
                           '• **Sign out completely** if already signed in\n' +
                           '• **Sign in fresh** with your PSN credentials\n' +
                           '• **Complete any 2FA/security prompts**\n' +
                           '• Make sure you see your PlayStation dashboard',
                    inline: false
                },
                {
                    name: '🔍 Step 2: Try Multiple PlayStation Sites',
                    value: 'If you don\'t see the cookie on my.playstation.com, try these:\n' +
                           '• [store.playstation.com](https://store.playstation.com)\n' +
                           '• [account.sonyentertainmentnetwork.com](https://account.sonyentertainmentnetwork.com)\n' +
                           '• [playstation.com](https://playstation.com) (main site)\n\n' +
                           '**Sign in to each site** and check for the cookie.',
                    inline: false
                },
                {
                    name: '🛠️ Step 3: Browser-Specific Instructions',
                    value: '**Chrome/Edge:**\n' +
                           'F12 → Application → Storage → Cookies → [site] → Find `npsso`\n\n' +
                           '**Firefox:**\n' +
                           'F12 → Storage → Cookies → [site] → Find `npsso`\n\n' +
                           '**Safari:**\n' +
                           'Develop → Web Inspector → Storage → Cookies → Find `npsso`',
                    inline: false
                },
                {
                    name: '💻 Step 4: JavaScript Method (Safest)',
                    value: '1. On any PlayStation site where you\'re signed in\n' +
                           '2. Press **F12** → **Console** tab\n' +
                           '3. Paste this code:\n' +
                           '```javascript\n' +
                           'let cookies = document.cookie.split(\';\');\n' +
                           'let npsso = cookies.find(c => c.trim().startsWith(\'npsso\'));\n' +
                           'if (npsso) {\n' +
                           '  console.log("Found NPSSO:", npsso.split(\'=\')[1].trim());\n' +
                           '} else {\n' +
                           '  console.log("No NPSSO cookie found. Try signing in again.");\n' +
                           '}\n' +
                           '```\n' +
                           '4. Press **Enter**',
                    inline: false
                },
                {
                    name: '🔧 Step 5: Still Not Working? Try These',
                    value: '• **Use incognito/private browsing** - sign in fresh\n' +
                           '• **Clear all browser cache** and cookies\n' +
                           '• **Try a different browser** entirely\n' +
                           '• **Check PlayStation Network status** - might be down\n' +
                           '• **Wait 15-30 minutes** and try again\n' +
                           '• **Try from a different device** (phone, tablet)',
                    inline: false
                },
                {
                    name: '✅ What Your Token Should Look Like',
                    value: '• **Exactly 64 characters** long\n' +
                           '• Mix of letters and numbers (alphanumeric)\n' +
                           '• Example format: `abc123def456...` (64 chars total)\n' +
                           '• **No spaces, quotes, or special characters**',
                    inline: false
                },
                {
                    name: '🆘 Last Resort Options',
                    value: '• Try signing in on **PlayStation mobile app** first, then web\n' +
                           '• Create a **new PlayStation account** temporarily to test\n' +
                           '• Ask a friend to check if they can find their token\n' +
                           '• Contact PlayStation support if account issues persist',
                    inline: false
                }
            ])
            .setColor(0x0066CC)
            .setFooter({ text: 'Still having trouble? Use /help for more general assistance' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], flags: 64 }); // Ephemeral
    }
};
