/**
 * Re-register Discord Commands
 * 
 * Use this script to re-register slash commands after making changes
 * Run with: node re-register-commands.js
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

async function reRegisterCommands() {
    try {
        console.log('🔄 Re-registering Discord slash commands...\n');
        
        // Check if .env exists
        if (!fs.existsSync('.env')) {
            console.error('❌ .env file not found. Please run setup.js first.');
            return;
        }
        
        const token = process.env.DISCORD_TOKEN;
        const clientId = process.env.DISCORD_CLIENT_ID;
        
        if (!token || !clientId) {
            console.error('❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env file');
            return;
        }
        
        console.log(`📋 Bot Token: ${token.substring(0, 10)}...`);
        console.log(`🔑 Client ID: ${clientId}\n`);
        
        const rest = new REST({ version: '10' }).setToken(token);
        
        // Load commands
        const commands = [];
        const commandsPath = path.join(__dirname, 'src', 'commands');
        
        if (!fs.existsSync(commandsPath)) {
            console.error('❌ Commands directory not found:', commandsPath);
            return;
        }
        
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        console.log(`📁 Found ${commandFiles.length} command file(s):`);
        
        for (const file of commandFiles) {
            try {
                const command = require(path.join(commandsPath, file));
                const commandData = command.data.toJSON();
                commands.push(commandData);
                console.log(`  ✅ ${file} -> ${commandData.name}`);
            } catch (error) {
                console.error(`  ❌ ${file}: ${error.message}`);
            }
        }
        
        if (commands.length === 0) {
            console.error('❌ No valid commands found');
            return;
        }
        
        console.log(`\n🔄 Registering ${commands.length} command(s) with Discord...`);
        
        // Register commands
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );
        
        console.log('✅ Commands re-registered successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Wait a few minutes for Discord to update');
        console.log('2. Try the /link command again');
        console.log('3. If issues persist, check the bot logs');
        
    } catch (error) {
        console.error('❌ Failed to re-register commands:', error.message);
        
        if (error.code === 50035) {
            console.log('\n💡 Invalid Discord token. Please check your .env file.');
        } else if (error.code === 50013) {
            console.log('\n💡 Bot lacks permissions. Check bot permissions in Discord.');
        } else if (error.code === 50001) {
            console.log('\n💡 Bot not found. Check if the bot is running and the client ID is correct.');
        }
    }
}

// Run the re-registration
reRegisterCommands();
