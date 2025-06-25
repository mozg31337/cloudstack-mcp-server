/**
 * ConfirmationProtocol - MCP protocol integration for dangerous action confirmations
 * 
 * This module defines the MCP protocol extensions and error handling for
 * dangerous action confirmations, ensuring seamless integration with Claude Desktop.
 */

export interface MCPConfirmationError {
  code: number;
  message: string;
  data?: {
    confirmationRequest?: {
      correlationId: string;
      title: string;
      description: string;
      warningMessage: string;
      confirmationInstructions: string;
      actionDetails: {
        category: string;
        severity: string;
        reversible: boolean;
        impactScope: string;
      };
      parameters: Record<string, any>;
      expiresAt: number;
    };
  };
}

export interface MCPConfirmationResponse {
  correlationId: string;
  confirmed: boolean;
  userInput?: string;
  timestamp: number;
}

// MCP Error Codes for confirmations
export const MCP_CONFIRMATION_ERROR_CODES = {
  CONFIRMATION_REQUIRED: -32001,
  CONFIRMATION_TIMEOUT: -32002,
  CONFIRMATION_INVALID: -32003,
  CONFIRMATION_DENIED: -32004,
  CONFIRMATION_EXPIRED: -32005
} as const;

/**
 * Create an MCP error for confirmation requirement
 */
export function createConfirmationRequiredError(
  confirmationRequest: any,
  expiresAt: number
): MCPConfirmationError {
  return {
    code: MCP_CONFIRMATION_ERROR_CODES.CONFIRMATION_REQUIRED,
    message: "Dangerous operation requires explicit confirmation",
    data: {
      confirmationRequest: {
        ...confirmationRequest,
        expiresAt
      }
    }
  };
}

/**
 * Create an MCP error for confirmation timeout
 */
export function createConfirmationTimeoutError(correlationId: string): MCPConfirmationError {
  return {
    code: MCP_CONFIRMATION_ERROR_CODES.CONFIRMATION_TIMEOUT,
    message: "Confirmation request timed out",
    data: {
      confirmationRequest: {
        correlationId,
        title: "Confirmation Timeout",
        description: "The confirmation request has expired",
        warningMessage: "The dangerous operation was not confirmed within the allowed time limit",
        confirmationInstructions: "Please retry the operation if you still want to proceed",
        actionDetails: {
          category: "Timeout",
          severity: "MEDIUM",
          reversible: true,
          impactScope: "single-resource"
        },
        parameters: {},
        expiresAt: Date.now()
      }
    }
  };
}

/**
 * Create an MCP error for invalid confirmation
 */
export function createConfirmationInvalidError(
  correlationId: string,
  reason: string
): MCPConfirmationError {
  return {
    code: MCP_CONFIRMATION_ERROR_CODES.CONFIRMATION_INVALID,
    message: `Invalid confirmation: ${reason}`,
    data: {
      confirmationRequest: {
        correlationId,
        title: "Invalid Confirmation",
        description: "The confirmation text was not correct",
        warningMessage: "Please check the confirmation text and try again",
        confirmationInstructions: "Type the exact confirmation phrase as shown",
        actionDetails: {
          category: "Validation Error",
          severity: "HIGH",
          reversible: true,
          impactScope: "single-resource"
        },
        parameters: { reason },
        expiresAt: Date.now() + 300000 // 5 minutes from now
      }
    }
  };
}

/**
 * Create an MCP error for denied confirmation
 */
export function createConfirmationDeniedError(correlationId: string): MCPConfirmationError {
  return {
    code: MCP_CONFIRMATION_ERROR_CODES.CONFIRMATION_DENIED,
    message: "Operation cancelled by user",
    data: {
      confirmationRequest: {
        correlationId,
        title: "Operation Cancelled",
        description: "The dangerous operation was cancelled",
        warningMessage: "You have successfully cancelled the dangerous operation",
        confirmationInstructions: "No further action is required",
        actionDetails: {
          category: "User Cancellation",
          severity: "LOW",
          reversible: true,
          impactScope: "single-resource"
        },
        parameters: {},
        expiresAt: Date.now()
      }
    }
  };
}

/**
 * Create an MCP error for expired confirmation
 */
export function createConfirmationExpiredError(correlationId: string): MCPConfirmationError {
  return {
    code: MCP_CONFIRMATION_ERROR_CODES.CONFIRMATION_EXPIRED,
    message: "Confirmation request has expired",
    data: {
      confirmationRequest: {
        correlationId,
        title: "Confirmation Expired",
        description: "The confirmation request is no longer valid",
        warningMessage: "The confirmation window has closed",
        confirmationInstructions: "Please retry the operation to get a new confirmation request",
        actionDetails: {
          category: "Expired Request",
          severity: "MEDIUM",
          reversible: true,
          impactScope: "single-resource"
        },
        parameters: {},
        expiresAt: Date.now()
      }
    }
  };
}

/**
 * Utility to check if an error is a confirmation error
 */
export function isConfirmationError(error: any): error is MCPConfirmationError {
  if (!error || error === null || error === undefined) {
    return false;
  }
  
  return typeof error.code === 'number' && 
         Object.values(MCP_CONFIRMATION_ERROR_CODES).includes(error.code as any);
}

/**
 * Extract confirmation request from MCP error
 */
export function extractConfirmationRequest(error: MCPConfirmationError): any | null {
  return error.data?.confirmationRequest || null;
}

/**
 * Create a confirmation response object
 */
export function createConfirmationResponse(
  correlationId: string,
  confirmed: boolean,
  userInput?: string
): MCPConfirmationResponse {
  return {
    correlationId,
    confirmed,
    userInput,
    timestamp: Date.now()
  };
}

/**
 * Format confirmation request for Claude Desktop display
 */
export function formatConfirmationForDisplay(confirmationRequest: any): string {
  const { title, description, warningMessage, confirmationInstructions, actionDetails, parameters } = confirmationRequest;
  
  let output = `${title}\n\n`;
  output += `**Operation:** ${description}\n\n`;
  output += `**⚠️ WARNING:** ${warningMessage}\n\n`;
  
  output += `**Action Details:**\n`;
  output += `- Category: ${actionDetails.category}\n`;
  output += `- Severity: ${actionDetails.severity}\n`;
  output += `- Reversible: ${actionDetails.reversible ? 'Yes' : 'No'}\n`;
  output += `- Impact Scope: ${actionDetails.impactScope}\n\n`;
  
  if (Object.keys(parameters).length > 0) {
    output += `**Parameters:**\n`;
    for (const [key, value] of Object.entries(parameters)) {
      output += `- ${key}: ${value}\n`;
    }
    output += '\n';
  }
  
  output += `**${confirmationInstructions}**\n\n`;
  output += `**Expires at:** ${new Date(confirmationRequest.expiresAt).toISOString()}\n`;
  output += `**Correlation ID:** ${confirmationRequest.correlationId}`;
  
  return output;
}

/**
 * Validate confirmation response format
 */
export function validateConfirmationResponse(response: any): response is MCPConfirmationResponse {
  if (!response || response === null || response === undefined) {
    return false;
  }
  
  return typeof response.correlationId === 'string' &&
         typeof response.confirmed === 'boolean' &&
         typeof response.timestamp === 'number' &&
         (response.userInput === undefined || typeof response.userInput === 'string');
}