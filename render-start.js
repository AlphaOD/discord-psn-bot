/**
 * Render Deployment Startup Script
 * 
 * This script handles Render-specific startup requirements and debugging
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Discord PSN Bot on Render...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || '3000');
console.log('Working Directory:', process.cwd());

// Enhanced environment validation
function validateEnvironment() {
    console.log('\n🔐 Validating environment variables...');
    
    const requiredVars = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:', missing);
        console.error('Please set these in your Render dashboard environment variables.');
        process.exit(1);
    }
    
    // Log available Discord environment variables (without exposing sensitive data)
    const discordVars = Object.keys(process.env)
        .filter(key => key.startsWith('DISCORD'))
        .map(key => {
            const value = key.includes('TOKEN') 
                ? process.env[key].substring(0, 10) + '...'
                : process.env[key];
            return `${key}: ${value}`;
        });
    
    console.log('✅ Environment variables validated:');
    discordVars.forEach(varInfo => console.log(`  ${varInfo}`));
}

// Ensure required directories exist
function setupDirectories() {
    console.log('\n📁 Setting up directories...');
    
    const directories = [
        process.env.DATABASE_PATH ? path.dirname(process.env.DATABASE_PATH) : './data',
        './logs'
    ];
    
    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            console.log(`📁 Creating directory: ${dir}`);
            fs.mkdirSync(dir, { recursive: true });
        } else {
            console.log(`✅ Directory exists: ${dir}`);
        }
    });
}

// Check file permissions and accessibility
function checkFileSystem() {
    console.log('\n📋 Checking file system...');
    
    const criticalFiles = [
        'package.json',
        'index.js',
        'src/database/database.js',
        'src/events/ready.js',
        'src/events/interactionCreate.js'
    ];
    
    criticalFiles.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`✅ ${file}`);
        } else {
            console.error(`❌ Missing critical file: ${file}`);
            process.exit(1);
        }
    });
    
    // Check write permissions for data and logs
    const dbPath = process.env.DATABASE_PATH || './data/bot.db';
    const dataDir = path.dirname(dbPath);
    
    try {
        const testFile = path.join(dataDir, 'write-test.tmp');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log(`✅ Write permissions OK for: ${dataDir}`);
    } catch (error) {
        console.error(`❌ No write permissions for: ${dataDir}`);
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Test database connectivity
async function testDatabase() {
    console.log('\n🗄️  Testing database connectivity...');
    
    try {
        const Database = require('./src/database/database');
        await Database.init();
        console.log('✅ Database initialization successful');
        
        // Test a simple query
        const result = await Database.get('SELECT 1 as test');
        if (result && result.test === 1) {
            console.log('✅ Database query test successful');
        } else {
            throw new Error('Database query returned unexpected result');
        }
        
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        console.error('This might cause bot startup issues.');
        // Don't exit here, let the main app handle database errors
    }
}

// Main startup sequence
async function startup() {
    try {
        validateEnvironment();
        setupDirectories();
        checkFileSystem();
        await testDatabase();
        
        console.log('\n🎉 Pre-flight checks complete! Starting main application...\n');
        
        // Start the main application
        require('./index.js');
        
    } catch (error) {
        console.error('\n❌ Startup failed:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Log environment info for debugging
        console.log('\n🔍 Debug Information:');
        console.log('Node.js version:', process.version);
        console.log('Platform:', process.platform);
        console.log('Architecture:', process.arch);
        console.log('Memory usage:', process.memoryUsage());
        
        process.exit(1);
    }
}

// Handle uncaught errors during startup
process.on('uncaughtException', (error) => {
    console.error('\n💥 Uncaught exception during startup:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n💥 Unhandled rejection during startup:', reason);
    console.error('Promise:', promise);
    process.exit(1);
});

// Start the application
startup();
