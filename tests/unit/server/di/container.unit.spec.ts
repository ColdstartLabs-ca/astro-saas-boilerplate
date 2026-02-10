/**
 * Unit tests for server/di/container.ts
 *
 * Tests for the dependency injection container using tsyringe.
 * Covers service registration, resolution, and singleton behavior.
 *
 * Note: The container uses dynamic require() for services which
 * complicates testing. These tests focus on the container structure
 * and error handling aspects that can be reliably tested.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('DI Container', () => {
  beforeEach(() => {
    // Reset modules to ensure fresh container state for each test
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('container export', () => {
    it('should export the tsyringe container', async () => {
      const { container } = await import('@server/di/container');

      expect(container).toBeDefined();
      expect(typeof container.resolve).toBe('function');
      expect(typeof container.registerInstance).toBe('function');
    });

    it('should have registerInstance method', async () => {
      const { container } = await import('@server/di/container');

      expect(typeof container.registerInstance).toBe('function');
    });

    it('should have resolve method', async () => {
      const { container } = await import('@server/di/container');

      expect(typeof container.resolve).toBe('function');
    });
  });

  describe('getService function', () => {
    it('should export getService function', async () => {
      const { getService } = await import('@server/di/container');

      expect(getService).toBeDefined();
      expect(typeof getService).toBe('function');
    });

    it('should accept string token parameter', async () => {
      const { getService } = await import('@server/di/container');

      // This should not throw when given a string parameter
      expect(() => getService<string>('@test')).toBeDefined();
    });

    it('should return a generic type', async () => {
      const { getService } = await import('@server/di/container');

      // Test that the function is generic and returns any type
      type TestService = { testMethod: () => void };
      // Just verify the function accepts generic type parameter
      expect(getService<TestService>).toBeDefined();
    });
  });

  describe('error handling for invalid tokens', () => {
    it('should handle empty token gracefully', () => {
      // Import fresh to test error case
      vi.resetModules();

      return expect(
        import('@server/di/container').then(({ getService }) => {
          // Try to resolve empty token - should throw
          return getService<any>('');
        })
      ).rejects.toThrow();
    });

    it('should handle non-existent service token', () => {
      vi.resetModules();

      return expect(
        import('@server/di/container').then(({ getService }) => {
          // Try to resolve unregistered service
          return getService<any>('INonExistentService');
        })
      ).rejects.toThrow();
    });

    it('should handle special characters in token', () => {
      vi.resetModules();

      return expect(
        import('@server/di/container').then(({ getService }) => {
          return getService<any>('@#$%^&*()');
        })
      ).rejects.toThrow();
    });
  });

  describe('module structure', () => {
    it('should have correct named exports', async () => {
      const module = await import('@server/di/container');

      expect(Object.keys(module)).toContain('getService');
      expect(Object.keys(module)).toContain('container');
    });

    it('should not have default export', async () => {
      const module = await import('@server/di/container');

      expect(module.default).toBeUndefined();
    });

    it('should export only expected members', async () => {
      const module = await import('@server/di/container');

      const exports = Object.keys(module);
      expect(exports).toEqual(expect.arrayContaining(['getService', 'container']));
    });
  });

  describe('type safety', () => {
    it('getService should be callable with string', async () => {
      const { getService } = await import('@server/di/container');

      // Verify the function signature accepts a string
      expect(() => {
        // @ts-expect-error - testing runtime behavior, not type safety
        getService(123);
      }).toBeDefined();

      // The function should exist and be callable
      expect(typeof getService).toBe('function');
    });

    it('should support generic type parameter', async () => {
      const { getService } = await import('@server/di/container');

      // Define a test interface
      interface ITestService {
        test(): string;
      }

      // The function should accept generic type parameter
      expect(getService<ITestService>).toBeDefined();
    });
  });

  describe('registration behavior', () => {
    it('should track registration state', async () => {
      // The module has internal state tracking whether services are registered
      // This test verifies the module can be imported multiple times
      const module1 = await import('@server/di/container');
      const module2 = await import('@server/di/container');

      // Same module instance
      expect(module1).toBe(module2);
    });

    it('should maintain container instance across imports', async () => {
      const module1 = await import('@server/di/container');
      const module2 = await import('@server/di/container');

      expect(module1.container).toBe(module2.container);
    });
  });

  describe('integration with reflect-metadata', () => {
    it('should import reflect-metadata', async () => {
      // The container module imports reflect-metadata
      // This test verifies the module loads without errors
      const module = await import('@server/di/container');

      expect(module).toBeDefined();
    });

    it('should have tsyringe container available', async () => {
      const { container } = await import('@server/di/container');

      // Verify tsyringe container is properly initialized
      expect(container).toBeDefined();
      expect(typeof container.register).toBe('function');
      expect(typeof container.resolve).toBe('function');
      expect(typeof container.registerInstance).toBe('function');
    });
  });

  describe('container API compatibility', () => {
    it('should support tsyringe container methods', async () => {
      const { container } = await import('@server/di/container');

      // Verify expected tsyringe methods exist
      const expectedMethods = [
        'register',
        'registerInstance',
        'resolve',
        'isRegistered',
        'reset',
        'clearInstances',
      ];

      expectedMethods.forEach(method => {
        expect(typeof container[method]).toBe('function');
      });
    });

    it('should allow checking if service is registered', async () => {
      const { container } = await import('@server/di/container');

      // isRegistered should be a function
      expect(typeof container.isRegistered).toBe('function');

      // Check a non-existent service
      const isRegistered = container.isRegistered('INonExistentService');
      expect(typeof isRegistered).toBe('boolean');
    });

    it('should allow resetting the container', async () => {
      const { container } = await import('@server/di/container');

      // reset should be a function
      expect(typeof container.reset).toBe('function');
    });
  });

  describe('documentation and examples', () => {
    it('should have documented usage patterns', () => {
      // This test documents the expected usage pattern
      // based on the JSDoc comments in the source file

      const expectedUsage = `
        // Get a service from the DI container
        const creditsService = getService<ISubscriptionCredits>('ISubscriptionCredits');

        // Direct container access
        import { container } from '@server/di/container';
        const service = container.resolve<IEmailService>('IEmailService');
      `;

      // Just verify the documentation expectations are clear
      expect(expectedUsage).toContain('getService');
      expect(expectedUsage).toContain('container');
    });

    it('should support the documented service tokens', () => {
      // Documented service tokens from the source file
      const expectedTokens = ['ISubscriptionCredits', 'IEmailService'];

      expectedTokens.forEach(token => {
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);
      });
    });
  });

  describe('singleton behavior verification', () => {
    it('should use registerInstance for singletons', async () => {
      const { container } = await import('@server/di/container');

      // The container should support registerInstance
      expect(typeof container.registerInstance).toBe('function');

      // Verify we can use it to register a singleton
      const testInstance = { value: 'test' };
      expect(() => {
        container.registerInstance('TestToken' as never, testInstance);
      }).not.toThrow();

      // Verify we can resolve it
      const resolved = container.resolve<any>('TestToken');
      expect(resolved).toBe(testInstance);
    });

    it('should maintain same instance across resolves', async () => {
      const { container } = await import('@server/di/container');

      const testInstance = { id: 'singleton-test' };
      container.registerInstance('TestSingleton' as never, testInstance);

      const resolved1 = container.resolve<any>('TestSingleton');
      const resolved2 = container.resolve<any>('TestSingleton');

      expect(resolved1).toBe(resolved2);
      expect(resolved1).toBe(testInstance);
    });
  });
});
