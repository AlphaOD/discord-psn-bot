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
                    name: '🔄 Step 1: Force NPSSO Cookie Creation',
                    value: '**The NPSSO cookie isn\'t always created on all pages!** Try these specific URLs:\n' +
                           '• [**my.playstation.com/profile**](https://my.playstation.com/profile) ⭐ **Best option**\n' +
                           '• [**account.sonyentertainmentnetwork.com**](https://account.sonyentertainmentnetwork.com) ⭐\n' +
                           '• [**store.playstation.com/cart**](https://store.playstation.com/cart)\n' +
                           '• [**web.np.playstation.com**](https://web.np.playstation.com)\n\n' +
                           '**Sign in to each URL** until you find the NPSSO cookie!',
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
                    name: '💻 Step 4: Enhanced JavaScript Method',
                    value: '1. Go to [**my.playstation.com/profile**](https://my.playstation.com/profile)\n' +
                           '2. Press **F12** → **Console** tab\n' +
                           '3. Paste this enhanced code:\n' +
                           '```javascript\n' +
                           'console.log("=== PlayStation Cookie Checker ===");\n' +
                           'let cookies = document.cookie.split(\';\');\n' +
                           'let npsso = cookies.find(c => c.trim().startsWith(\'npsso\'));\n' +
                           'let signedIn = cookies.find(c => c.trim().startsWith(\'isSignedIn\'));\n' +
                           'console.log("Signed in:", signedIn ? "YES" : "NO");\n' +
                           'console.log("Total cookies:", cookies.length);\n' +
                           'if (npsso) {\n' +
                           '  console.log("✅ NPSSO Found:", npsso.split(\'=\')[1].trim());\n' +
                           '} else {\n' +
                           '  console.log("❌ NPSSO not found. Try these URLs:");\n' +
                           '  console.log("• my.playstation.com/profile");\n' +
                           '  console.log("• account.sonyentertainmentnetwork.com");\n' +
                           '}\n' +
                           '```\n' +
                           '4. Press **Enter** and follow the suggestions',
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
                    value: '• **Method A: Mobile App + Web Combo**\n' +
                           '  1. Sign in to PlayStation mobile app\n' +
                           '  2. Then go to [my.playstation.com/profile](https://my.playstation.com/profile)\n' +
                           '  3. Check cookies again\n\n' +
                           '• **Method B: Fresh Browser**\n' +
                           '  1. Use completely different browser\n' +
                           '  2. Clear all data/cookies\n' +
                           '  3. Go to [account.sonyentertainmentnetwork.com](https://account.sonyentertainmentnetwork.com)\n' +
                           '  4. Sign in fresh\n\n' +
                           '• **Method C: Desktop App**\n' +
                           '  1. Install PlayStation App for Windows/Mac\n' +
                           '  2. Sign in there first\n' +
                           '  3. Then try web browser',
                    inline: false
                }
            ])
            .setColor(0x0066CC)
            .setFooter({ text: 'Still having trouble? Use /help for more general assistance' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], flags: 64 }); // Ephemeral
    }
};
