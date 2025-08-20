/**
 * Database Module - SQLite Database Management
 * 
 * Handles all database operations for the Discord PSN Bot including:
 * - User authentication storage
 * - Trophy tracking data
 * - User preferences and settings
 * - Historical trophy data
 * 
 * Uses SQLite for local data storage with proper error handling and connection management
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = process.env.DATABASE_PATH || './data/bot.db';
    }

    /**
     * Initialize the database connection and create tables
     */
    async init() {
        try {
            console.log(`🗄️  Initializing database at: ${this.dbPath}`);
            
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            console.log(`📁 Checking data directory: ${dataDir}`);
            
            if (!fs.existsSync(dataDir)) {
                console.log(`📁 Creating data directory: ${dataDir}`);
                fs.mkdirSync(dataDir, { recursive: true });
                console.log(`✅ Data directory created successfully`);
            } else {
                console.log(`✅ Data directory already exists`);
            }

            // Create database connection with enhanced error handling
            console.log(`🔗 Connecting to SQLite database...`);
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error(`❌ SQLite connection error: ${err.message}`);
                    throw new Error(`Failed to connect to database: ${err.message}`);
                }
                console.log(`✅ SQLite database connected successfully`);
            });

            // Set database pragmas for better performance and reliability
            await this.run('PRAGMA foreign_keys = ON');
            await this.run('PRAGMA journal_mode = WAL');
            await this.run('PRAGMA synchronous = NORMAL');
            console.log(`✅ Database pragmas configured`);

            // Create tables
            console.log(`📋 Creating database tables...`);
            await this.createTables();
            console.log('✅ Database initialized successfully');

        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            console.error('Database path:', this.dbPath);
            console.error('Working directory:', process.cwd());
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    /**
     * Create all necessary database tables
     */
    async createTables() {
        const tables = [
            // Users table - simplified for public PSN data usage
            `CREATE TABLE IF NOT EXISTS users (
                discord_id TEXT PRIMARY KEY,
                psn_username TEXT NOT NULL UNIQUE,
                psn_account_id TEXT,
                notifications_enabled BOOLEAN DEFAULT 1,
                last_trophy_check INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now'))
            )`,

            // Trophies table - stores trophy data for tracking
            `CREATE TABLE IF NOT EXISTS trophies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_id TEXT,
                trophy_id TEXT,
                trophy_name TEXT,
                trophy_description TEXT,
                trophy_type TEXT,
                trophy_icon_url TEXT,
                game_title TEXT,
                game_id TEXT,
                earned_date INTEGER,
                is_platinum BOOLEAN DEFAULT 0,
                notified BOOLEAN DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (discord_id) REFERENCES users (discord_id),
                UNIQUE(discord_id, trophy_id, game_id)
            )`,

            // Games table - stores game information
            `CREATE TABLE IF NOT EXISTS games (
                game_id TEXT PRIMARY KEY,
                title TEXT,
                platform TEXT,
                icon_url TEXT,
                trophy_count_bronze INTEGER DEFAULT 0,
                trophy_count_silver INTEGER DEFAULT 0,
                trophy_count_gold INTEGER DEFAULT 0,
                trophy_count_platinum INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )`,

            // User games table - tracks user progress in games
            `CREATE TABLE IF NOT EXISTS user_games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_id TEXT,
                game_id TEXT,
                progress_percentage INTEGER DEFAULT 0,
                earned_bronze INTEGER DEFAULT 0,
                earned_silver INTEGER DEFAULT 0,
                earned_gold INTEGER DEFAULT 0,
                earned_platinum INTEGER DEFAULT 0,
                last_played INTEGER,
                completion_status TEXT DEFAULT 'not_started',
                FOREIGN KEY (discord_id) REFERENCES users (discord_id),
                FOREIGN KEY (game_id) REFERENCES games (game_id),
                UNIQUE(discord_id, game_id)
            )`,

            // Notifications table - tracks notification preferences
            `CREATE TABLE IF NOT EXISTS notification_settings (
                discord_id TEXT PRIMARY KEY,
                trophy_notifications BOOLEAN DEFAULT 1,
                platinum_notifications BOOLEAN DEFAULT 1,
                friend_notifications BOOLEAN DEFAULT 1,
                weekly_summary BOOLEAN DEFAULT 1,
                channel_id TEXT,
                FOREIGN KEY (discord_id) REFERENCES users (discord_id)
            )`,

            // Server settings table - tracks server-wide configurations
            `CREATE TABLE IF NOT EXISTS server_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                setting_type TEXT NOT NULL,
                setting_key TEXT,
                setting_value TEXT,
                channel_id TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now')),
                UNIQUE(guild_id, setting_type, setting_key, channel_id)
            )`,

            // Trophy cache table - caches public PSN trophy data
            `CREATE TABLE IF NOT EXISTS trophy_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                np_communication_id TEXT NOT NULL UNIQUE,
                game_title TEXT,
                trophy_data TEXT NOT NULL,
                cached_at INTEGER DEFAULT (strftime('%s', 'now')),
                expires_at INTEGER NOT NULL
            )`,

            // User trophy snapshots - tracks user's public trophy state
            `CREATE TABLE IF NOT EXISTS user_trophy_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_id TEXT NOT NULL,
                psn_account_id TEXT NOT NULL,
                snapshot_data TEXT NOT NULL,
                trophy_count_bronze INTEGER DEFAULT 0,
                trophy_count_silver INTEGER DEFAULT 0,
                trophy_count_gold INTEGER DEFAULT 0,
                trophy_count_platinum INTEGER DEFAULT 0,
                trophy_level INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (discord_id) REFERENCES users (discord_id),
                UNIQUE(discord_id)
            )`
        ];

        for (const tableSQL of tables) {
            await this.run(tableSQL);
        }
    }

    /**
     * Execute a SQL query with parameters
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise} - Promise that resolves when query completes
     */
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    /**
     * Get a single row from database
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise} - Promise that resolves with the row data
     */
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * Get all rows from database
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise} - Promise that resolves with array of rows
     */
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // USER MANAGEMENT METHODS

    /**
     * Add or update a user in the database
     * @param {Object} userData - User data object
     * @returns {Promise} - Promise that resolves when user is saved
     */
    async saveUser(userData) {
        const {
            discordId, psnUsername, psnAccountId, npssoToken,
            accessToken, refreshToken, tokenExpiresAt
        } = userData;

        const sql = `
            INSERT OR REPLACE INTO users 
            (discord_id, psn_username, psn_account_id, npsso_token, access_token, refresh_token, token_expires_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        `;

        return this.run(sql, [
            discordId, psnUsername, psnAccountId, npssoToken,
            accessToken, refreshToken, tokenExpiresAt
        ]);
    }

    /**
     * Get user data by Discord ID
     * @param {string} discordId - Discord user ID
     * @returns {Promise} - Promise that resolves with user data
     */
    async getUser(discordId) {
        const sql = 'SELECT * FROM users WHERE discord_id = ?';
        return this.get(sql, [discordId]);
    }

    /**
     * Get all users with notification enabled (updated for no-auth)
     * @returns {Promise} - Promise that resolves with array of users
     */
    async getUsersWithNotifications() {
        const sql = 'SELECT * FROM users WHERE notifications_enabled = 1 AND psn_username IS NOT NULL';
        return this.all(sql);
    }

    /**
     * Get user by PSN username
     * @param {string} psnUsername - PSN username
     * @returns {Promise} - Promise that resolves with user data
     */
    async getUserByPsnUsername(psnUsername) {
        const sql = 'SELECT * FROM users WHERE psn_username = ?';
        return this.get(sql, [psnUsername]);
    }

    /**
     * Create a new user record
     * @param {string} discordId - Discord user ID
     * @param {Object} userData - User data object
     * @returns {Promise} - Promise that resolves when user is created
     */
    async createUser(discordId, userData) {
        const sql = `
            INSERT INTO users (discord_id, psn_username, psn_account_id, notifications_enabled, last_trophy_check)
            VALUES (?, ?, ?, ?, ?)
        `;
        return this.run(sql, [
            discordId,
            userData.psn_username,
            userData.psn_account_id,
            userData.notifications_enabled || 1,
            userData.last_trophy_check || 0
        ]);
    }

    /**
     * Update user record
     * @param {string} discordId - Discord user ID
     * @param {Object} updateData - Data to update
     * @returns {Promise} - Promise that resolves when user is updated
     */
    async updateUser(discordId, updateData) {
        const fields = [];
        const values = [];
        
        if (updateData.psn_username !== undefined) {
            fields.push('psn_username = ?');
            values.push(updateData.psn_username);
        }
        if (updateData.psn_account_id !== undefined) {
            fields.push('psn_account_id = ?');
            values.push(updateData.psn_account_id);
        }
        if (updateData.notifications_enabled !== undefined) {
            fields.push('notifications_enabled = ?');
            values.push(updateData.notifications_enabled);
        }
        if (updateData.last_trophy_check !== undefined) {
            fields.push('last_trophy_check = ?');
            values.push(updateData.last_trophy_check);
        }
        if (updateData.updated_at !== undefined) {
            fields.push('updated_at = ?');
            values.push(updateData.updated_at);
        }
        
        if (fields.length === 0) {
            throw new Error('No update fields provided');
        }
        
        values.push(discordId);
        const sql = `UPDATE users SET ${fields.join(', ')} WHERE discord_id = ?`;
        
        return this.run(sql, values);
    }

    /**
     * Delete user record
     * @param {string} discordId - Discord user ID
     * @returns {Promise} - Promise that resolves when user is deleted
     */
    async deleteUser(discordId) {
        const sql = 'DELETE FROM users WHERE discord_id = ?';
        return this.run(sql, [discordId]);
    }

    // TROPHY MANAGEMENT METHODS

    /**
     * Save a trophy to the database
     * @param {Object} trophyData - Trophy data object
     * @returns {Promise} - Promise that resolves when trophy is saved
     */
    async saveTrophy(trophyData) {
        const {
            discordId, trophyId, trophyName, trophyDescription,
            trophyType, trophyIconUrl, gameTitle, gameId,
            earnedDate, isPlatinum = false
        } = trophyData;

        const sql = `
            INSERT OR IGNORE INTO trophies 
            (discord_id, trophy_id, trophy_name, trophy_description, trophy_type, trophy_icon_url, game_title, game_id, earned_date, is_platinum)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        return this.run(sql, [
            discordId, trophyId, trophyName, trophyDescription,
            trophyType, trophyIconUrl, gameTitle, gameId,
            earnedDate, isPlatinum
        ]);
    }

    /**
     * Get recent trophies for a user
     * @param {string} discordId - Discord user ID
     * @param {number} limit - Number of trophies to return
     * @returns {Promise} - Promise that resolves with array of trophies
     */
    async getRecentTrophies(discordId, limit = 10) {
        const sql = `
            SELECT * FROM trophies 
            WHERE discord_id = ? 
            ORDER BY earned_date DESC 
            LIMIT ?
        `;
        return this.all(sql, [discordId, limit]);
    }

    /**
     * Get platinum trophies for a user
     * @param {string} discordId - Discord user ID
     * @returns {Promise} - Promise that resolves with array of platinum trophies
     */
    async getPlatinumTrophies(discordId) {
        const sql = `
            SELECT * FROM trophies 
            WHERE discord_id = ? AND is_platinum = 1 
            ORDER BY earned_date DESC
        `;
        return this.all(sql, [discordId]);
    }

    /**
     * Update last trophy check time for a user
     * @param {string} discordId - Discord user ID
     * @returns {Promise} - Promise that resolves when updated
     */
    async updateLastTrophyCheck(discordId) {
        const sql = 'UPDATE users SET last_trophy_check = strftime(\'%s\', \'now\') WHERE discord_id = ?';
        return this.run(sql, [discordId]);
    }

    // GAME MANAGEMENT METHODS

    /**
     * Save game information
     * @param {Object} gameData - Game data object
     * @returns {Promise} - Promise that resolves when game is saved
     */
    async saveGame(gameData) {
        const {
            gameId, title, platform, iconUrl,
            trophyCountBronze = 0, trophyCountSilver = 0,
            trophyCountGold = 0, trophyCountPlatinum = 0
        } = gameData;

        const sql = `
            INSERT OR REPLACE INTO games 
            (game_id, title, platform, icon_url, trophy_count_bronze, trophy_count_silver, trophy_count_gold, trophy_count_platinum)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        return this.run(sql, [
            gameId, title, platform, iconUrl,
            trophyCountBronze, trophyCountSilver, trophyCountGold, trophyCountPlatinum
        ]);
    }

    /**
     * Close the database connection
     */
    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

// Export singleton instance
module.exports = new Database();
