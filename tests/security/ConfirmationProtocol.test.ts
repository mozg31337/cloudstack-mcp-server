import {
  createConfirmationRequiredError,
  createConfirmationTimeoutError,
  createConfirmationInvalidError,
  createConfirmationDeniedError,
  createConfirmationExpiredError,
  createConfirmationResponse,
  isConfirmationError,
  extractConfirmationRequest,
  formatConfirmationForDisplay,
  validateConfirmationResponse,
  MCP_CONFIRMATION_ERROR_CODES,
  MCPConfirmationError,
  MCPConfirmationResponse
} from '../../src/security/ConfirmationProtocol';

describe('ConfirmationProtocol', () => {
  const mockConfirmationRequest = {
    correlationId: 'test-correlation-id',
    title: '⚠️  DANGEROUS OPERATION CONFIRMATION REQUIRED',
    description: 'Permanently destroy a virtual machine and all its data',
    warningMessage: 'This will PERMANENTLY DESTROY the virtual machine and ALL DATA stored on its disks. This action CANNOT be undone.',
    confirmationInstructions: 'To proceed with this operation, type exactly: "destroy permanently"',
    actionDetails: {
      category: 'Virtual Machine Operations',
      severity: 'CRITICAL',
      reversible: false,
      impactScope: 'single-resource'
    },
    parameters: {
      id: 'vm-12345',
      expunge: true
    },
    expiresAt: Date.now() + 300000
  };

  describe('Error Creation Functions', () => {
    test('should create confirmation required error', () => {
      const expiresAt = Date.now() + 300000;
      const error = createConfirmationRequiredError(mockConfirmationRequest, expiresAt);

      expect(error.code).toBe(MCP_CONFIRMATION_ERROR_CODES.CONFIRMATION_REQUIRED);
      expect(error.message).toBe('Dangerous operation requires explicit confirmation');
      expect(error.data?.confirmationRequest).toBeDefined();
      expect(error.data?.confirmationRequest?.correlationId).toBe('test-correlation-id');
      expect(error.data?.confirmationRequest?.expiresAt).toBe(expiresAt);
    });

    test('should create confirmation timeout error', () => {
      const correlationId = 'timeout-correlation-id';
      const error = createConfirmationTimeoutError(correlationId);

      expect(error.code).toBe(MCP_CONFIRMATION_ERROR_CODES.CONFIRMATION_TIMEOUT);
      expect(error.message).toBe('Confirmation request timed out');
      expect(error.data?.confirmationRequest?.correlationId).toBe(correlationId);
      expect(error.data?.confirmationRequest?.title).toBe('Confirmation Timeout');
    });

    test('should create confirmation invalid error', () => {
      const correlationId = 'invalid-correlation-id';
      const reason = 'Incorrect confirmation text';
      const error = createConfirmationInvalidError(correlationId, reason);

      expect(error.code).toBe(MCP_CONFIRMATION_ERROR_CODES.CONFIRMATION_INVALID);
      expect(error.message).toBe(`Invalid confirmation: ${reason}`);
      expect(error.data?.confirmationRequest?.correlationId).toBe(correlationId);
      expect(error.data?.confirmationRequest?.parameters?.reason).toBe(reason);
    });

    test('should create confirmation denied error', () => {
      const correlationId = 'denied-correlation-id';
      const error = createConfirmationDeniedError(correlationId);

      expect(error.code).toBe(MCP_CONFIRMATION_ERROR_CODES.CONFIRMATION_DENIED);
      expect(error.message).toBe('Operation cancelled by user');
      expect(error.data?.confirmationRequest?.correlationId).toBe(correlationId);
      expect(error.data?.confirmationRequest?.title).toBe('Operation Cancelled');
    });

    test('should create confirmation expired error', () => {
      const correlationId = 'expired-correlation-id';
      const error = createConfirmationExpiredError(correlationId);

      expect(error.code).toBe(MCP_CONFIRMATION_ERROR_CODES.CONFIRMATION_EXPIRED);
      expect(error.message).toBe('Confirmation request has expired');
      expect(error.data?.confirmationRequest?.correlationId).toBe(correlationId);
      expect(error.data?.confirmationRequest?.title).toBe('Confirmation Expired');
    });
  });

  describe('Confirmation Response Creation', () => {
    test('should create confirmation response with all fields', () => {
      const correlationId = 'test-correlation-id';
      const confirmed = true;
      const userInput = 'destroy permanently';

      const response = createConfirmationResponse(correlationId, confirmed, userInput);

      expect(response.correlationId).toBe(correlationId);
      expect(response.confirmed).toBe(confirmed);
      expect(response.userInput).toBe(userInput);
      expect(response.timestamp).toBeGreaterThan(0);
      expect(response.timestamp).toBeLessThanOrEqual(Date.now());
    });

    test('should create confirmation response without user input', () => {
      const correlationId = 'test-correlation-id';
      const confirmed = false;

      const response = createConfirmationResponse(correlationId, confirmed);

      expect(response.correlationId).toBe(correlationId);
      expect(response.confirmed).toBe(confirmed);
      expect(response.userInput).toBeUndefined();
      expect(response.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Error Detection and Extraction', () => {
    test('should identify confirmation errors correctly', () => {
      const confirmationError = createConfirmationRequiredError(mockConfirmationRequest, Date.now() + 300000);
      const regularError = new Error('Regular error');
      const objectWithCode = { code: 123, message: 'Not a confirmation error' };

      expect(isConfirmationError(confirmationError)).toBe(true);
      expect(isConfirmationError(regularError)).toBe(false);
      expect(isConfirmationError(objectWithCode)).toBe(false);
      expect(isConfirmationError(null)).toBe(false);
      expect(isConfirmationError(undefined)).toBe(false);
    });

    test('should extract confirmation request from error', () => {
      const error = createConfirmationRequiredError(mockConfirmationRequest, Date.now() + 300000);
      const extracted = extractConfirmationRequest(error);

      expect(extracted).toBeDefined();
      expect(extracted.correlationId).toBe(mockConfirmationRequest.correlationId);
      expect(extracted.title).toBe(mockConfirmationRequest.title);
      expect(extracted.description).toBe(mockConfirmationRequest.description);
    });

    test('should return null when extracting from invalid error', () => {
      const invalidError: MCPConfirmationError = {
        code: MCP_CONFIRMATION_ERROR_CODES.CONFIRMATION_REQUIRED,
        message: 'Test error'
        // No data property
      };

      const extracted = extractConfirmationRequest(invalidError);
      expect(extracted).toBeNull();
    });
  });

  describe('Confirmation Request Formatting', () => {
    test('should format confirmation request for display', () => {
      const formatted = formatConfirmationForDisplay(mockConfirmationRequest);

      expect(formatted).toContain('DANGEROUS OPERATION CONFIRMATION REQUIRED');
      expect(formatted).toContain('Permanently destroy a virtual machine');
      expect(formatted).toContain('PERMANENTLY DESTROY');
      expect(formatted).toContain('destroy permanently');
      expect(formatted).toContain('Virtual Machine Operations');
      expect(formatted).toContain('CRITICAL');
      expect(formatted).toContain('Reversible: No');
      expect(formatted).toContain('single-resource');
      expect(formatted).toContain('vm-12345');
      expect(formatted).toContain('expunge: true');
      expect(formatted).toContain('test-correlation-id');
    });

    test('should handle confirmation request without parameters', () => {
      const requestWithoutParams = {
        ...mockConfirmationRequest,
        parameters: {}
      };

      const formatted = formatConfirmationForDisplay(requestWithoutParams);

      expect(formatted).toContain('DANGEROUS OPERATION CONFIRMATION REQUIRED');
      expect(formatted).not.toContain('vm-12345');
      expect(formatted).toContain('test-correlation-id');
    });

    test('should format expires at timestamp correctly', () => {
      const expiresAt = new Date('2024-01-01T12:00:00Z').getTime();
      const requestWithExpiry = {
        ...mockConfirmationRequest,
        expiresAt
      };

      const formatted = formatConfirmationForDisplay(requestWithExpiry);

      expect(formatted).toContain('**Expires at:** 2024-01-01T12:00:00.000Z');
    });
  });

  describe('Response Validation', () => {
    test('should validate valid confirmation response', () => {
      const validResponse: MCPConfirmationResponse = {
        correlationId: 'test-correlation-id',
        confirmed: true,
        userInput: 'destroy permanently',
        timestamp: Date.now()
      };

      expect(validateConfirmationResponse(validResponse)).toBe(true);
    });

    test('should validate confirmation response without user input', () => {
      const validResponse: MCPConfirmationResponse = {
        correlationId: 'test-correlation-id',
        confirmed: false,
        timestamp: Date.now()
      };

      expect(validateConfirmationResponse(validResponse)).toBe(true);
    });

    test('should reject response with missing correlationId', () => {
      const invalidResponse = {
        confirmed: true,
        userInput: 'destroy permanently',
        timestamp: Date.now()
      };

      expect(validateConfirmationResponse(invalidResponse)).toBe(false);
    });

    test('should reject response with invalid confirmed field', () => {
      const invalidResponse = {
        correlationId: 'test-correlation-id',
        confirmed: 'true', // Should be boolean
        timestamp: Date.now()
      };

      expect(validateConfirmationResponse(invalidResponse)).toBe(false);
    });

    test('should reject response with missing timestamp', () => {
      const invalidResponse = {
        correlationId: 'test-correlation-id',
        confirmed: true,
        userInput: 'destroy permanently'
      };

      expect(validateConfirmationResponse(invalidResponse)).toBe(false);
    });

    test('should reject response with invalid userInput type', () => {
      const invalidResponse = {
        correlationId: 'test-correlation-id',
        confirmed: true,
        userInput: 123, // Should be string
        timestamp: Date.now()
      };

      expect(validateConfirmationResponse(invalidResponse)).toBe(false);
    });

    test('should handle null and undefined responses', () => {
      expect(validateConfirmationResponse(null)).toBe(false);
      expect(validateConfirmationResponse(undefined)).toBe(false);
    });
  });

  describe('Error Code Constants', () => {
    test('should have unique error codes', () => {
      const codes = Object.values(MCP_CONFIRMATION_ERROR_CODES);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(codes.length);
    });

    test('should have negative error codes following MCP convention', () => {
      const codes = Object.values(MCP_CONFIRMATION_ERROR_CODES);
      
      for (const code of codes) {
        expect(code).toBeLessThan(0);
        expect(code).toBeGreaterThanOrEqual(-33000);
      }
    });

    test('should have all required error codes', () => {
      expect(MCP_CONFIRMATION_ERROR_CODES).toHaveProperty('CONFIRMATION_REQUIRED');
      expect(MCP_CONFIRMATION_ERROR_CODES).toHaveProperty('CONFIRMATION_TIMEOUT');
      expect(MCP_CONFIRMATION_ERROR_CODES).toHaveProperty('CONFIRMATION_INVALID');
      expect(MCP_CONFIRMATION_ERROR_CODES).toHaveProperty('CONFIRMATION_DENIED');
      expect(MCP_CONFIRMATION_ERROR_CODES).toHaveProperty('CONFIRMATION_EXPIRED');
    });
  });

  describe('Type Safety', () => {
    test('should ensure MCPConfirmationError type compatibility', () => {
      const error = createConfirmationRequiredError(mockConfirmationRequest, Date.now() + 300000);

      // Type checking - these should compile without errors
      const code: number = error.code;
      const message: string = error.message;
      const data = error.data;

      expect(typeof code).toBe('number');
      expect(typeof message).toBe('string');
      expect(data).toBeDefined();
    });

    test('should ensure MCPConfirmationResponse type compatibility', () => {
      const response = createConfirmationResponse('test-id', true, 'confirm text');

      // Type checking - these should compile without errors
      const correlationId: string = response.correlationId;
      const confirmed: boolean = response.confirmed;
      const userInput: string | undefined = response.userInput;
      const timestamp: number = response.timestamp;

      expect(typeof correlationId).toBe('string');
      expect(typeof confirmed).toBe('boolean');
      expect(typeof userInput).toBe('string');
      expect(typeof timestamp).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty strings in confirmation request', () => {
      const requestWithEmptyStrings = {
        ...mockConfirmationRequest,
        title: '',
        description: '',
        warningMessage: '',
        confirmationInstructions: ''
      };

      const formatted = formatConfirmationForDisplay(requestWithEmptyStrings);
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });

    test('should handle very long confirmation messages', () => {
      const longMessage = 'A'.repeat(10000);
      const requestWithLongMessage = {
        ...mockConfirmationRequest,
        warningMessage: longMessage
      };

      const formatted = formatConfirmationForDisplay(requestWithLongMessage);
      expect(formatted).toContain(longMessage);
    });

    test('should handle special characters in parameters', () => {
      const requestWithSpecialChars = {
        ...mockConfirmationRequest,
        parameters: {
          name: 'vm-with-special-chars-!@#$%^&*()',
          description: 'Contains "quotes" and \'apostrophes\' and <brackets>',
          path: '/special/path/with spaces/and-dashes'
        }
      };

      const formatted = formatConfirmationForDisplay(requestWithSpecialChars);
      expect(formatted).toContain('vm-with-special-chars-!@#$%^&*()');
      expect(formatted).toContain('Contains "quotes" and \'apostrophes\' and <brackets>');
      expect(formatted).toContain('/special/path/with spaces/and-dashes');
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete confirmation flow', () => {
      // 1. Create confirmation required error
      const error = createConfirmationRequiredError(mockConfirmationRequest, Date.now() + 300000);
      
      // 2. Verify it's a confirmation error
      expect(isConfirmationError(error)).toBe(true);
      
      // 3. Extract confirmation request
      const extracted = extractConfirmationRequest(error);
      expect(extracted).toBeDefined();
      
      // 4. Format for display
      const formatted = formatConfirmationForDisplay(extracted);
      expect(formatted).toContain('destroy permanently');
      
      // 5. Create response
      const response = createConfirmationResponse(
        extracted.correlationId,
        true,
        'destroy permanently'
      );
      
      // 6. Validate response
      expect(validateConfirmationResponse(response)).toBe(true);
    });

    test('should handle denial flow', () => {
      // Create denial error
      const error = createConfirmationDeniedError('test-correlation-id');
      
      // Verify error properties
      expect(error.code).toBe(MCP_CONFIRMATION_ERROR_CODES.CONFIRMATION_DENIED);
      expect(isConfirmationError(error)).toBe(true);
      
      // Extract and format
      const extracted = extractConfirmationRequest(error);
      const formatted = formatConfirmationForDisplay(extracted);
      expect(formatted).toContain('Operation Cancelled');
      
      // Create denial response
      const response = createConfirmationResponse('test-correlation-id', false);
      expect(validateConfirmationResponse(response)).toBe(true);
      expect(response.confirmed).toBe(false);
    });
  });
});