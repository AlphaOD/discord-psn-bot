# 🎮 Discord PSN Bot - No-Auth Redesign Plan

## 🎯 **Core Philosophy Change**

**Before:** Authentication-heavy, complex NPSSO token management
**After:** Public API usage, simple username linking, one PSN account per Discord user

---

## 🏗️ **New Architecture Overview**

### **Simplified User Flow:**
1. User runs `/link YourPSNUsername`
2. Bot validates PSN username exists (public search)
3. Bot stores Discord User ID ↔ PSN Username mapping
4. Bot tracks public trophy data for linked users
5. Bot sends notifications when new trophies detected

### **Key Principles:**
- ✅ **One PSN account per Discord user** (prevents confusion)
- ✅ **No authentication required** (uses public PSN data)
- ✅ **Channel restrictions** (server admins control where bot works)
- ✅ **Public commands** (anyone can browse trophies/players)
- ✅ **Comprehensive testing** (100% coverage goal)
- ✅ **CI/CD pipeline** (automated testing on every commit)

---

## 📋 **Implementation Tasks**

### **Phase 1: Core Architecture (Days 1-2)**

#### **Task 1: Database Schema Redesign**
```sql
-- Simplified users table (remove all auth tokens)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_user_id TEXT NOT NULL UNIQUE,
    psn_username TEXT NOT NULL UNIQUE,
    psn_account_id TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    last_trophy_check INTEGER DEFAULT 0,
    notifications_enabled INTEGER DEFAULT 1
);

-- Enhanced server settings for channel restrictions
CREATE TABLE server_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    setting_type TEXT NOT NULL,
    setting_key TEXT,
    setting_value TEXT,
    channel_id TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(guild_id, setting_type, setting_key, channel_id)
);

-- Trophy cache for public data
CREATE TABLE trophy_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    np_communication_id TEXT NOT NULL,
    trophy_data TEXT NOT NULL,
    cached_at INTEGER DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER NOT NULL,
    UNIQUE(np_communication_id)
);
```

#### **Task 2: PSN API Wrapper Redesign**
```javascript
class PublicPSNApi {
    // Remove all authentication methods
    // Focus on public endpoints
    async validateUsername(username)
    async getUserAccountId(username)
    async getUserPublicProfile(accountId)
    async getUserGames(accountId)
    async getUserTrophySummary(accountId)
    async getGameTrophies(npCommunicationId)
    async searchUsers(query)
}
```

#### **Task 3: New Link Command**
```javascript
// /link [psn-username]
// - Validate PSN username exists
// - Check if Discord user already linked
// - Check if PSN username already taken by another Discord user
// - Store mapping in database
// - Confirm successful linking
```

### **Phase 2: Core Commands Update (Days 3-4)**

#### **Task 4: Update Existing Commands**
- `/profile` - Show public PSN profile for linked user
- `/check` - Manually check for new trophies (public data)
- `/unlink` - Remove PSN username association
- `/status` - Show bot status and linked account info

#### **Task 5: New Public Commands**
- `/browse-player [username]` - View any PSN player's public profile
- `/browse-game [game-name]` - Browse any game's trophy list
- `/trophy-search [query]` - Search for trophies across games
- `/rare-trophies [game]` - Show rarest trophies for a game

#### **Task 6: Enhanced Channel Management**
- `/channel allow` - Allow bot in current channel
- `/channel deny` - Remove bot from current channel
- `/channel list` - Show allowed channels
- `/channel clear` - Reset all channel permissions

### **Phase 3: Testing & CI/CD (Days 5-6)**

#### **Task 7: Comprehensive Unit Tests**
```
test/
├── unit/
│   ├── database.test.js          # Database operations
│   ├── psnApi.test.js            # PSN API wrapper
│   ├── commands/
│   │   ├── link.test.js          # Link command
│   │   ├── profile.test.js       # Profile command
│   │   ├── browse.test.js        # Browse commands
│   │   └── channel.test.js       # Channel management
│   ├── utils/
│   │   ├── logger.test.js        # Logging utility
│   │   └── trophyTracker.test.js # Trophy tracking
│   └── events/
│       └── interactionCreate.test.js # Event handling
├── integration/
│   ├── bot.integration.test.js   # Full bot integration
│   └── database.integration.test.js # Database integration
└── e2e/
    └── commands.e2e.test.js      # End-to-end command testing
```

