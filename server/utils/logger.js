/**
 * Simple logger utility
 * In production, you might want to use a library like winston or pino
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

const currentLevel = process.env.LOG_LEVEL 
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] 
  : (process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG)

class Logger {
  constructor(context = '') {
    this.context = context
  }

  format(level, message, ...args) {
    const timestamp = new Date().toISOString()
    const contextStr = this.context ? ` [${this.context}]` : ''
    const prefix = `${timestamp} ${level}${contextStr}:`
    
    if (args.length > 0) {
      console.log(prefix, message, ...args)
    } else {
      console.log(prefix, message)
    }
  }

  error(message, ...args) {
    if (currentLevel >= LOG_LEVELS.ERROR) {
      this.format('ERROR', message, ...args)
    }
  }

  warn(message, ...args) {
    if (currentLevel >= LOG_LEVELS.WARN) {
      this.format('WARN ', message, ...args)
    }
  }

  info(message, ...args) {
    if (currentLevel >= LOG_LEVELS.INFO) {
      this.format('INFO ', message, ...args)
    }
  }

  debug(message, ...args) {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      this.format('DEBUG', message, ...args)
    }
  }
}

export default Logger
export const logger = new Logger()
