import winston from 'winston';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export class Logger {
  private static instance: winston.Logger;

  public static getInstance(level: string = 'info', logFile: string = 'logs/cloudstack-mcp.log'): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = Logger.createLogger(level, logFile);
    }
    return Logger.instance;
  }

  private static createLogger(level: string, logFile: string): winston.Logger {
    const logDir = dirname(logFile);
    
    // Ensure log directory exists
    try {
      mkdirSync(logDir, { recursive: true });
    } catch (error) {
      console.warn(`Failed to create log directory ${logDir}:`, error);
    }

    // Create file transports array - NO console transport for MCP servers
    const fileTransports: winston.transport[] = [];

    // Only add file transport if we can create the directory
    try {
      fileTransports.push(new winston.transports.File({
        filename: logFile,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10, // Increased for better audit trail retention
        tailable: true,
        zippedArchive: true // Compress old log files to save space
      }));
      
      // Add separate transport for security events
      if (logFile.includes('cloudstack-mcp.log')) {
        const securityLogFile = logFile.replace('.log', '-security.log');
        fileTransports.push(new winston.transports.File({
          filename: securityLogFile,
          level: 'warn', // Security events are typically warn/error level
          maxsize: 5 * 1024 * 1024, // 5MB for security logs
          maxFiles: 20, // Keep more security logs for compliance
          tailable: true,
          zippedArchive: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json() // JSON format for security log parsing
          )
        }));
      }
    } catch (error) {
      console.warn(`Failed to create file transport for ${logFile}:`, error);
      // If file logging fails, don't add any transports to avoid stdout pollution
    }

    // Create exception and rejection handlers if possible
    const exceptionHandlers: winston.transport[] = [];
    const rejectionHandlers: winston.transport[] = [];

    try {
      exceptionHandlers.push(new winston.transports.File({ 
        filename: `${logDir}/exceptions.log`,
        maxsize: 5 * 1024 * 1024, // 5MB
        maxFiles: 5,
        zippedArchive: true
      }));
    } catch (error) {
      console.warn(`Failed to create exception handler:`, error);
    }

    try {
      rejectionHandlers.push(new winston.transports.File({ 
        filename: `${logDir}/rejections.log`,
        maxsize: 5 * 1024 * 1024, // 5MB
        maxFiles: 5,
        zippedArchive: true
      }));
    } catch (error) {
      console.warn(`Failed to create rejection handler:`, error);
    }

    const logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ level, message, timestamp, stack }) => {
          return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
        })
      ),
      transports: fileTransports,
      exceptionHandlers: exceptionHandlers.length > 0 ? exceptionHandlers : undefined,
      rejectionHandlers: rejectionHandlers.length > 0 ? rejectionHandlers : undefined
    });

    return logger;
  }

  public static debug(message: string, meta?: any): void {
    Logger.getInstance().debug(message, meta);
  }

  public static info(message: string, meta?: any): void {
    Logger.getInstance().info(message, meta);
  }

  public static warn(message: string, meta?: any): void {
    Logger.getInstance().warn(message, meta);
  }

  public static error(message: string, meta?: any): void {
    Logger.getInstance().error(message, meta);
  }
}