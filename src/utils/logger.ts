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
    
    try {
      mkdirSync(logDir, { recursive: true });
    } catch (error) {
      console.warn(`Failed to create log directory ${logDir}:`, error);
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
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp }) => {
              return `${timestamp} [${level}]: ${message}`;
            })
          )
        }),
        new winston.transports.File({
          filename: logFile,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        })
      ],
      exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' })
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' })
      ]
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