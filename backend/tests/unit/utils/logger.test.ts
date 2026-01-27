/**
 * Unit tests for logger utility
 * Tests unhandled rejection handler
 */

jest.mock('@config/environment', () => ({
  env: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'info',
  },
}));

describe('logger', () => {
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    // Re-mock after resetModules
    jest.doMock('@config/environment', () => ({
      env: {
        NODE_ENV: 'test',
        LOG_LEVEL: 'info',
      },
    }));
  });

  afterEach(() => {
    if (loggerErrorSpy) {
      loggerErrorSpy.mockRestore();
    }
    process.removeAllListeners('unhandledRejection');
  });

  it('should register an unhandledRejection handler that logs errors (line 81)', () => {
    // Import logger to register the handler
    const { logger } = require('@utils/logger');

    // Spy on logger.error
    loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);

    // Emit an unhandled rejection event
    const testReason = new Error('test rejection');
    const testPromise = Promise.resolve();

    process.emit('unhandledRejection' as any, testReason, testPromise);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Unhandled Rejection at:',
      { promise: testPromise, reason: testReason }
    );
  });

  it('should handle unhandledRejection with non-Error reason', () => {
    const { logger } = require('@utils/logger');

    loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);

    const testReason = 'string rejection reason';
    const testPromise = Promise.resolve();

    process.emit('unhandledRejection' as any, testReason, testPromise);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Unhandled Rejection at:',
      { promise: testPromise, reason: testReason }
    );
  });
});
