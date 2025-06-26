import { z } from 'zod';
import { Logger } from '../utils/logger.js';

export interface ValidationResult {
  isValid: boolean;
  sanitizedInput?: any;
  errors?: string[];
  securityWarnings?: string[];
}

export interface RateLimitInfo {
  requestCount: number;
  windowStart: number;
  isLimited: boolean;
}

export class ValidationMiddleware {
  private static readonly MAX_STRING_LENGTH = 10000;
  private static readonly MAX_ARRAY_LENGTH = 1000;
  private static readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private static readonly DEFAULT_RATE_LIMIT = 100; // requests per minute
  
  private rateLimitMap = new Map<string, RateLimitInfo>();
  private toolSchemas = new Map<string, z.ZodSchema>();

  constructor() {
    this.initializeCommonSchemas();
    Logger.info('ValidationMiddleware initialized with security schemas');
  }

  /**
   * Validate and sanitize tool parameters
   */
  public validateToolParameters(toolName: string, params: any): ValidationResult {
    try {
      // Get schema for the tool
      const schema = this.getToolSchema(toolName);
      
      // Perform basic security checks
      const securityCheck = this.performSecurityChecks(params);
      if (!securityCheck.isValid) {
        return securityCheck;
      }

      // Validate against schema
      const validation = schema.safeParse(params);
      
      if (validation.success) {
        return {
          isValid: true,
          sanitizedInput: validation.data,
          securityWarnings: securityCheck.securityWarnings
        };
      } else {
        const errors = validation.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        
        Logger.warn(`Validation failed for tool ${toolName}`, { errors });
        
        return {
          isValid: false,
          errors,
          securityWarnings: securityCheck.securityWarnings
        };
      }
    } catch (error) {
      Logger.error(`Validation error for tool ${toolName}`, error);
      return {
        isValid: false,
        errors: ['Internal validation error']
      };
    }
  }

