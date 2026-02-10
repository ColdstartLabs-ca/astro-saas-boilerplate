/**
 * Error Utilities Unit Tests
 *
 * Tests for error handling utilities including:
 * - ErrorCodes constants
 * - AppError class
 * - createErrorResponse and createSuccessResponse functions
 * - ErrorStatusMap
 * - serializeError function
 */

import { describe, it, expect } from 'vitest';
import {
  ErrorCodes,
  type ErrorCode,
  type IErrorResponse,
  type ISuccessResponse,
  AppError,
  createErrorResponse,
  createSuccessResponse,
  ErrorStatusMap,
  serializeError,
} from '@shared/utils/errors';

describe('shared/utils/errors', () => {
  describe('ErrorCodes', () => {
    it('should have all expected 4xx client error codes', () => {
      expect(ErrorCodes.INVALID_REQUEST).toBe('INVALID_REQUEST');
      expect(ErrorCodes.INVALID_INPUT).toBe('INVALID_INPUT');
      expect(ErrorCodes.INVALID_FILE).toBe('INVALID_FILE');
      expect(ErrorCodes.FILE_TOO_LARGE).toBe('FILE_TOO_LARGE');
      expect(ErrorCodes.INVALID_DIMENSIONS).toBe('INVALID_DIMENSIONS');
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.INSUFFICIENT_CREDITS).toBe('INSUFFICIENT_CREDITS');
      expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED');
      expect(ErrorCodes.BATCH_LIMIT_EXCEEDED).toBe('BATCH_LIMIT_EXCEEDED');
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCodes.PAYMENT_REQUIRED).toBe('PAYMENT_REQUIRED');
      expect(ErrorCodes.MODEL_NOT_FOUND).toBe('MODEL_NOT_FOUND');
      expect(ErrorCodes.MODEL_NOT_SUPPORTED).toBe('MODEL_NOT_SUPPORTED');
      expect(ErrorCodes.TIER_RESTRICTED).toBe('TIER_RESTRICTED');
    });

    it('should have all expected 5xx server error codes', () => {
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCodes.AI_UNAVAILABLE).toBe('AI_UNAVAILABLE');
      expect(ErrorCodes.PROCESSING_FAILED).toBe('PROCESSING_FAILED');
    });

    it('should have ErrorCode type that includes all error codes', () => {
      const clientErrors: ErrorCode[] = [
        ErrorCodes.INVALID_REQUEST,
        ErrorCodes.INVALID_INPUT,
        ErrorCodes.UNAUTHORIZED,
        ErrorCodes.FORBIDDEN,
        ErrorCodes.NOT_FOUND,
        ErrorCodes.INSUFFICIENT_CREDITS,
        ErrorCodes.RATE_LIMITED,
      ];

      const serverErrors: ErrorCode[] = [
        ErrorCodes.INTERNAL_ERROR,
        ErrorCodes.AI_UNAVAILABLE,
        ErrorCodes.PROCESSING_FAILED,
      ];

      expect(clientErrors.length).toBeGreaterThan(5);
      expect(serverErrors.length).toBe(3);
    });
  });

  describe('AppError', () => {
    it('should create an AppError with default status code 500', () => {
      const error = new AppError(ErrorCodes.INTERNAL_ERROR, 'Something went wrong');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AppError');
      expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR);
      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(500);
      expect(error.details).toBeUndefined();
    });

    it('should create an AppError with custom status code', () => {
      const error = new AppError(ErrorCodes.NOT_FOUND, 'Resource not found', 404);
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
      expect(error.message).toBe('Resource not found');
    });

    it('should create an AppError with details', () => {
      const details = { field: 'email', value: 'invalid' };
      const error = new AppError(ErrorCodes.VALIDATION_ERROR, 'Validation failed', 400, details);
      expect(error.details).toEqual(details);
    });

    it('should support string error codes', () => {
      const customCode = 'CUSTOM_ERROR';
      const error = new AppError(customCode, 'Custom error message', 400);
      expect(error.code).toBe(customCode);
      expect(error.statusCode).toBe(400);
    });

    it('should be throwable and catchable as Error', () => {
      expect(() => {
        throw new AppError(ErrorCodes.UNAUTHORIZED, 'Not authenticated', 401);
      }).toThrow(AppError);

      try {
        throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).statusCode).toBe(403);
      }
    });
  });

  describe('createErrorResponse', () => {
    it('should create a basic error response', () => {
      const response = createErrorResponse(ErrorCodes.NOT_FOUND, 'Resource not found', 404);
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCodes.NOT_FOUND);
      expect(response.body.error.message).toBe('Resource not found');
      expect(response.body.error.details).toBeUndefined();
      expect(response.body.error.requestId).toBeUndefined();
    });

    it('should create an error response with details', () => {
      const details = { field: 'email', reason: 'Invalid format' };
      const response = createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        400,
        details
      );
      expect(response.body.error.details).toEqual(details);
      expect(response.status).toBe(400);
    });

    it('should create an error response with requestId', () => {
      const requestId = 'req_123456';
      const response = createErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Server error',
        500,
        undefined,
        requestId
      );
      expect(response.body.error.requestId).toBe(requestId);
    });

    it('should create an error response with details and requestId', () => {
      const details = { userId: 'user_123' };
      const requestId = 'req_789';
      const response = createErrorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied',
        403,
        details,
        requestId
      );
      expect(response.body.error.details).toEqual(details);
      expect(response.body.error.requestId).toBe(requestId);
      expect(response.status).toBe(403);
    });

    it('should use default status code of 500 when not provided', () => {
      const response = createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Server error');
      expect(response.status).toBe(500);
    });

    it('should match IErrorResponse interface', () => {
      const response = createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid input');
      const errorResponse: IErrorResponse = response.body;
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toHaveProperty('code');
      expect(errorResponse.error).toHaveProperty('message');
    });
  });

  describe('createSuccessResponse', () => {
    it('should create a success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse(data);
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
    });

    it('should create a success response with primitive data', () => {
      expect(createSuccessResponse('test').data).toBe('test');
      expect(createSuccessResponse(42).data).toBe(42);
      expect(createSuccessResponse(true).data).toBe(true);
      expect(createSuccessResponse(null).data).toBeNull();
    });

    it('should create a success response with array data', () => {
      const data = [1, 2, 3];
      const response = createSuccessResponse(data);
      expect(response.data).toEqual(data);
    });

    it('should create a success response with object data', () => {
      const data = { user: { id: '1', name: 'Test' }, items: ['a', 'b'] };
      const response = createSuccessResponse(data);
      expect(response.data).toEqual(data);
    });

    it('should match ISuccessResponse interface', () => {
      const response: ISuccessResponse<{ id: string }> = createSuccessResponse({
        id: 'test',
      });
      expect(response.success).toBe(true);
      expect(response.data.id).toBe('test');
    });
  });

  describe('ErrorStatusMap', () => {
    it('should have status and default message for each error code', () => {
      Object.entries(ErrorStatusMap).forEach(([, config]) => {
        expect(config).toHaveProperty('status');
        expect(config).toHaveProperty('defaultMessage');
        expect(typeof config.status).toBe('number');
        expect(typeof config.defaultMessage).toBe('string');
        expect(config.status).toBeGreaterThanOrEqual(400);
        expect(config.status).toBeLessThan(600);
      });
    });

    it('should map 4xx errors correctly', () => {
      expect(ErrorStatusMap[ErrorCodes.INVALID_REQUEST].status).toBe(400);
      expect(ErrorStatusMap[ErrorCodes.UNAUTHORIZED].status).toBe(401);
      expect(ErrorStatusMap[ErrorCodes.FORBIDDEN].status).toBe(403);
      expect(ErrorStatusMap[ErrorCodes.NOT_FOUND].status).toBe(404);
      expect(ErrorStatusMap[ErrorCodes.INSUFFICIENT_CREDITS].status).toBe(402);
      expect(ErrorStatusMap[ErrorCodes.RATE_LIMITED].status).toBe(429);
    });

    it('should map 5xx errors correctly', () => {
      expect(ErrorStatusMap[ErrorCodes.INTERNAL_ERROR].status).toBe(500);
      expect(ErrorStatusMap[ErrorCodes.AI_UNAVAILABLE].status).toBe(503);
      expect(ErrorStatusMap[ErrorCodes.PROCESSING_FAILED].status).toBe(500);
    });

    it('should have meaningful default messages', () => {
      expect(ErrorStatusMap[ErrorCodes.INVALID_REQUEST].defaultMessage).toBe(
        'The request is invalid or malformed.'
      );
      expect(ErrorStatusMap[ErrorCodes.NOT_FOUND].defaultMessage).toBe(
        'The requested resource was not found.'
      );
      expect(ErrorStatusMap[ErrorCodes.RATE_LIMITED].defaultMessage).toBe(
        'Too many requests. Please try again later.'
      );
    });
  });

  describe('serializeError', () => {
    it('should serialize standard Error instances', () => {
      const error = new Error('Something went wrong');
      expect(serializeError(error)).toBe('Something went wrong');
    });

    it('should serialize AppError with code and message', () => {
      const error = new AppError(ErrorCodes.VALIDATION_ERROR, 'Validation failed', 400);
      expect(serializeError(error)).toBe('Validation failed');
    });

    it('should serialize AppError with details (returns message only)', () => {
      const details = { field: 'email', value: 'invalid' };
      const error = new AppError(ErrorCodes.VALIDATION_ERROR, 'Validation failed', 400, details);
      const serialized = serializeError(error);
      // AppError is an Error instance, so serializeError returns just the message
      expect(serialized).toBe('Validation failed');
      expect(error.details).toEqual(details); // Details are preserved on the error object
    });

    it('should serialize plain objects with message property', () => {
      const error = { message: 'Custom error message' };
      expect(serializeError(error)).toBe('Custom error message');
    });

    it('should serialize objects with code and message (AppError-like)', () => {
      const error = { code: 'CUSTOM_CODE', message: 'Error occurred', details: { key: 'value' } };
      const serialized = serializeError(error);
      expect(serialized).toContain('Error occurred');
      expect(serialized).toContain('{"key":"value"}');
    });

    it('should serialize API error responses', () => {
      const error = { error: { message: 'API error' } };
      expect(serializeError(error)).toBe('API error');
    });

    it('should serialize nested API error responses', () => {
      const error = {
        error: {
          message: 'Nested API error',
          code: 'API_ERROR',
        },
      };
      expect(serializeError(error)).toBe('Nested API error');
    });

    it('should serialize string errors directly', () => {
      expect(serializeError('String error')).toBe('String error');
      expect(serializeError('')).toBe('');
    });

    it('should serialize null as unknown error message', () => {
      expect(serializeError(null)).toBe('An unknown error occurred');
      expect(serializeError(undefined)).toBe('An unknown error occurred');
    });

    it('should serialize numbers as strings', () => {
      expect(serializeError(404)).toBe('404');
      expect(serializeError(0)).toBe('0');
    });

    it('should serialize booleans as strings', () => {
      expect(serializeError(true)).toBe('true');
      expect(serializeError(false)).toBe('false');
    });

    it('should serialize plain objects via JSON.stringify', () => {
      const obj = { key: 'value', nested: { prop: 123 } };
      const serialized = serializeError(obj);
      expect(serialized).toBe('{"key":"value","nested":{"prop":123}}');
    });

    it('should return unknown error message for empty objects', () => {
      expect(serializeError({})).toBe('An unknown error occurred');
      expect(serializeError([])).toBe('An unknown error occurred');
    });

    it('should return unknown error message for objects that throw on stringify', () => {
      // Create an object with circular reference
      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;
      const serialized = serializeError(circular);
      expect(serialized).toBe('An unknown error occurred');
    });

    it('should handle Error subclasses', () => {
      const TypeErrorInstance = new TypeError('Type error');
      expect(serializeError(TypeErrorInstance)).toBe('Type error');

      const RangeErrorInstance = new RangeError('Range error');
      expect(serializeError(RangeErrorInstance)).toBe('Range error');
    });

    it('should handle Error without message', () => {
      const error = new Error();
      expect(serializeError(error)).toBe('');
    });

    it('should handle AppError without details', () => {
      const error = new AppError(ErrorCodes.NOT_FOUND, 'Not found', 404);
      const serialized = serializeError(error);
      expect(serialized).toBe('Not found');
      expect(serialized).not.toContain('undefined');
    });
  });
});
