#!/bin/bash

# Discord PSN Bot Setup Script
# This script sets up the SQLite database and prepares the bot environment

echo "🎮 Discord PSN Bot - Database Setup"
echo "=================================="
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data
mkdir -p logs
mkdir -p .dist
echo "✅ Created data/, logs/, and .dist/ directories"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
else
    echo "✅ Dependencies already installed"
fi

# Initialize the database
echo "🗄️ Initializing SQLite database..."

# Create a simple database initialization script
cat > init-db.js << 'EOF'
const Database = require('./src/database/database');
const logger = require('./src/utils/logger');

async function initDatabase() {
    const database = new Database();
    
    try {
        logger.info('🗄️ Initializing SQLite database...');
        await database.init();
        logger.info('✅ Database initialized successfully');
        
        // Close the database connection
        await database.close();
        logger.info('✅ Database connection closed');
        
    } catch (error) {
        logger.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

initDatabase();
EOF

# Run the database initialization
node init-db.js

if [ $? -eq 0 ]; then
    echo "✅ SQLite database created and initialized"
else
    echo "❌ Failed to initialize database"
    exit 1
fi

# Clean up the temporary script
rm init-db.js

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo
    echo "⚠️  No .env file found. You need to configure your bot:"
    echo "1. Run 'npm run setup' for interactive configuration"
    echo "2. Or manually create a .env file with your Discord bot token"
    echo
    echo "📝 Required environment variables:"
    echo "   DISCORD_TOKEN=your_discord_bot_token"
    echo "   DISCORD_CLIENT_ID=your_discord_application_id"
else
    echo "✅ .env file already exists"
fi

echo
echo "🎉 Database setup complete!"
echo
echo "📋 Next steps:"
echo "1. Configure your bot with 'npm run setup' (if not done already)"
echo "2. Start the bot with 'npm start'"
echo "3. Invite the bot to your Discord server"
echo "4. Use '/link' command to connect PSN accounts"
echo

# Make the script remember it was run
touch .setup-complete

echo "✅ Setup script completed successfully" 