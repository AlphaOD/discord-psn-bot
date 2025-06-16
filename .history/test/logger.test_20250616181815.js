/**
 * Logger Utility Tests
 * 
 * Tests for the Logger singleton including:
 * - Basic logging functionality
 * - Log levels
 * - Specialized logging methods
 */

const path = require('path');

// Mock fs before requiring logger
jest.mock('fs', () => ({
    existsSync: jest.fn(() => false),
    mkdirSync: jest.fn(),
    appendFileSync: jest.fn()
}));

describe('Logger Utility', () => {
    let logger;
    let consoleSpy;
    
    beforeEach(() => {
        // Clear module cache to get fresh logger instance
        delete require.cache[require.resolve('../src/utils/logger')];
        
        // Mock console.log
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        
        // Get logger instance
        logger = require('../src/utils/logger');
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        jest.clearAllMocks();
    });

    describe('Basic Logging', () => {
        test('should log info messages by default', () => {
            logger.info('Test message');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/INFO.*Test message/)
            );
        });

        test('should log error messages', () => {
            logger.error('Error message');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/ERROR.*Error message/)
            );
        });

        test('should log warning messages', () => {
            logger.warn('Warning message');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/WARN.*Warning message/)
            );
        });

        test('should not log debug messages by default', () => {
            logger.debug('Debug message');
            expect(consoleSpy).not.toHaveBeenCalled();
        });
    });

    describe('Log Levels', () => {
        test('should respect debug log level', () => {
            logger.setLevel('debug');
            jest.clearAllMocks(); // Clear the setLevel call
            
            logger.debug('Debug message');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/DEBUG.*Debug message/)
            );
        });

        test('should respect error log level', () => {
            logger.setLevel('error');
            jest.clearAllMocks(); // Clear the setLevel call
            
            logger.error('Error message');
            logger.warn('Warning message');
            logger.info('Info message');
            
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/ERROR.*Error message/)
            );
        });

        test('should handle invalid log level', () => {
            logger.setLevel('invalid');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/WARN.*Invalid log level/)
            );
        });
    });

    describe('Specialized Logging Methods', () => {
        test('should log API calls correctly', () => {
            logger.logApiCall('GET', '/test', 200, 150);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/INFO.*API GET \/test - 200 \(150ms\)/)
            );
        });

        test('should log API errors correctly', () => {
            logger.logApiCall('POST', '/test', 500, 200);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/ERROR.*API POST \/test - 500 \(200ms\)/)
            );
        });

        test('should log successful commands', () => {
            logger.logCommand('profile', 'user123', 'guild456', true);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/COMMAND \[SUCCESS\] \/profile by user123 in guild456/)
            );
        });

        test('should log failed commands', () => {
            logger.logCommand('profile', 'user123', 'guild456', false);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/COMMAND \[FAILED\] \/profile by user123 in guild456/)
            );
        });

        test('should log successful auth events', () => {
            logger.logAuth('user123', 'login', true);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/AUTH \[SUCCESS\] login for user user123/)
            );
        });

        test('should log failed auth events', () => {
            logger.logAuth('user123', 'login', false);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/AUTH \[FAILED\] login for user user123/)
            );
        });

        test('should log trophy checks with new trophies', () => {
            logger.logTrophyCheck('user123', 5, 1);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/TROPHY CHECK \[user123\] Found 5 new trophies \(1 platinums\)/)
            );
        });

        test('should not log trophy checks with no new trophies unless debug', () => {
            logger.logTrophyCheck('user123', 0, 0);
            expect(consoleSpy).not.toHaveBeenCalled();
        });
    });

    describe('Child Loggers', () => {
        test('should create child logger with prefix', () => {
            const childLogger = logger.child('TEST');
            childLogger.info('Child message');
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/INFO.*\[TEST\] Child message/)
            );
        });

        test('should support all log levels in child logger', () => {
            const childLogger = logger.child('TEST');
            
            childLogger.error('Error');
            childLogger.warn('Warning');
            childLogger.info('Info');
            
            expect(consoleSpy).toHaveBeenCalledTimes(3);
        });
    });

    describe('Performance Timing', () => {
        test('should time synchronous functions', async () => {
            logger.setLevel('debug');
            jest.clearAllMocks(); // Clear the setLevel call
            
            const syncFunction = () => 'result';
            const result = await logger.time('sync-test', syncFunction);
            
            expect(result).toBe('result');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/DEBUG.*Starting: sync-test/)
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/DEBUG.*Completed: sync-test.*ms/)
            );
        });

        test('should handle errors in timed functions', async () => {
            const errorFunction = () => {
                throw new Error('Test error');
            };
            
            await expect(logger.time('error-test', errorFunction)).rejects.toThrow('Test error');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/ERROR.*Failed: error-test.*ms/)
            );
        });
    });

    describe('File Logging', () => {
        test('should enable file logging', () => {
            const fs = require('fs');
            logger.enableFileLogging('/tmp/test.log');
            
            expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp', { recursive: true });
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/File logging enabled/)
            );
        });

        test('should disable file logging', () => {
            logger.enableFileLogging('/tmp/test.log');
            jest.clearAllMocks();
            
            logger.disableFileLogging();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/File logging disabled/)
            );
        });
    });

    describe('Message Formatting', () => {
        test('should include timestamp in messages', () => {
            logger.info('Timestamp test');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\]/)
            );
        });

        test('should handle multiple arguments', () => {
            logger.info('Multiple', 'arguments', 123);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/Multiple arguments 123/)
            );
        });

        test('should format objects as JSON', () => {
            const testObject = { key: 'value' };
            logger.info('Object:', testObject);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/Object:.*"key": "value"/)
            );
        });
    });
}); 