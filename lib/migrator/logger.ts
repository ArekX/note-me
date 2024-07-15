import { logger } from "$backend/logger.ts";

export interface MigrationLogger {
    log(message: string): void;
    error(error: Error, message?: string): void;
}

export class ConsoleLogger implements MigrationLogger {
    log(message: string): void {
        logger.info(message);
    }
    error(error: Error, message?: string | undefined): void {
        logger.error(error);
        if (message) {
            logger.error(message);
        }
    }
}
