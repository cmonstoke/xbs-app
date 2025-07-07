/**
 * Logger utility for background services
 */
export class Logger {
  private prefix = '[xBrowserSync]';

  info(message: string, ...args: any[]): void {
    console.info(`${this.prefix} ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`${this.prefix} ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`${this.prefix} ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    console.debug(`${this.prefix} ${message}`, ...args);
  }
}
