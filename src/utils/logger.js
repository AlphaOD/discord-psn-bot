/**
 * Logger Utility - Centralized Logging System
 * 
 * Provides structured logging for the Discord PSN Bot with:
 * - Multiple log levels (error, warn, info, debug)
 * - Timestamp formatting
 * - Color-coded console output
 * - Optional file logging
 * 
 * Usage:
 * logger.info('Bot started successfully');
 * logger.error('Database connection failed:', error);
 * logger.debug('Processing trophy data:', trophyData);
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logFile = process.env.LOG_FILE || null;
        
        // Log levels in order of severity
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };

        // Color codes for console output
        this.colors = {
            error: '\x1b[31m',   // Red
            warn: '\x1b[33m',    // Yellow
            info: '\x1b[36m',    // Cyan
            debug: '\x1b[35m',   // Magenta
            reset: '\x1b[0m'     // Reset
        };

        // Create logs directory if file logging is enabled
        if (this.logFile) {
            const logDir = path.dirname(this.logFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
        }
    }

    /**
     * Get formatted timestamp
     * @returns {string} - Formatted timestamp string
     */
    getTimestamp() {
        return new Date().toISOString().replace('T', ' ').replace('Z', '');
    }

    /**
     * Check if message should be logged based on current log level
     * @param {string} level - Log level to check
     * @returns {boolean} - Whether to log the message
     */
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }

    /**
     * Format log message with timestamp and level
     * @param {string} level - Log level
     * @param {Array} args - Arguments to log
     * @returns {string} - Formatted log message
     */
    formatMessage(level, args) {
        const timestamp = this.getTimestamp();
        const levelStr = level.toUpperCase().padEnd(5);
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        return `[${timestamp}] ${levelStr} ${message}`;
    }

    /**
     * Write log message to console and optionally to file
     * @param {string} level - Log level
     * @param {Array} args - Arguments to log
     */
    log(level, ...args) {
        if (!this.shouldLog(level)) {
            return;
        }

        const formattedMessage = this.formatMessage(level, args);
        
        // Console output with colors
        const color = this.colors[level] || this.colors.reset;
        console.log(`${color}${formattedMessage}${this.colors.reset}`);

        // File output (without colors)
        if (this.logFile) {
            try {
                fs.appendFileSync(this.logFile, formattedMessage + '\n');
            } catch (error) {
                console.error('Failed to write to log file:', error.message);
            }
        }
    }

    /**
     * Log error message
     * @param {...any} args - Arguments to log
     */
    error(...args) {
        this.log('error', ...args);
    }

    /**
     * Log warning message
     * @param {...any} args - Arguments to log
     */
    warn(...args) {
        this.log('warn', ...args);
    }

    /**
     * Log info message
     * @param {...any} args - Arguments to log
     */
    info(...args) {
        this.log('info', ...args);
    }

    /**
     * Log debug message
     * @param {...any} args - Arguments to log
     */
    debug(...args) {
        this.log('debug', ...args);
    }

    /**
     * Log with custom level
     * @param {string} level - Custom log level
     * @param {...any} args - Arguments to log
     */
    custom(level, ...args) {
        this.log(level, ...args);
    }

    /**
     * Set log level dynamically
     * @param {string} level - New log level
     */
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.logLevel = level;
            this.info(`Log level set to: ${level}`);
        } else {
            this.warn(`Invalid log level: ${level}. Available levels:`, Object.keys(this.levels));
        }
    }

    /**
     * Enable file logging
     * @param {string} filePath - Path to log file
     */
    enableFileLogging(filePath) {
        this.logFile = filePath;
        const logDir = path.dirname(filePath);
        
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        this.info(`File logging enabled: ${filePath}`);
    }

    /**
     * Disable file logging
     */
    disableFileLogging() {
        const previousFile = this.logFile;
        this.logFile = null;
        this.info(`File logging disabled (was: ${previousFile})`);
    }

    /**
     * Create a child logger with a prefix
     * @param {string} prefix - Prefix for log messages
     * @returns {Object} - Child logger instance
     */
    child(prefix) {
        const parent = this;
        return {
            error: (...args) => parent.error(`[${prefix}]`, ...args),
            warn: (...args) => parent.warn(`[${prefix}]`, ...args),
            info: (...args) => parent.info(`[${prefix}]`, ...args),
            debug: (...args) => parent.debug(`[${prefix}]`, ...args),
            custom: (level, ...args) => parent.custom(level, `[${prefix}]`, ...args)
        };
    }

    /**
     * Log performance timing
     * @param {string} label - Label for the timing
     * @param {function} fn - Function to time
     * @returns {any} - Result of the function
     */
    async time(label, fn) {
        const start = Date.now();
        this.debug(`Starting: ${label}`);
        
        try {
            const result = await fn();
            const duration = Date.now() - start;
            this.debug(`Completed: ${label} (${duration}ms)`);
            return result;
        } catch (error) {
            const duration = Date.now() - start;
            this.error(`Failed: ${label} (${duration}ms)`, error);
            throw error;
        }
    }

    /**
     * Log API request/response
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {number} status - Response status
     * @param {number} duration - Request duration in ms
     */
    logApiCall(method, url, status, duration) {
        const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
        this.log(level, `API ${method} ${url} - ${status} (${duration}ms)`);
    }

    /**
     * Log Discord command usage
     * @param {string} command - Command name
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @param {boolean} success - Whether command was successful
     */
    logCommand(command, userId, guildId, success = true) {
        const status = success ? 'SUCCESS' : 'FAILED';
        this.info(`COMMAND [${status}] /${command} by ${userId} in ${guildId}`);
    }

    /**
     * Log PSN authentication events
     * @param {string} userId - Discord user ID
     * @param {string} event - Auth event type
     * @param {boolean} success - Whether event was successful
     */
    logAuth(userId, event, success = true) {
        const status = success ? 'SUCCESS' : 'FAILED';
        const level = success ? 'info' : 'warn';
        this.log(level, `AUTH [${status}] ${event} for user ${userId}`);
    }

    /**
     * Log trophy tracking events
     * @param {string} userId - Discord user ID
     * @param {number} newTrophies - Number of new trophies found
     * @param {number} platinums - Number of new platinums
     */
    logTrophyCheck(userId, newTrophies, platinums = 0) {
        if (newTrophies > 0) {
            this.info(`TROPHY CHECK [${userId}] Found ${newTrophies} new trophies (${platinums} platinums)`);
        } else {
            this.debug(`TROPHY CHECK [${userId}] No new trophies`);
        }
    }
}

// Export singleton instance
module.exports = new Logger();
