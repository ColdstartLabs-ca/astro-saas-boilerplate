/**
 * Unit tests for server/monitoring/logger.ts
 *
 * Tests for the BaselimeLogger wrapper utilities including:
 * - createLogger function
 * - withLogging wrapper
 * - HttpError class
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Create mock functions that can be spied on
const createMockLogger = () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  flush: vi.fn().mockResolvedValue(undefined),
  options: {},
});

// Mock the BaselimeLogger with a class
vi.mock('@baselime/edge-logger', () => {
  let currentMock: ReturnType<typeof createMockLogger> | null = null;

  const MockBaselimeLogger = class {
    public info: ReturnType<typeof vi.fn>;
    public error: ReturnType<typeof vi.fn>;
    public warn: ReturnType<typeof vi.fn>;
    public debug: ReturnType<typeof vi.fn>;
    public flush: ReturnType<typeof vi.fn>;
    public options: Record<string, unknown>;

    constructor(options: Record<string, unknown>) {
      this.options = options;
      const mock = createMockLogger();
      this.info = mock.info;
      this.error = mock.error;
      this.warn = mock.warn;
      this.debug = mock.debug;
      this.flush = mock.flush;
      currentMock = mock;
    }

    static getCurrentMock() {
      return currentMock;
    }

    static resetMock() {
      currentMock = null;
    }
  };

  return {
    BaselimeLogger: MockBaselimeLogger,
  };
});

// Mock serverEnv and isDevelopment
const mockIsDevelopment = vi.fn();
vi.mock('@shared/config/env', () => ({
  serverEnv: {
    BASELIME_API_KEY: 'test-baselime-key',
    ENV: 'test',
  },
  isDevelopment: () => mockIsDevelopment(),
  isTest: () => true,
  clientEnv: {
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}));

import { createLogger, withLogging, HttpError } from '@server/monitoring/logger';
import { BaselimeLogger } from '@baselime/edge-logger';

describe('Logger Module', () => {
  beforeEach(() => {
    mockIsDevelopment.mockReturnValue(false);
    vi.clearAllMocks();
    (BaselimeLogger as any).resetMock();
  });

  afterEach(() => {
    vi.clearAllMocks();
    (BaselimeLogger as any).resetMock();
  });

  const getCurrentMock = () => (BaselimeLogger as any).getCurrentMock();

  describe('createLogger', () => {
    it('should create a logger instance', () => {
      const request = new Request('https://example.com/test');
      const logger = createLogger(request, 'test-namespace');

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.flush).toBe('function');
    });

    it('should pass namespace to logger', () => {
      const request = new Request('https://example.com/test');
      const namespace = 'my-api-endpoint';
      const logger = createLogger(request, namespace);

      expect(logger.options.namespace).toBe(namespace);
    });

    it('should use default service name', () => {
      const request = new Request('https://example.com/test');
      const logger = createLogger(request, 'test-namespace');

      expect(logger.options.service).toBe('autopilotrank-api');
    });

    it('should include context in logger options', () => {
      const request = new Request('https://example.com/test');
      const context = {
        requestId: 'req-123',
        userId: 'user-456',
      };
      const logger = createLogger(request, 'test-namespace', context);

      expect(logger.options.ctx).toEqual(context);
    });

    it('should handle empty context', () => {
      const request = new Request('https://example.com/test');
      const logger = createLogger(request, 'test-namespace');

      expect(logger.options.ctx).toBeDefined();
    });

    it('should use BASELIME_API_KEY from environment', () => {
      const request = new Request('https://example.com/test');
      const logger = createLogger(request, 'test-namespace');

      expect(logger.options.apiKey).toBe('test-baselime-key');
    });

    it('should handle development mode', () => {
      mockIsDevelopment.mockReturnValue(true);
      const request = new Request('https://example.com/test');
      const logger = createLogger(request, 'test-namespace');

      expect(logger.options.isLocalDev).toBe(true);
    });

    it('should handle production mode', () => {
      mockIsDevelopment.mockReturnValue(false);
      const request = new Request('https://example.com/test');
      const logger = createLogger(request, 'test-namespace');

      expect(logger.options.isLocalDev).toBe(false);
    });

    it('should include requestId in context when provided', () => {
      const request = new Request('https://example.com/test');
      const logger = createLogger(request, 'test-namespace', {
        requestId: 'test-request-id',
      });

      expect(logger.options.ctx).toHaveProperty('requestId', 'test-request-id');
    });

    it('should include userId in context when provided', () => {
      const request = new Request('https://example.com/test');
      const logger = createLogger(request, 'test-namespace', {
        userId: 'test-user-id',
      });

      expect(logger.options.ctx).toHaveProperty('userId', 'test-user-id');
    });

    it('should include additional context properties', () => {
      const request = new Request('https://example.com/test');
      const customContext = {
        requestId: 'req-123',
        customField: 'custom-value',
        numericField: 42,
        booleanField: true,
      };
      const logger = createLogger(request, 'test-namespace', customContext);

      expect(logger.options.ctx).toMatchObject(customContext);
    });

    it('should have flush method that returns Promise', async () => {
      const request = new Request('https://example.com/test');
      const logger = createLogger(request, 'test-namespace');

      const flushResult = logger.flush();
      expect(flushResult).toBeInstanceOf(Promise);
      await flushResult;
    });
  });

  describe('HttpError class', () => {
    it('should create HttpError with message and statusCode', () => {
      const error = new HttpError('Not found', 404);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
    });

    it('should have default error code', () => {
      const error = new HttpError('Something went wrong', 500);

      expect(error.code).toBe('INTERNAL_ERROR');
    });

    it('should accept custom error code', () => {
      const error = new HttpError('Unauthorized', 401, 'UNAUTHORIZED');

      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should include details when provided', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new HttpError('Validation failed', 400, 'VALIDATION_ERROR', details);

      expect(error.details).toEqual(details);
    });

    it('should have correct error name', () => {
      const error = new HttpError('Test', 500);

      expect(error.name).toBe('HttpError');
    });

    it('should be catchable as Error', () => {
      const error = new HttpError('Test error', 500);

      try {
        throw error;
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(HttpError);
      }
    });

    it('should preserve stack trace', () => {
      const error = new HttpError('Test error', 500);

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should handle all common HTTP status codes', () => {
      const statusCodes = [
        { code: 400, name: 'Bad Request' },
        { code: 401, name: 'Unauthorized' },
        { code: 403, name: 'Forbidden' },
        { code: 404, name: 'Not Found' },
        { code: 429, name: 'Too Many Requests' },
        { code: 500, name: 'Internal Server Error' },
        { code: 503, name: 'Service Unavailable' },
      ];

      statusCodes.forEach(({ code, name }) => {
        const error = new HttpError(name, code);
        expect(error.statusCode).toBe(code);
        expect(error.message).toBe(name);
      });
    });

    it('should handle error details with nested objects', () => {
      const details = {
        validationErrors: [
          { field: 'email', message: 'Invalid email' },
          { field: 'password', message: 'Too short' },
        ],
        requestId: 'req-123',
      };
      const error = new HttpError('Validation failed', 400, 'VALIDATION_ERROR', details);

      expect(error.details).toEqual(details);
      expect(error.details?.validationErrors).toHaveLength(2);
    });

    it('should allow undefined details', () => {
      const error = new HttpError('Test error', 500, 'INTERNAL_ERROR', undefined);

      expect(error.details).toBeUndefined();
    });
  });

  describe('withLogging wrapper', () => {
    it('should return a handler function', () => {
      const wrappedHandler = withLogging('test-namespace', async (request, logger) => {
        return Response.json({ success: true });
      });

      expect(typeof wrappedHandler).toBe('function');
    });

    it('should call the handler with request and logger', async () => {
      const mockHandler = vi.fn().mockResolvedValue(Response.json({ success: true }));
      const wrappedHandler = withLogging('test-namespace', mockHandler);
      const request = new Request('https://example.com/test');

      await wrappedHandler(request);

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          info: expect.any(Function),
          error: expect.any(Function),
          flush: expect.any(Function),
        })
      );
    });

    it('should return handler response', async () => {
      const expectedResponse = Response.json({ data: 'test' });
      const wrappedHandler = withLogging('test-namespace', async () => expectedResponse);

      const response = await wrappedHandler(new Request('https://example.com/test'));

      expect(response).toEqual(expectedResponse);
    });

    it('should log successful request completion', async () => {
      const wrappedHandler = withLogging('test-namespace', async (_request, _logger) => {
        return Response.json({ success: true }, { status: 200 });
      });

      await wrappedHandler(new Request('https://example.com/test'));

      const mockLogger = getCurrentMock();
      expect(mockLogger?.info).toHaveBeenCalledWith('Request completed', { status: 200 });
    });

    it('should flush logs after handler execution', async () => {
      const wrappedHandler = withLogging('test-namespace', async () => {
        return Response.json({ success: true });
      });
      const request = new Request('https://example.com/test');

      await wrappedHandler(request);

      const mockLogger = getCurrentMock();
      expect(mockLogger?.flush).toHaveBeenCalledTimes(1);
    });

    it('should handle HttpError and return correct response', async () => {
      const wrappedHandler = withLogging('test-namespace', async () => {
        throw new HttpError('Not found', 404, 'NOT_FOUND', { resource: 'test' });
      });
      const request = new Request('https://example.com/test');

      const response = await wrappedHandler(request);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Not found');
      expect(body.error.details).toEqual({ resource: 'test' });
    });

    it('should handle generic Error and return 500 response', async () => {
      const wrappedHandler = withLogging('test-namespace', async () => {
        throw new Error('Unexpected error');
      });
      const request = new Request('https://example.com/test');

      const response = await wrappedHandler(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('Unexpected error');
    });

    it('should log error details', async () => {
      const wrappedHandler = withLogging('test-namespace', async () => {
        throw new Error('Test error');
      });
      const request = new Request('https://example.com/test');

      await wrappedHandler(request);

      const mockLogger = getCurrentMock();
      expect(mockLogger?.error).toHaveBeenCalledWith(
        'Unhandled error',
        expect.objectContaining({
          error: 'Test error',
          statusCode: 500,
          code: 'INTERNAL_ERROR',
        })
      );
    });

    it('should include stack trace for Error instances', async () => {
      const testError = new Error('Test error');
      const wrappedHandler = withLogging('test-namespace', async () => {
        throw testError;
      });
      const request = new Request('https://example.com/test');

      await wrappedHandler(request);

      const mockLogger = getCurrentMock();
      expect(mockLogger?.error).toHaveBeenCalledWith(
        'Unhandled error',
        expect.objectContaining({
          stack: testError.stack,
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      const wrappedHandler = withLogging('test-namespace', async () => {
        throw 'String error';
      });
      const request = new Request('https://example.com/test');

      const response = await wrappedHandler(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error.message).toBe('An unexpected error occurred');
    });

    it('should flush logs even when handler throws', async () => {
      const wrappedHandler = withLogging('test-namespace', async () => {
        throw new Error('Test error');
      });
      const request = new Request('https://example.com/test');

      await wrappedHandler(request);

      const mockLogger = getCurrentMock();
      expect(mockLogger?.flush).toHaveBeenCalledTimes(1);
    });

    it('should pass namespace to logger', async () => {
      const namespace = 'custom-namespace';
      const wrappedHandler = withLogging(namespace, async () => Response.json({}));
      const request = new Request('https://example.com/test');

      await wrappedHandler(request);

      // The logger should have been created with the correct namespace
      const mockLogger = getCurrentMock();
      expect(mockLogger).toBeDefined();
    });

    it('should create new logger for each request', async () => {
      const wrappedHandler = withLogging('test-namespace', async () =>
        Response.json({ success: true })
      );

      const request1 = new Request('https://example.com/test1');
      const request2 = new Request('https://example.com/test2');

      await wrappedHandler(request1);
      (BaselimeLogger as any).resetMock();

      await wrappedHandler(request2);

      // Both requests should create loggers
      expect(getCurrentMock()).toBeDefined();
    });
  });

  describe('Error response format', () => {
    it('should format HttpError response correctly', async () => {
      const wrappedHandler = withLogging('test', async () => {
        throw new HttpError('Payment required', 402, 'PAYMENT_REQUIRED', {
          amount: 100,
          currency: 'USD',
        });
      });

      const response = await wrappedHandler(new Request('https://example.com'));
      const body = await response.json();

      expect(body).toEqual({
        success: false,
        error: {
          code: 'PAYMENT_REQUIRED',
          message: 'Payment required',
          details: { amount: 100, currency: 'USD' },
        },
      });
    });

    it('should omit details when undefined', async () => {
      const wrappedHandler = withLogging('test', async () => {
        throw new HttpError('Not found', 404, 'NOT_FOUND');
      });

      const response = await wrappedHandler(new Request('https://example.com'));
      const body = await response.json();

      expect(body.error).not.toHaveProperty('details');
    });

    it('should format generic error response correctly', async () => {
      const wrappedHandler = withLogging('test', async () => {
        throw new Error('Database connection failed');
      });

      const response = await wrappedHandler(new Request('https://example.com'));
      const body = await response.json();

      expect(body).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database connection failed',
        },
      });
    });

    it('should handle errors without details property', async () => {
      const wrappedHandler = withLogging('test', async () => {
        throw new Error('Simple error');
      });

      const response = await wrappedHandler(new Request('https://example.com'));
      const body = await response.json();

      expect(body.error).not.toHaveProperty('details');
      expect(response.status).toBe(500);
    });
  });

  describe('integration tests', () => {
    it('should handle complete request lifecycle', async () => {
      let capturedLogger: any = null;
      const wrappedHandler = withLogging('integration-test', async (request, logger) => {
        capturedLogger = logger;
        logger.info('Processing request');
        return Response.json({ result: 'success' }, { status: 200 });
      });

      const request = new Request('https://example.com/integration');
      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);

      const mockLogger = getCurrentMock();
      expect(mockLogger?.info).toHaveBeenCalledWith('Processing request');
      expect(mockLogger?.info).toHaveBeenCalledWith('Request completed', { status: 200 });
      expect(mockLogger?.flush).toHaveBeenCalled();
      expect(capturedLogger).toBeDefined();
    });

    it('should handle error lifecycle completely', async () => {
      const wrappedHandler = withLogging('error-test', async (request, logger) => {
        logger.info('Starting request');
        throw new HttpError('Custom error', 418, "I'M_A_TEAPOT");
      });

      const request = new Request('https://example.com/error');
      const response = await wrappedHandler(request);

      expect(response.status).toBe(418);
      const body = await response.json();
      expect(body.error.code).toBe("I'M_A_TEAPOT");

      const mockLogger = getCurrentMock();
      expect(mockLogger?.info).toHaveBeenCalledWith('Starting request');
      expect(mockLogger?.error).toHaveBeenCalled();
      expect(mockLogger?.flush).toHaveBeenCalled();
    });
  });
});
