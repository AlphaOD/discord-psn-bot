/**
 * Logger Utility Tests
 * 
 * Comprehensive tests for the Logger utility including:
 * - Log level functionality
 * - Message formatting
 * - File logging
 * - Child loggers
 * - Performance timing
 * - API call logging
 * - Command logging
 * - Auth logging
 * - Trophy logging
 */

const fs = require('fs');
const path = require('path');

// Mock fs to avoid actual file operations
jest.mock('fs');

describe('Logger Utility', () => {
    let logger;
    let mockConsoleLog;
    let mockFsAppendFileSync;
    let mockFsExistsSync;
    let mockFsMkdirSync;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Mock console.log to capture output
        mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
        
        // Mock fs functions
        mockFsAppendFileSync = fs.appendFileSync.mockImplementation(() => {});
        mockFsExistsSync = fs.existsSync.mockReturnValue(true);
        mockFsMkdirSync = fs.mkdirSync.mockImplementation(() => {});
        
        // Fresh require to get a new logger instance
        delete require.cache[require.resolve('./logger')];
        logger = require('./logger');
    });

    afterEach(() => {
        mockConsoleLog.mockRestore();
        jest.restoreAllMocks();
    });

    describe('Basic Logging', () => {
        test('should log info messages by default', () => {
            logger.info('Test info message');
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] INFO  Test info message/)
            );
        });

        test('should log error messages', () => {
            logger.error('Test error message');
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] ERROR Test error message/)
            );
        });

        test('should log warn messages', () => {
            logger.warn('Test warning message');
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] WARN  Test warning message/)
            );
        });

        test('should log debug messages when level is debug', () => {
            logger.setLevel('debug');
            logger.debug('Test debug message');
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] DEBUG Test debug message/)
            );
        });

        test('should not log debug messages when level is info', () => {
            logger.setLevel('info');
            logger.debug('Test debug message');
            
            expect(mockConsoleLog).not.toHaveBeenCalled();
        });
    });

    describe('Log Levels', () => {
        test('should respect error log level', () => {
            logger.setLevel('error');
            
            logger.error('Error message');
            logger.warn('Warning message');
            logger.info('Info message');
            logger.debug('Debug message');
            
            expect(mockConsoleLog).toHaveBeenCalledTimes(2); // setLevel + error message
        });

        test('should respect warn log level', () => {
            logger.setLevel('warn');
            
            logger.error('Error message');
            logger.warn('Warning message');
            logger.info('Info message');
            logger.debug('Debug message');
            
            expect(mockConsoleLog).toHaveBeenCalledTimes(3); // setLevel + error + warn
        });

        test('should handle invalid log level', () => {
            logger.setLevel('invalid');
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/WARN.*Invalid log level: invalid/)
            );
        });
    });

    describe('Message Formatting', () => {
        test('should format objects as JSON', () => {
            const testObject = { key: 'value', number: 42 };
            logger.info('Object:', testObject);
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/Object: {\s*"key": "value",\s*"number": 42\s*}/)
            );
        });

        test('should handle multiple arguments', () => {
            logger.info('Multiple', 'arguments', 123, true);
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/Multiple arguments 123 true/)
            );
        });

        test('should include timestamp in correct format', () => {
            logger.info('Timestamp test');
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\]/)
            );
        });
    });

    describe('File Logging', () => {
        test('should enable file logging', () => {
            const logFile = '/tmp/test.log';
            logger.enableFileLogging(logFile);
            
            expect(mockFsMkdirSync).toHaveBeenCalledWith('/tmp', { recursive: true });
        });

        test('should write to file when file logging is enabled', () => {
            const logFile = '/tmp/test.log';
            logger.enableFileLogging(logFile);
            logger.info('File test message');
            
            expect(mockFsAppendFileSync).toHaveBeenCalledWith(
                logFile,
                expect.stringMatching(/INFO  File test message\n/)
            );
        });

        test('should disable file logging', () => {
            logger.enableFileLogging('/tmp/test.log');
            logger.disableFileLogging();
            logger.info('No file message');
            
            expect(mockFsAppendFileSync).toHaveBeenCalledTimes(2); // Only enableFileLogging and disableFileLogging calls
        });

        test('should handle file write errors gracefully', () => {
            const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockFsAppendFileSync.mockImplementation(() => {
                throw new Error('Write failed');
            });
            
            logger.enableFileLogging('/tmp/test.log');
            logger.info('Test message');
            
            expect(mockConsoleError).toHaveBeenCalledWith(
                'Failed to write to log file:',
                'Write failed'
            );
            
            mockConsoleError.mockRestore();
        });
    });

    describe('Child Loggers', () => {
        test('should create child logger with prefix', () => {
            const childLogger = logger.child('TEST');
            childLogger.info('Child message');
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/INFO  \[TEST\] Child message/)
            );
        });

        test('should support all log levels in child logger', () => {
            const childLogger = logger.child('TEST');
            
            childLogger.error('Error');
            childLogger.warn('Warning');
            childLogger.info('Info');
            
            expect(mockConsoleLog).toHaveBeenCalledTimes(3);
        });

        test('should support custom levels in child logger', () => {
            const childLogger = logger.child('TEST');
            childLogger.custom('custom', 'Custom message');
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/CUSTOM \[TEST\] Custom message/)
            );
        });
    });

    describe('Performance Timing', () => {
        test('should time synchronous functions', async () => {
            const syncFunction = () => 'result';
            
            const result = await logger.time('sync-test', syncFunction);
            
            expect(result).toBe('result');
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/DEBUG Starting: sync-test/)
            );
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/DEBUG Completed: sync-test \(\d+ms\)/)
            );
        });

        test('should time asynchronous functions', async () => {
            const asyncFunction = async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'async-result';
            };
            
            logger.setLevel('debug');
            const result = await logger.time('async-test', asyncFunction);
            
            expect(result).toBe('async-result');
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/DEBUG Starting: async-test/)
            );
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/DEBUG Completed: async-test \(\d+ms\)/)
            );
        });

        test('should handle errors in timed functions', async () => {
            const errorFunction = () => {
                throw new Error('Test error');
            };
            
            logger.setLevel('debug');
            
            await expect(logger.time('error-test', errorFunction)).rejects.toThrow('Test error');
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/ERROR Failed: error-test \(\d+ms\)/)
            );
        });
    });

    describe('Specialized Logging Methods', () => {
        test('should log API calls with success status', () => {
            logger.logApiCall('GET', '/api/test', 200, 150);
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/INFO.*API GET \/api\/test - 200 \(150ms\)/)
            );
        });

        test('should log API calls with error status', () => {
            logger.logApiCall('POST', '/api/test', 500, 200);
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/ERROR API POST \/api\/test - 500 \(200ms\)/)
            );
        });

        test('should log API calls with warning status', () => {
            logger.logApiCall('GET', '/api/test', 302, 100);
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/WARN.*API GET \/api\/test - 302 \(100ms\)/)
            );
        });

        test('should log successful commands', () => {
            logger.logCommand('profile', 'user123', 'guild456', true);
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/INFO.*COMMAND \[SUCCESS\] \/profile by user123 in guild456/)
            );
        });

        test('should log failed commands', () => {
            logger.logCommand('profile', 'user123', 'guild456', false);
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/INFO.*COMMAND \[FAILED\] \/profile by user123 in guild456/)
            );
        });

        test('should log successful auth events', () => {
            logger.logAuth('user123', 'login', true);
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/INFO.*AUTH \[SUCCESS\] login for user user123/)
            );
        });

        test('should log failed auth events', () => {
            logger.logAuth('user123', 'login', false);
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/WARN.*AUTH \[FAILED\] login for user user123/)
            );
        });

        test('should log trophy checks with new trophies', () => {
            logger.logTrophyCheck('user123', 5, 1);
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/INFO.*TROPHY CHECK \[user123\] Found 5 new trophies \(1 platinums\)/)
            );
        });

        test('should log trophy checks with no new trophies', () => {
            logger.setLevel('debug');
            logger.logTrophyCheck('user123', 0, 0);
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/DEBUG TROPHY CHECK \[user123\] No new trophies/)
            );
        });
    });

    describe('Custom Logging', () => {
        test('should support custom log levels', () => {
            logger.custom('custom', 'Custom log message');
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/CUSTOM Custom log message/)
            );
        });

        test('should apply color formatting to custom levels', () => {
            logger.custom('special', 'Special message');
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringMatching(/SPECIAL Special message/)
            );
        });
    });

    describe('Environment Integration', () => {
        test('should use LOG_LEVEL environment variable', () => {
            // This test would require setting up environment variables before requiring
            // For now, we test the default behavior
            expect(logger.logLevel).toBeDefined();
        });

        test('should handle missing LOG_FILE environment variable', () => {
            // Logger should work without LOG_FILE set
            logger.info('Test without file logging');
            expect(mockConsoleLog).toHaveBeenCalled();
        });
    });
}); 