  /**
   * Check rate limits for a tool
   */
  public checkRateLimit(toolName: string, clientId: string = 'default'): boolean {
    const key = `${toolName}:${clientId}`;
    const now = Date.now();
    const windowStart = now - ValidationMiddleware.RATE_LIMIT_WINDOW;
    
    let rateInfo = this.rateLimitMap.get(key);
    
    if (!rateInfo || rateInfo.windowStart < windowStart) {
      // New window or expired window
      rateInfo = {
        requestCount: 1,
        windowStart: now,
        isLimited: false
      };
    } else {
      // Existing window
      rateInfo.requestCount++;
      rateInfo.isLimited = rateInfo.requestCount > ValidationMiddleware.DEFAULT_RATE_LIMIT;
    }
    
    this.rateLimitMap.set(key, rateInfo);
    
    if (rateInfo.isLimited) {
      Logger.warn(`Rate limit exceeded for tool ${toolName} from client ${clientId}`);
    }
    
    return !rateInfo.isLimited;
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  public sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input);
    }
    
    if (Array.isArray(input)) {
      return input.slice(0, ValidationMiddleware.MAX_ARRAY_LENGTH)
        .map(item => this.sanitizeInput(item));
    }
    
    if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  /**
   * Validate CloudStack API parameters
   */
  public validateCloudStackParameters(command: string, params: any): boolean {
    try {
      // Basic CloudStack parameter validation
      const schema = this.getCloudStackCommandSchema(command);
      const validation = schema.safeParse(params);
      
      if (!validation.success) {
        Logger.warn(`CloudStack parameter validation failed for ${command}`, {
          errors: validation.error.errors
        });
        return false;
      }
      
      return true;
    } catch (error) {
      Logger.error(`CloudStack parameter validation error for ${command}`, error);
      return false;
    }
  }

  /**
   * Initialize common validation schemas
   */
  private initializeCommonSchemas(): void {
    // Common schemas for CloudStack operations
    const baseSchema = z.object({
      id: z.string().uuid().optional(),
      name: z.string().max(255).optional(),
      account: z.string().max(255).optional(),
      domainid: z.string().uuid().optional(),
      projectid: z.string().uuid().optional(),
      zoneid: z.string().uuid().optional(),
      keyword: z.string().max(255).optional(),
      page: z.number().int().min(1).max(1000).optional(),
      pagesize: z.number().int().min(1).max(500).optional()
    });

    // Virtual Machine operations
    this.toolSchemas.set('list_virtual_machines', z.object({
      ...baseSchema.shape,
      state: z.enum(['Running', 'Stopped', 'Starting', 'Stopping', 'Destroyed', 'Expunging']).optional(),
      templateid: z.string().uuid().optional(),
      isrecursive: z.boolean().optional()
    }));

    this.toolSchemas.set('deploy_virtual_machine', z.object({
      serviceofferingid: z.string().uuid(),
      templateid: z.string().uuid(),
      zoneid: z.string().uuid(),
      name: z.string().min(1).max(255).regex(/^[a-zA-Z0-9\-_\.]+$/),
      displayname: z.string().max(255).optional(),
      account: z.string().max(255).optional(),
      domainid: z.string().uuid().optional(),
      networkids: z.array(z.string().uuid()).max(10).optional(),
      securitygroupids: z.array(z.string().uuid()).max(10).optional(),
      keypair: z.string().max(255).optional(),
      userdata: z.string().max(32768).optional() // Base64 encoded
    }));

    // Network operations
    this.toolSchemas.set('list_networks', z.object({
      ...baseSchema.shape,
      type: z.enum(['Isolated', 'Shared', 'L2', 'Management']).optional(),
      traffictype: z.enum(['Guest', 'Management', 'Public', 'Storage']).optional(),
      isrecursive: z.boolean().optional()
    }));

    this.toolSchemas.set('create_network', z.object({
      name: z.string().min(1).max(255).regex(/^[a-zA-Z0-9\-_\.]+$/),
      displaytext: z.string().max(4096).optional(),
      networkofferingid: z.string().uuid(),
      zoneid: z.string().uuid(),
      account: z.string().max(255).optional(),
      domainid: z.string().uuid().optional(),
      gateway: z.string().ip().optional(),
      netmask: z.string().ip().optional(),
      startip: z.string().ip().optional(),
      endip: z.string().ip().optional()
    }));

    // Volume operations
    this.toolSchemas.set('list_volumes', z.object({
      ...baseSchema.shape,
      type: z.enum(['ROOT', 'DATADISK']).optional(),
      virtualmachineid: z.string().uuid().optional()
    }));

    this.toolSchemas.set('create_volume', z.object({
      name: z.string().min(1).max(255).regex(/^[a-zA-Z0-9\-_\.]+$/),
      zoneid: z.string().uuid(),
      diskofferingid: z.string().uuid().optional(),
      size: z.number().int().min(1).max(65536).optional(), // GB
      account: z.string().max(255).optional(),
      domainid: z.string().uuid().optional()
    }));

    Logger.info('Common validation schemas initialized');
  }

  /**
   * Get validation schema for a specific tool
   */
  private getToolSchema(toolName: string): z.ZodSchema {
    const schema = this.toolSchemas.get(toolName);
    if (schema) {
      return schema;
    }
    
    // Default permissive schema for tools without specific schemas
    return z.object({}).passthrough();
  }

  /**
   * Get CloudStack command validation schema
   */
  private getCloudStackCommandSchema(command: string): z.ZodSchema {
    // Basic CloudStack command validation
    const baseParams = z.object({
      command: z.string().min(1),
      response: z.literal('json').optional(),
      apikey: z.string().min(1).optional(),
      signature: z.string().min(1).optional()
    });

    // Add command-specific validation here as needed
    return baseParams.passthrough();
  }

  /**
   * Perform security checks on input
   */
  private performSecurityChecks(params: any): ValidationResult {
    const warnings: string[] = [];
    
    // Check for potential injection patterns
    const suspiciousPatterns = [
      /[<>'"&]/g, // Potential XSS
      /(\band\b|\bor\b).*[=<>]/gi, // Potential SQL injection
      /javascript:/gi, // Potential XSS
      /vbscript:/gi, // Potential XSS
      /on\w+\s*=/gi, // Potential XSS events
      /<script/gi, // Potential XSS
      /\$\(/g, // Potential command injection
      /`.*`/g, // Potential command injection
      /\|\|/g, // Potential command chaining
      /&&/g, // Potential command chaining
      // Enhanced patterns for additional security
      /(\$\{.*\})/g, // Template injection
      /#\{.*\}/g, // Expression language injection
      /<%.*%>/g, // Template injection (JSP/ASP)
      /\{\{.*\}\}/g, // Template injection (Handlebars/Angular)
      /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b).*(\bfrom\b|\binto\b|\bwhere\b)/gi, // SQL injection keywords
      /(sleep|benchmark|waitfor)\s*\(/gi, // SQL time-based injection
      /(\beval\b|\bexec\b|\bexecute\b|\bsystem\b)\s*\(/gi, // Code execution
      /(\.\.|\/\.\.|\\\.\.)/g, // Path traversal
      /%2e%2e|%252e%252e|%c0%ae%c0%ae/gi, // Encoded path traversal
      /(\bldap:\/\/|\bfile:\/\/|\bjar:\/\/|\bnetdoc:\/\/)/gi, // Protocol injection
      /(\${jndi:|{jndi:)/gi, // JNDI injection (Log4Shell style)
      /\[\[.*\]\]/g, // MediaWiki template injection
      /(script|iframe|object|embed|applet|form|input|img|link|meta|style|base|body|html)(\s|>|\/)/gi, // HTML tag injection
      /(document\.|window\.|location\.|eval\(|alert\(|prompt\(|confirm\()/gi, // JavaScript injection
      /(\bdata:|\bblob:|\bfilesystem:)/gi, // Data URI schemes
      /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/gi, // Directory traversal variations
      /(\bor\b|\band\b)(\s+)?\d+(\s+)?=(\s+)?\d+/gi, // Boolean SQL injection
      /(union|select|insert|update|delete|drop|create|alter|truncate|exec|execute|sp_|xp_)/gi, // SQL keywords
      /(\x00|\%00|\0)/g, // Null byte injection
      /(\\r|\\n|%0d|%0a|%0D|%0A)/gi, // CRLF injection
      /(response\.redirect|location\.href|document\.location)/gi, // Redirect injection
      /(\bwget\b|\bcurl\b|\bping\b|\btracert\b|\bnslookup\b|\bdig\b)/gi // Command injection tools
    ];

    const checkValue = (value: any, path: string = ''): void => {
      if (typeof value === 'string') {
        // Check string length
        if (value.length > ValidationMiddleware.MAX_STRING_LENGTH) {
          warnings.push(`String too long at ${path}: ${value.length} chars`);
        }
        
        // Check for suspicious patterns
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(value)) {
            warnings.push(`Suspicious pattern detected at ${path}: ${pattern.source}`);
          }
        }
        
        // Check for null bytes
        if (value.includes('\0')) {
          warnings.push(`Null byte detected at ${path}`);
        }
      } else if (Array.isArray(value)) {
        if (value.length > ValidationMiddleware.MAX_ARRAY_LENGTH) {
          warnings.push(`Array too large at ${path}: ${value.length} items`);
        }
        value.forEach((item, index) => checkValue(item, `${path}[${index}]`));
      } else if (value && typeof value === 'object') {
        for (const [key, val] of Object.entries(value)) {
          checkValue(val, path ? `${path}.${key}` : key);
        }
      }
    };

    checkValue(params);

    return {
      isValid: warnings.length === 0,
      securityWarnings: warnings
    };
  }

  /**
   * Sanitize string input
   */
  private sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    return input
      .slice(0, ValidationMiddleware.MAX_STRING_LENGTH)
      .replace(/[<>'"&]/g, (match) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match] || match;
      })
      .replace(/\0/g, '') // Remove null bytes
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
      .replace(/(\${|#{|\{\{|<%|%>|\}\})/g, '') // Remove template injection patterns
      .replace(/(javascript:|vbscript:|data:|blob:)/gi, '') // Remove dangerous URI schemes
      .replace(/(\.\.|%2e%2e|%252e)/gi, '') // Remove path traversal patterns
      .replace(/(union|select|insert|update|delete|drop|exec|execute)\s/gi, (match) => {
        // Replace SQL keywords with harmless alternatives
        return match.replace(/[a-zA-Z]/g, 'X') + ' ';
      })
      .trim();
  }

  /**
   * Register custom schema for a tool
   */
  public registerToolSchema(toolName: string, schema: z.ZodSchema): void {
    this.toolSchemas.set(toolName, schema);
    Logger.info(`Custom schema registered for tool: ${toolName}`);
  }

  /**
   * Clear rate limit data (for testing or maintenance)
   */
  public clearRateLimits(): void {
    this.rateLimitMap.clear();
    Logger.info('Rate limit data cleared');
  }
}