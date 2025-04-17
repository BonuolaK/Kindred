/**
 * Debug Logger
 * 
 * A utility for enhanced console logging in both local and Replit environments.
 * 
 * Features:
 * - Colorful, formatted logs with timestamps and context labels
 * - Configurable log levels that can be set via environment variables
 * - Log redirection options for local development
 * 
 * Usage:
 *   import { logger } from './debug-logger.ts';
 *   logger.info('This is some info');
 *   logger.debug('Detailed debug information');
 *   logger.error('Error occurred', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  enabled: boolean;
  logLevel: LogLevel;
  includeTimestamp: boolean;
  colorize: boolean;
}

// Default options - can be overridden by environment variables
const DEFAULT_OPTIONS: LoggerOptions = {
  enabled: true,
  logLevel: 'info',
  includeTimestamp: true,
  colorize: true
};

// ANSI colors for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Logger implementation
class Logger {
  private options: LoggerOptions;
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor(options: Partial<LoggerOptions> = {}) {
    // Load options from environment if available
    const envLogLevel = process.env.LOG_LEVEL as LogLevel;
    const envEnabled = process.env.ENABLE_LOGGING ? process.env.ENABLE_LOGGING === 'true' : undefined;
    const envIncludeTimestamp = process.env.INCLUDE_TIMESTAMP ? process.env.INCLUDE_TIMESTAMP === 'true' : undefined;
    const envColorize = process.env.COLORIZE_LOGS ? process.env.COLORIZE_LOGS === 'true' : undefined;

    this.options = {
      ...DEFAULT_OPTIONS,
      ...(envLogLevel && this.isValidLogLevel(envLogLevel) ? { logLevel: envLogLevel } : {}),
      ...(envEnabled !== undefined ? { enabled: envEnabled } : {}),
      ...(envIncludeTimestamp !== undefined ? { includeTimestamp: envIncludeTimestamp } : {}),
      ...(envColorize !== undefined ? { colorize: envColorize } : {}),
      ...options
    };

    // Log initial configuration
    this.debug('Logger initialized with options:', this.options);
  }

  private isValidLogLevel(level: string): level is LogLevel {
    return ['debug', 'info', 'warn', 'error'].includes(level);
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.options.enabled) return false;
    return this.levelPriority[level] >= this.levelPriority[this.options.logLevel];
  }

  private formatTimestamp(): string {
    if (!this.options.includeTimestamp) return '';
    const now = new Date();
    return `[${now.toISOString()}] `;
  }

  private formatContext(context: string, level: LogLevel): string {
    if (!this.options.colorize) return `[${context}] `;

    let color = '';
    switch (level) {
      case 'debug': color = COLORS.cyan; break;
      case 'info': color = COLORS.green; break;
      case 'warn': color = COLORS.yellow; break;
      case 'error': color = COLORS.red; break;
    }

    return `${color}[${context}]${COLORS.reset} `;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(
        this.formatTimestamp() + this.formatContext('DEBUG', 'debug') + message,
        ...args
      );
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(
        this.formatTimestamp() + this.formatContext('INFO', 'info') + message,
        ...args
      );
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(
        this.formatTimestamp() + this.formatContext('WARN', 'warn') + message,
        ...args
      );
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(
        this.formatTimestamp() + this.formatContext('ERROR', 'error') + message,
        ...args
      );
    }
  }

  setLogLevel(level: LogLevel): void {
    if (this.isValidLogLevel(level)) {
      this.options.logLevel = level;
      this.debug(`Log level set to ${level}`);
    }
  }

  enable(): void {
    this.options.enabled = true;
  }

  disable(): void {
    this.options.enabled = false;
  }
}

// Export a singleton logger instance
export const logger = new Logger();

// Export the Logger class for custom instances
export { Logger, type LogLevel, type LoggerOptions };