#### **Task 8: GitHub Actions CI/CD**
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:ci
      - run: npm run test:coverage
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Render
        # Auto-deployment trigger
```

### **Phase 4: Documentation & Polish (Day 7)**

#### **Task 9: Update Documentation**
- README.md - Complete rewrite for new architecture
- SETUP.md - Updated setup instructions
- API.md - Document all commands and features
- TROUBLESHOOTING.md - Common issues and solutions

#### **Task 10: Help System Overhaul**
- `/help` - Comprehensive help with categories
- `/help linking` - PSN username linking guide
- `/help channels` - Channel management guide
- `/help commands` - All available commands

---

## 🧪 **Testing Strategy**

### **Unit Tests (95%+ Coverage Goal):**
- Database operations (CRUD, migrations)
- PSN API calls (mocked responses)
- Command handlers (input validation, responses)
- Utility functions (logging, validation)
- Error handling (all failure modes)

### **Integration Tests:**
- Database + PSN API integration
- Command + Database integration
- Event handling flow
- Channel restriction enforcement

### **End-to-End Tests:**
- Complete command workflows
- Multi-user scenarios
- Channel permission scenarios
- Error recovery scenarios

### **Performance Tests:**
- Response time under load
- Memory usage monitoring
- Database query optimization
- Rate limiting effectiveness

---

## 📊 **Success Metrics**

### **Technical Quality:**
- [ ] 95%+ test coverage
- [ ] All tests pass in CI/CD
- [ ] Zero eslint/prettier violations
- [ ] All commands respond < 3 seconds
- [ ] Memory usage < 100MB

### **User Experience:**
- [ ] `/link` works in one step
- [ ] Public commands work without linking
- [ ] Channel restrictions enforce properly
- [ ] Error messages are helpful
- [ ] Help system is comprehensive

### **Reliability:**
- [ ] 99.9% uptime
- [ ] Graceful error handling
- [ ] Automatic recovery from failures
- [ ] Proper logging for debugging
- [ ] Database backup/restore

---

## 🚀 **Implementation Order**

### **Day 1:**
1. Database schema redesign
2. PSN API wrapper redesign
3. Basic unit test setup

### **Day 2:**
4. New `/link` command
5. Update `/profile` command
6. Channel restriction system

### **Day 3:**
7. Update remaining commands
8. Add public browse commands
9. Enhanced help system

### **Day 4:**
10. Comprehensive unit tests
11. Integration tests
12. Performance optimization

### **Day 5:**
13. GitHub Actions setup
14. E2E test scenarios
15. Documentation updates

### **Day 6:**
16. Polish and bug fixes
17. Final testing
18. Deployment preparation

### **Day 7:**
19. Production deployment
20. Monitoring setup
21. User migration guide

---

## 🎯 **Key Benefits After Redesign**

### **For Users:**
- ✅ **Simple linking** - just provide PSN username
- ✅ **Immediate access** - no complex token setup
- ✅ **Public features** - browse without linking
- ✅ **Reliable notifications** - based on public data

### **For Server Admins:**
- ✅ **Channel control** - restrict bot to specific channels
- ✅ **Easy management** - clear commands for permissions
- ✅ **No authentication issues** - no token expiration problems

### **For Developers:**
- ✅ **Simple codebase** - no complex auth management
- ✅ **Comprehensive tests** - confidence in changes
- ✅ **CI/CD pipeline** - automated quality assurance
- ✅ **Clear documentation** - easy maintenance

This redesign transforms the bot from a complex, authentication-heavy application into a simple, reliable, and feature-rich Discord PSN companion! 🎮
