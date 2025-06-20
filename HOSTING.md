# 🌐 Discord PSN Bot - Hosting Guide

This guide covers multiple affordable hosting options for your Discord PSN Bot, ranging from free to under $10/month.

## 🌟 Discord's Native Recommendations

### **Cloudflare Workers** (Discord Official Tutorial)
- **Free Tier**: 100,000 requests/day
- **Pros**: Ultra-fast, global edge network, serverless, officially recommended by Discord
- **Cons**: Requires bot restructuring for our current implementation
- **Best For**: Slash command bots, interaction-only bots

**⚠️ Important Note:** Our current bot uses persistent connections and cron jobs, which don't work well with Cloudflare Workers. You'd need to restructure the bot to use Discord's interaction webhooks instead of WebSocket connections.

**Restructuring Requirements:**
- Convert to interaction-only bot (no real-time events)
- Use external database (Cloudflare D1, Planet Scale, etc.)  
- Use external cron service (GitHub Actions, Cloudflare Cron Triggers)
- Rewrite using Cloudflare Workers API instead of Discord.js

[📖 Official Discord Tutorial](https://discord.com/developers/docs/tutorials/hosting-on-cloudflare-workers)

## 🆓 Free Options

### 1. **Railway** (Best Free Option)
- **Free Tier**: 500 hours/month, $5 credit monthly
- **Memory**: 512MB RAM, 1GB storage
- **Pros**: Easy deployment, good for Node.js, persistent storage
- **Cons**: Limited hours, may hibernate

**Setup:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Add environment variables** in Railway dashboard:
```
DISCORD_TOKEN=your_token
DISCORD_CLIENT_ID=your_client_id
DATABASE_PATH=/app/data/bot.db
LOG_LEVEL=info
```

### 2. **Render** (Good Free Tier)
- **Free Tier**: 750 hours/month
- **Memory**: 512MB RAM
- **Pros**: Easy GitHub integration, good documentation
- **Cons**: Sleeps after 15min of inactivity

**Setup:**
1. Connect your GitHub repo to Render
2. Add environment variables
3. Set build command: `npm install`
4. Set start command: `npm start`

## 💰 Affordable Paid Options ($3-10/month)

### 1. **DigitalOcean Droplets** (Recommended)
- **Price**: $4-6/month
- **Specs**: 1GB RAM, 25GB SSD, 1 CPU
- **Pros**: Full VPS control, excellent performance, simple pricing
- **Cons**: Requires some Linux knowledge

**Quick Setup:**
```bash
# Create droplet with Ubuntu 22.04
# SSH into your droplet

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup your bot
git clone <your-repo>
cd discord-psn-bot
npm install
./setup.sh
npm run setup

# Install PM2 for process management
sudo npm install -g pm2

# Start bot with PM2
pm2 start index.js --name "discord-psn-bot"
pm2 startup
pm2 save
```

### 2. **Linode Nanode**
- **Price**: $5/month
- **Specs**: 1GB RAM, 25GB SSD
- **Pros**: Excellent documentation, good performance
- **Similar setup to DigitalOcean**

### 3. **Vultr Regular Performance**
- **Price**: $2.50-6/month
- **Specs**: 512MB-1GB RAM
- **Pros**: Hourly billing, many locations
- **Similar setup to DigitalOcean**

### 4. **Railway Pro**
- **Price**: $5/month + usage
- **Specs**: No limits on hobby usage
- **Pros**: Zero config deployment, built-in monitoring
- **Best for beginners**

### 5. **Heroku**
- **Price**: $7/month (Eco dynos)
- **Memory**: 512MB RAM
- **Pros**: Easy deployment, add-ons ecosystem
- **Cons**: Sleeps without activity, limited storage

## 🏠 Self-Hosting Options

### 1. **Raspberry Pi** (Ultra Cheap)
- **Cost**: $35-75 one-time + electricity
- **Pros**: Very cheap long-term, learn Linux/networking
- **Cons**: Requires home internet, setup complexity

**Setup on Raspberry Pi:**
```bash
# Install Node.js on Raspberry Pi OS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Clone and setup
git clone <your-repo>
cd discord-psn-bot
npm install
./setup.sh
npm run setup

# Setup systemd service for auto-start
sudo nano /etc/systemd/system/discord-psn-bot.service
```

**Service file:**
```ini
[Unit]
Description=Discord PSN Bot
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/discord-psn-bot
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable discord-psn-bot
sudo systemctl start discord-psn-bot
```

### 2. **Home Server/Old PC**
- **Cost**: Free if you have hardware
- **Setup similar to Raspberry Pi**

## ☁️ Premium Cloud Options

### 1. **AWS EC2 t3.micro**
- **Price**: ~$8-10/month
- **Specs**: 1GB RAM, burstable CPU
- **Pros**: Industry standard, scalable
- **Cons**: Complex pricing, can get expensive

### 2. **Google Cloud e2-micro**
- **Price**: ~$6-8/month
- **Similar to AWS but simpler pricing**

## 📊 Comparison Table

| Provider | Price/Month | RAM | Storage | Difficulty | Uptime | Best For |
|----------|-------------|-----|---------|------------|--------|----------|
| Cloudflare Workers | $0 | N/A | External | Medium | Excellent | Interaction-only bots |
| Railway (Free) | $0 | 512MB | 1GB | Easy | Good | Testing |
| Render (Free) | $0 | 512MB | - | Easy | Fair | Testing |
| Railway Pro | $5+ | 8GB | 100GB | Easy | Excellent | Beginners |
| DigitalOcean | $4-6 | 1GB | 25GB | Medium | Excellent | Best Value |
| Linode | $5 | 1GB | 25GB | Medium | Excellent | Reliable |
| Vultr | $2.50-6 | 512MB-1GB | 20-25GB | Medium | Excellent | Budget |
| Heroku | $7 | 512MB | - | Easy | Good | Simple |
| Raspberry Pi | $35 one-time | 1-8GB | SD Card | Hard | Fair | Learning |

## 🛠️ Deployment Scripts

### Docker Deployment (Any Provider)

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN chmod +x setup.sh

EXPOSE 3000
CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  discord-psn-bot:
    build: .
    restart: unless-stopped
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
      - DATABASE_PATH=/app/data/bot.db
      - LOG_LEVEL=info
```

### PM2 Ecosystem File

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'discord-psn-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    }
  }]
};
```

Start with: `pm2 start ecosystem.config.js`

## 🔧 Performance Optimization

### Memory Optimization
```javascript
// Add to index.js for memory monitoring
setInterval(() => {
    const used = process.memoryUsage();
    console.log('Memory Usage:', {
        rss: Math.round(used.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB'
    });
}, 30000); // Log every 30 seconds
```

### Database Optimization
```bash
# Regular database maintenance
sqlite3 data/bot.db "VACUUM;"
sqlite3 data/bot.db "ANALYZE;"
```

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit tokens to Git
2. **Firewall**: Only open necessary ports (usually just 22 for SSH)
3. **Updates**: Keep your server and Node.js updated
4. **Backups**: Regular database backups
5. **Monitoring**: Set up log monitoring and alerts

## 📈 Scaling Considerations

- **Single Server**: Good for 1-100 Discord servers
- **Load Balancer**: For 100+ servers, consider multiple instances
- **Database**: PostgreSQL for high-load scenarios
- **Caching**: Redis for frequent data access

## 🆘 Troubleshooting

### Common Issues:
- **Memory errors**: Increase server RAM or optimize code
- **Database locks**: Add connection pooling
- **API rate limits**: Implement better rate limiting
- **Downtime**: Use process managers (PM2) and monitoring

## 💡 Recommendations

**For Current Bot Architecture:**
- **Beginners**: Railway or Render free tier
- **Budget**: DigitalOcean $4/month droplet
- **Learning**: Raspberry Pi at home
- **Production**: DigitalOcean or Linode with monitoring

**For Cloudflare Workers (Requires Restructuring):**
- **Interaction-only bots**: Excellent choice
- **High-traffic bots**: Global edge performance
- **Serverless preference**: No server management

Choose based on your technical comfort level, budget, and whether you want to restructure the bot!

---

**Need help?** Check the main README.md for troubleshooting or create an issue! 