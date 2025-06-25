import { ValidationMiddleware } from '../../src/security/ValidationMiddleware';
import { z } from 'zod';

describe('ValidationMiddleware', () => {
  let middleware: ValidationMiddleware;

  beforeEach(() => {
    middleware = new ValidationMiddleware();
  });

  describe('Input Validation', () => {
    test('should validate correct virtual machine list parameters', () => {
      const params = {
        zoneid: '550e8400-e29b-41d4-a716-446655440000',
        state: 'Running',
        page: 1,
        pagesize: 50
      };

      const result = middleware.validateToolParameters('list_virtual_machines', params);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedInput).toEqual(params);
    });

    test('should reject invalid UUID format', () => {
      const params = {
        zoneid: 'invalid-uuid',
        state: 'Running'
      };

      const result = middleware.validateToolParameters('list_virtual_machines', params);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('zoneid');
    });

    test('should reject invalid state values', () => {
      const params = {
        zoneid: '550e8400-e29b-41d4-a716-446655440000',
        state: 'InvalidState'
      };

      const result = middleware.validateToolParameters('list_virtual_machines', params);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('should validate deploy virtual machine parameters', () => {
      const params = {
        serviceofferingid: '550e8400-e29b-41d4-a716-446655440000',
        templateid: '550e8400-e29b-41d4-a716-446655440001',
        zoneid: '550e8400-e29b-41d4-a716-446655440002',
        name: 'test-vm-01',
        displayname: 'Test Virtual Machine'
      };

      const result = middleware.validateToolParameters('deploy_virtual_machine', params);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedInput.name).toBe('test-vm-01');
    });

    test('should reject invalid VM names', () => {
      const params = {
        serviceofferingid: '550e8400-e29b-41d4-a716-446655440000',
        templateid: '550e8400-e29b-41d4-a716-446655440001',
        zoneid: '550e8400-e29b-41d4-a716-446655440002',
        name: 'invalid name with spaces and @symbols!'
      };

      const result = middleware.validateToolParameters('deploy_virtual_machine', params);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Security Checks', () => {
    test('should detect potential XSS in parameters', () => {
      const params = {
        name: '<script>alert("xss")</script>',
        description: 'Normal description'
      };

      const result = middleware.validateToolParameters('create_network', params);
      
      expect(result.securityWarnings).toBeDefined();
      expect(result.securityWarnings!.length).toBeGreaterThan(0);
      expect(result.securityWarnings![0]).toContain('Suspicious pattern detected');
    });

    test('should detect potential SQL injection patterns', () => {
      const params = {
        name: "test' OR 1=1 --",
        zoneid: '550e8400-e29b-41d4-a716-446655440000'
      };

      const result = middleware.validateToolParameters('create_network', params);
      
      expect(result.securityWarnings).toBeDefined();
      expect(result.securityWarnings!.some(w => w.includes('Suspicious pattern detected'))).toBe(true);
    });

    test('should detect null byte injection', () => {
      const params = {
        name: 'test\0null-byte',
        zoneid: '550e8400-e29b-41d4-a716-446655440000'
      };

      const result = middleware.validateToolParameters('create_network', params);
      
      expect(result.securityWarnings).toBeDefined();
      expect(result.securityWarnings!.some(w => w.includes('Null byte detected'))).toBe(true);
    });

    test('should detect oversized strings', () => {
      const params = {
        name: 'a'.repeat(20000), // Exceeds MAX_STRING_LENGTH
        zoneid: '550e8400-e29b-41d4-a716-446655440000'
      };

      const result = middleware.validateToolParameters('create_network', params);
      
      expect(result.securityWarnings).toBeDefined();
      expect(result.securityWarnings!.some(w => w.includes('String too long'))).toBe(true);
    });

    test('should detect oversized arrays', () => {
      const params = {
        networkids: new Array(2000).fill('550e8400-e29b-41d4-a716-446655440000'),
        serviceofferingid: '550e8400-e29b-41d4-a716-446655440000',
        templateid: '550e8400-e29b-41d4-a716-446655440001',
        zoneid: '550e8400-e29b-41d4-a716-446655440002',
        name: 'test-vm'
      };

      const result = middleware.validateToolParameters('deploy_virtual_machine', params);
      
      expect(result.securityWarnings).toBeDefined();
      expect(result.securityWarnings!.some(w => w.includes('Array too large'))).toBe(true);
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize HTML entities', () => {
      const input = {
        name: '<script>alert("test")</script>',
        description: 'Test & description with "quotes"'
      };

      const sanitized = middleware.sanitizeInput(input);
      
      expect(sanitized.name).toBe('&lt;script&gt;alert(&#x27;test&#x27;)&lt;/script&gt;');
      expect(sanitized.description).toBe('Test &amp; description with &quot;quotes&quot;');
    });

    test('should remove null bytes', () => {
      const input = {
        name: 'test\0null-byte\0end'
      };

      const sanitized = middleware.sanitizeInput(input);
      
      expect(sanitized.name).toBe('testnull-byteend');
    });

    test('should truncate long strings', () => {
      const input = {
        name: 'a'.repeat(20000)
      };

      const sanitized = middleware.sanitizeInput(input);
      
      expect(sanitized.name.length).toBeLessThanOrEqual(10000);
    });

    test('should sanitize nested objects and arrays', () => {
      const input = {
        config: {
          name: '<script>alert("nested")</script>',
          values: ['<script>test</script>', 'normal value']
        }
      };

      const sanitized = middleware.sanitizeInput(input);
      
      expect(sanitized.config.name).toBe('&lt;script&gt;alert(&#x27;nested&#x27;)&lt;/script&gt;');
      expect(sanitized.config.values[0]).toBe('&lt;script&gt;test&lt;/script&gt;');
      expect(sanitized.config.values[1]).toBe('normal value');
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within rate limit', () => {
      const toolName = 'list_virtual_machines';
      const clientId = 'test-client';

      for (let i = 0; i < 50; i++) {
        const allowed = middleware.checkRateLimit(toolName, clientId);
        expect(allowed).toBe(true);
      }
    });

    test('should block requests exceeding rate limit', () => {
      const toolName = 'list_virtual_machines';
      const clientId = 'test-client-heavy';

      // Exhaust rate limit
      for (let i = 0; i < 101; i++) {
        middleware.checkRateLimit(toolName, clientId);
      }

      // Next request should be blocked
      const allowed = middleware.checkRateLimit(toolName, clientId);
      expect(allowed).toBe(false);
    });

    test('should have separate rate limits per client', () => {
      const toolName = 'list_virtual_machines';
      
      // Exhaust rate limit for client1
      for (let i = 0; i < 101; i++) {
        middleware.checkRateLimit(toolName, 'client1');
      }

      // Client2 should still be allowed
      const allowed = middleware.checkRateLimit(toolName, 'client2');
      expect(allowed).toBe(true);
    });

    test('should reset rate limit after time window', (done) => {
      const toolName = 'list_virtual_machines';
      const clientId = 'test-client-reset';

      // Exhaust rate limit
      for (let i = 0; i < 101; i++) {
        middleware.checkRateLimit(toolName, clientId);
      }

      // Should be blocked
      expect(middleware.checkRateLimit(toolName, clientId)).toBe(false);

      // Clear rate limits (simulating time window reset)
      middleware.clearRateLimits();

      // Should be allowed again
      expect(middleware.checkRateLimit(toolName, clientId)).toBe(true);
      done();
    });
  });

  describe('CloudStack Parameter Validation', () => {
    test('should validate basic CloudStack command parameters', () => {
      const params = {
        command: 'listVirtualMachines',
        response: 'json',
        apikey: 'test-api-key',
        signature: 'test-signature'
      };

      const isValid = middleware.validateCloudStackParameters('listVirtualMachines', params);
      expect(isValid).toBe(true);
    });

    test('should reject empty command parameter', () => {
      const params = {
        command: '',
        response: 'json'
      };

      const isValid = middleware.validateCloudStackParameters('listVirtualMachines', params);
      expect(isValid).toBe(false);
    });
  });

  describe('Custom Schema Registration', () => {
    test('should allow registering custom tool schemas', () => {
      const customSchema = z.object({
        customField: z.string().min(1),
        customNumber: z.number().positive()
      });

      middleware.registerToolSchema('custom_tool', customSchema);

      const validParams = {
        customField: 'test',
        customNumber: 42
      };

      const invalidParams = {
        customField: '',
        customNumber: -1
      };

      const validResult = middleware.validateToolParameters('custom_tool', validParams);
      expect(validResult.isValid).toBe(true);

      const invalidResult = middleware.validateToolParameters('custom_tool', invalidParams);
      expect(invalidResult.isValid).toBe(false);
    });
  });

  describe('Tool Schema Fallback', () => {
    test('should use permissive schema for unknown tools', () => {
      const params = {
        anyField: 'any value',
        anotherField: 123
      };

      const result = middleware.validateToolParameters('unknown_tool', params);
      
      // Should pass validation but still perform security checks
      expect(result.isValid).toBe(true);
      expect(result.sanitizedInput).toEqual(params);
    });

    test('should still perform security checks on unknown tools', () => {
      const params = {
        maliciousField: '<script>alert("xss")</script>'
      };

      const result = middleware.validateToolParameters('unknown_tool', params);
      
      expect(result.securityWarnings).toBeDefined();
      expect(result.securityWarnings!.length).toBeGreaterThan(0);
    });
  });
});