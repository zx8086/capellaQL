/* src/utils/simpleLogger.ts */

export function log(message: string, meta?: any): void {
    if (meta) {
      console.log({ message, meta });
    } else {
      console.log(message);
    }
  }
  
  export function err(message: string, meta?: any): void {
    if (meta) {
      console.error({ message, meta });
    } else {
      console.error(message);
    }
  }
  
  export function warn(message: string, meta?: any): void {
    if (meta) {
      console.warn({ message, meta });
    } else {
      console.warn(message);
    }
  }
  
  export function debug(message: string, meta?: any): void {
    if (meta) {
      console.debug({ message, meta });
    } else {
      console.debug(message);
    }
  }
  