/**
 * Health Check Script for Render Deployment
 * 
 * This script helps debug startup issues by checking all prerequisites
 * before the main bot starts. Run this to diagnose problems.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔍 Discord PSN Bot Health Check\n');

// Check Node.js version
console.log('📋 Environment Check:');
console.log(`  Node.js version: ${process.version}`);
console.log(`  Platform: ${process.platform}`);
console.log(`  Working directory: ${process.cwd()}`);
console.log();

// Check required environment variables
console.log('🔐 Environment Variables:');
const requiredEnvVars = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];
const optionalEnvVars = ['DATABASE_PATH', 'LOG_LEVEL', 'PORT'];

let envIssues = 0;

requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
        const value = envVar.includes('TOKEN') 
            ? process.env[envVar].substring(0, 10) + '...' 
            : process.env[envVar];
        console.log(`  ✅ ${envVar}: ${value}`);
    } else {
        console.log(`  ❌ ${envVar}: MISSING (REQUIRED)`);
        envIssues++;
    }
});

optionalEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
        console.log(`  ✅ ${envVar}: ${process.env[envVar]}`);
    } else {
        console.log(`  ⚠️  ${envVar}: Not set (optional)`);
    }
});

console.log();

// Check file structure
console.log('📁 File Structure:');
const criticalPaths = [
    'src/',
    'src/commands/',
    'src/events/',
    'src/utils/',
    'src/database/',
    'package.json',
    'index.js'
];

let fileIssues = 0;

criticalPaths.forEach(pathToCheck => {
    if (fs.existsSync(pathToCheck)) {
        console.log(`  ✅ ${pathToCheck}`);
    } else {
        console.log(`  ❌ ${pathToCheck}: MISSING`);
        fileIssues++;
    }
});

console.log();

// Check data directory
console.log('🗄️  Database Setup:');
const dbPath = process.env.DATABASE_PATH || './data/bot.db';
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
    console.log(`  ⚠️  Data directory doesn't exist, creating: ${dataDir}`);
    try {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`  ✅ Created data directory: ${dataDir}`);
    } catch (error) {
        console.log(`  ❌ Failed to create data directory: ${error.message}`);
        fileIssues++;
    }
} else {
    console.log(`  ✅ Data directory exists: ${dataDir}`);
}

// Check logs directory
const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
    console.log(`  ⚠️  Logs directory doesn't exist, creating: ${logsDir}`);
    try {
        fs.mkdirSync(logsDir, { recursive: true });
        console.log(`  ✅ Created logs directory: ${logsDir}`);
    } catch (error) {
        console.log(`  ❌ Failed to create logs directory: ${error.message}`);
        fileIssues++;
    }
} else {
    console.log(`  ✅ Logs directory exists: ${logsDir}`);
}

console.log();

// Check dependencies
console.log('📦 Dependencies:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});
    
    console.log(`  ✅ Production dependencies: ${dependencies.length}`);
    console.log(`  ✅ Dev dependencies: ${devDependencies.length}`);
    
    // Check if node_modules exists
    if (fs.existsSync('node_modules')) {
        console.log(`  ✅ node_modules directory exists`);
    } else {
        console.log(`  ❌ node_modules directory missing - run 'npm install'`);
        fileIssues++;
    }
} catch (error) {
    console.log(`  ❌ Error reading package.json: ${error.message}`);
    fileIssues++;
}

console.log();

// Test database connection
console.log('🔗 Database Connection Test:');
try {
    const Database = require('./src/database/database');
    Database.init().then(() => {
        console.log('  ✅ Database connection successful');
        
        // Test basic query
        Database.get('SELECT 1 as test').then((result) => {
            console.log('  ✅ Database query test successful');
            process.exit(0);
        }).catch((error) => {
            console.log(`  ❌ Database query test failed: ${error.message}`);
            process.exit(1);
        });
    }).catch((error) => {
        console.log(`  ❌ Database initialization failed: ${error.message}`);
        process.exit(1);
    });
} catch (error) {
    console.log(`  ❌ Database module import failed: ${error.message}`);
    process.exit(1);
}

// Summary
console.log('📊 Health Check Summary:');
if (envIssues === 0 && fileIssues === 0) {
    console.log('  🎉 All checks passed! Bot should start successfully.');
} else {
    console.log(`  ⚠️  Found ${envIssues} environment issues and ${fileIssues} file issues.`);
    console.log('  Please fix these issues before starting the bot.');
}
