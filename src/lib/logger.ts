/**
 * Centralized logging utility for conditional debug output
 * Logs are only shown in development environment
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

class Logger {
  private isDevelopment: boolean

  constructor() {
    // Check if we're in development mode
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  private shouldLog(): boolean {
    return this.isDevelopment
  }

  /**
   * Standard log output (development only)
   */
  log(...args: any[]): void {
    if (this.shouldLog()) {
      console.log(...args)
    }
  }

  /**
   * Info level logging (development only)
   */
  info(...args: any[]): void {
    if (this.shouldLog()) {
      console.info(...args)
    }
  }

  /**
   * Warning level logging (development only)
   */
  warn(...args: any[]): void {
    if (this.shouldLog()) {
      console.warn(...args)
    }
  }

  /**
   * Error level logging (always shown, but with less detail in production)
   */
  error(...args: any[]): void {
    if (this.isDevelopment) {
      console.error(...args)
    } else {
      // In production, only log the first argument (main error message)
      // and strip out detailed debug information
      const mainError = args[0]
      if (typeof mainError === 'string' && mainError.includes('❌')) {
        // Extract just the error message without emoji and debug info
        const cleanMessage = mainError.replace(/❌|🚨|⚠️/g, '').trim()
        console.error('Error:', cleanMessage)
      } else {
        console.error(mainError)
      }
    }
  }

  /**
   * Debug level logging (development only)
   */
  debug(...args: any[]): void {
    if (this.shouldLog()) {
      console.debug(...args)
    }
  }

  /**
   * Group logging (development only)
   */
  group(label: string): void {
    if (this.shouldLog()) {
      console.group(label)
    }
  }

  /**
   * Group end (development only)
   */
  groupEnd(): void {
    if (this.shouldLog()) {
      console.groupEnd()
    }
  }

  /**
   * Table logging (development only)
   */
  table(data: any): void {
    if (this.shouldLog()) {
      console.table(data)
    }
  }

  /**
   * Time logging (development only)
   */
  time(label: string): void {
    if (this.shouldLog()) {
      console.time(label)
    }
  }

  /**
   * Time end logging (development only)
   */
  timeEnd(label: string): void {
    if (this.shouldLog()) {
      console.timeEnd(label)
    }
  }

  /**
   * Critical errors that should always be logged (production safe)
   */
  critical(...args: any[]): void {
    // Always log critical errors, but sanitize in production
    if (this.isDevelopment) {
      console.error('🚨 CRITICAL:', ...args)
    } else {
      console.error('Critical error occurred')
    }
  }

  /**
   * Authentication specific logging
   */
  auth(...args: any[]): void {
    if (this.shouldLog()) {
      console.log('🔐 AUTH:', ...args)
    }
  }

  /**
   * Firebase specific logging
   */
  firebase(...args: any[]): void {
    if (this.shouldLog()) {
      console.log('🔥 FIREBASE:', ...args)
    }
  }

  /**
   * Upload specific logging
   */
  upload(...args: any[]): void {
    if (this.shouldLog()) {
      console.log('📤 UPLOAD:', ...args)
    }
  }

  /**
   * UI specific logging
   */
  ui(...args: any[]): void {
    if (this.shouldLog()) {
      console.log('🖼️ UI:', ...args)
    }
  }

  /**
   * Network specific logging
   */
  network(...args: any[]): void {
    if (this.shouldLog()) {
      console.log('🌐 NETWORK:', ...args)
    }
  }
}

// Export a singleton instance
export const logger = new Logger()

// Export individual methods for convenience
export const { log, info, warn, error, debug, critical, auth, firebase, upload, ui, network } = logger

// Default export
export default logger