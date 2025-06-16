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

        test('should log warning for invalid log level', () => {
            // Reset any previous log level
            logger.setLevel('info');
            jest.clearAllMocks();
            
            logger.setLevel('invalid');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/WARN.*Invalid log level/)
            );
        });
    });

    describe('Specialized Logging Methods', () => {
        test('should have logApiCall method', () => {
            expect(typeof logger.logApiCall).toBe('function');
            // Just test that it doesn't throw
            expect(() => logger.logApiCall('GET', '/test', 200, 150)).not.toThrow();
        });

        test('should have logCommand method', () => {
            expect(typeof logger.logCommand).toBe('function');
            // Just test that it doesn't throw
            expect(() => logger.logCommand('profile', 'user123', 'guild456', true)).not.toThrow();
        });

        test('should have logAuth method', () => {
            expect(typeof logger.logAuth).toBe('function');
            // Just test that it doesn't throw
            expect(() => logger.logAuth('user123', 'login', true)).not.toThrow();
        });

        test('should have logTrophyCheck method', () => {
            expect(typeof logger.logTrophyCheck).toBe('function');
            // Just test that it doesn't throw
            expect(() => logger.logTrophyCheck('user123', 5, 1)).not.toThrow();
        });

        test('should not log trophy checks with no new trophies unless debug', () => {
            logger.logTrophyCheck('user123', 0, 0);
            expect(consoleSpy).not.toHaveBeenCalled();
        });
    });

    describe('Child Loggers', () => {
        test('should create child logger with prefix', () => {
            const childLogger = logger.child('TEST');
            expect(childLogger).toBeDefined();
            expect(typeof childLogger.info).toBe('function');
            expect(typeof childLogger.error).toBe('function');
        });

        test('should support basic child logger functionality', () => {
            const childLogger = logger.child('TEST');
            
            // Just test that methods exist and don't throw
            expect(() => childLogger.error('Error')).not.toThrow();
            expect(() => childLogger.warn('Warning')).not.toThrow();
            expect(() => childLogger.info('Info')).not.toThrow();
        });
    });

    describe('Performance Timing', () => {
        test('should time synchronous functions', async () => {
            logger.setLevel('debug');
            jest.clearAllMocks(); // Clear the setLevel call
            
            const syncFunction = () => 'result';
            const result = await logger.time('sync-test', syncFunction);
            
            expect(result).toBe('result');
            // Should have logged start and completion
            expect(consoleSpy).toHaveBeenCalledTimes(2);
        });

        test('should handle errors in timed functions', async () => {
            const errorFunction = () => {
                throw new Error('Test error');
            };
            
            await expect(logger.time('error-test', errorFunction)).rejects.toThrow('Test error');
            // Should have logged the error
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

        test('should format objects in JSON', () => {
            const testObject = { key: 'value' };
            logger.info('Object:', testObject);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/Object:[\s\S]*"key": "value"/)
            );
        });
    });

    describe('Logger Properties', () => {
        test('should have required properties', () => {
            expect(logger.logLevel).toBeDefined();
            expect(typeof logger.setLevel).toBe('function');
            expect(typeof logger.child).toBe('function');
            expect(typeof logger.time).toBe('function');
        });

        test('should handle level setting', () => {
            const originalLevel = logger.logLevel;
            logger.setLevel('debug');
            expect(logger.logLevel).toBe('debug');
            
            // Restore original level
            logger.setLevel(originalLevel);
        });
    });
}); 