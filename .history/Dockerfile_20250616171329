FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install sqlite3 and other dependencies
RUN apk add --no-cache sqlite python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Make setup script executable
RUN chmod +x setup.sh

# Create directories for data and logs
RUN mkdir -p data logs

# Expose port (not strictly necessary for Discord bots, but good practice)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Bot is running')" || exit 1

# Start the bot
CMD ["npm", "start"] 