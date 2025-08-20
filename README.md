# 🎮 Discord PSN Bot

A comprehensive Discord bot that tracks PlayStation Network trophies and provides real-time notifications, statistics, and profile information for PlayStation gamers.

## ✨ Features

- 🔗 **Simple PSN Linking** - Connect using just your PSN username - no tokens needed!
- 🏆 **Automatic Trophy Tracking** - Real-time monitoring using public PSN data
- 📊 **Detailed Statistics** - Comprehensive trophy statistics and gaming profiles
- 🔔 **Smart Notifications** - Beautiful Discord notifications for new trophies
- 🏅 **Platinum Celebrations** - Special announcements for platinum trophies
- 📈 **Public Data Access** - Works with publicly visible PSN accounts
- 🔄 **Manual Checks** - On-demand trophy checking with `/check` command
- 🌐 **No Authentication Required** - Uses PSN's public API for maximum simplicity

## 📋 Prerequisites

Before setting up the bot, ensure you have:

- **Node.js** (v16.0.0 or higher)
- **npm** (comes with Node.js)
- **Discord Bot Token** from [Discord Developer Portal](https://discord.com/developers/applications)
- **PlayStation Network Account** with public or visible trophy data

## 🚀 Quick Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd discord-psn-bot
chmod +x setup.sh
./setup.sh
```

### 2. Configure the Bot

Run the interactive setup wizard:

```bash
npm run setup
```

The wizard will ask for:
- Discord Bot Token
- Discord Application ID
- Database path (optional)
- Log level (optional)

### 3. Start the Bot

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## 🔧 Manual Setup

If you prefer manual configuration:

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Environment File

Create a `.env` file in the root directory:

```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_application_id_here

# Database Configuration
DATABASE_PATH=./data/bot.db

# Logging Configuration
LOG_LEVEL=info

# Optional Settings
# LOG_FILE=./logs/bot.log
# TROPHY_CHECK_CRON=*/30 * * * *
# PSN_API_DELAY=2000
```

### 3. Initialize Database

```bash
./setup.sh
```

Or manually create directories:

```bash
mkdir -p data logs
```

### 4. Register Discord Commands

```bash
node setup.js
```

## 🤖 Discord Bot Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section
4. Click "Add Bot"
5. Copy the Bot Token for your `.env` file
6. Copy the Application ID from "General Information"

### 2. Bot Permissions

The bot needs the following permissions:
- **Send Messages** (2048)
- **Use Slash Commands** (2147483648)
- **Embed Links** (16384)
- **Read Message History** (65536)

**Recommended Permission Integer**: `2147534912`

### 3. Invite Bot to Server

Use this URL template (replace `YOUR_CLIENT_ID`):

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147534912&scope=bot%20applications.commands
```

## 🎮 Usage

### Linking PSN Account

1. Use `/link username:YourPSNUsername` command in Discord
2. Enter your exact PlayStation Network username (case-sensitive)
3. The bot will validate your account and link it automatically
4. Start earning trophies and receive notifications!

### Important Notes

- Your PSN username must be exactly as it appears on PlayStation
- Your account must have public trophy visibility or recent activity
- The bot uses public PSN data only - no authentication tokens needed
- Privacy settings that hide all trophy data may prevent linking

### Available Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `/link username:PSN_Username` | Link your PSN account using username | Everyone |
| `/profile [user]` | View trophy profile and statistics | Everyone |
| `/check` | Manually check for new trophies | Everyone |
| `/channel set/remove/info` | Configure trophy notification channels | Manage Channels |
| `/restrict add/remove/clear/list` | Restrict bot to specific channels | Administrator |

### Trophy Notifications

The bot automatically checks for new trophies every 30 minutes and sends notifications to configured channels. Special celebrations are triggered for platinum trophies!

**Setting up notifications:**
1. Use `/channel set #your-channel` to configure where notifications are sent
2. Use `/restrict add #bot-channel` to limit bot usage to specific channels (optional)
3. Notifications will automatically appear when new trophies are detected!

## 📁 Project Structure

```
discord-psn-bot/
├── src/
│   ├── commands/           # Discord slash commands
│   │   ├── link.js        # PSN account linking
│   │   ├── profile.js     # Trophy profiles
│   │   └── check.js       # Manual trophy check
│   ├── events/            # Discord event handlers
│   │   ├── ready.js       # Bot ready event
│   │   └── interactionCreate.js # Command handling
│   ├── utils/             # Utility modules
│   │   ├── logger.js      # Logging system
│   │   ├── psnApi.js      # PSN API wrapper
│   │   └── trophyTracker.js # Trophy monitoring
│   └── database/          # Database management
│       └── database.js    # SQLite operations
├── data/                  # Database files
├── logs/                  # Log files
├── index.js              # Main entry point
├── setup.js              # Interactive setup
├── setup.sh              # Database initialization
└── package.json          # Dependencies
```

## 🗄️ Database Schema

The bot uses SQLite with the following tables:

- **users** - Discord users and PSN authentication
- **trophies** - Trophy achievements and metadata
- **games** - Game information and trophy counts
- **user_games** - User progress in specific games
- **notification_settings** - User notification preferences

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord bot token | Required |
| `DISCORD_CLIENT_ID` | Discord application ID | Required |
| `DATABASE_PATH` | SQLite database file path | `./data/bot.db` |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` |
| `LOG_FILE` | Log file path (optional) | Console only |
| `TROPHY_CHECK_CRON` | Cron schedule for trophy checks | `*/30 * * * *` |
| `PSN_API_DELAY` | Delay between PSN API calls (ms) | `2000` |

### Trophy Check Schedule

Default: Every 30 minutes (`*/30 * * * *`)

You can customize the schedule using cron syntax:
- `*/15 * * * *` - Every 15 minutes
- `0 */2 * * *` - Every 2 hours
- `0 9,21 * * *` - Daily at 9 AM and 9 PM

## 🛡️ Security & Privacy

- **No Authentication Required**: No PSN tokens or passwords needed
- **Public Data Only**: Only accesses publicly visible trophy information
- **Privacy Respect**: Cannot access private/hidden trophy data
- **Rate Limiting**: Built-in API rate limiting to respect PSN servers
- **Error Handling**: Comprehensive error handling and logging

## 🐛 Troubleshooting

### Common Issues

**Bot won't start:**
- Check your Discord token is valid
- Ensure all dependencies are installed (`npm install`)
- Verify the `.env` file is properly configured

**PSN linking fails:**
- Verify your PSN username is exactly correct (case-sensitive)
- Check PSN privacy settings allow public trophy visibility
- Ensure your account has recent activity or public profile
- Try the exact username as shown on PlayStation.com

**No trophy notifications:**
- Verify notification channel is set
- Check bot has permission to send messages
- Ensure trophy tracking is enabled

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
LOG_FILE=./logs/debug.log
```

### Log Files

Check log files for detailed error information:
- Console output for general information
- `./logs/bot.log` for file logging (if enabled)

## 📊 Performance

- **Memory Usage**: ~50-100MB typical usage
- **API Calls**: Rate-limited to respect PSN servers
- **Database**: SQLite for lightweight, local storage
- **Scalability**: Supports multiple servers and users

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License - see the package.json file for details.

## ⚠️ Disclaimer

This bot is not officially affiliated with Sony Interactive Entertainment or PlayStation Network. Use at your own risk and ensure compliance with PlayStation Network Terms of Service.

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review log files for error details
3. Ensure all prerequisites are met
4. Create an issue with detailed information

## 🌐 Hosting

Ready to deploy your bot? Check out our comprehensive [**HOSTING.md**](HOSTING.md) guide for:

- 🆓 **Free hosting options** (Railway, Render)
- 💰 **Cheap VPS options** ($4-6/month) - DigitalOcean, Linode, Vultr
- 🏠 **Self-hosting** (Raspberry Pi, home server)
- 🐳 **Docker deployment** configurations
- 📊 **Performance optimization** tips

**Quick recommendations:**
- **Beginners**: Railway free tier
- **Budget**: DigitalOcean $4/month droplet  
- **Learning**: Raspberry Pi at home

---

**Happy Gaming and Trophy Hunting! 🏆**
