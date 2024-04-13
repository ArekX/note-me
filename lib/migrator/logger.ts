import { cliLogger } from "$backend/logger.ts";

export interface MigrationLogger {
    log(message: string): void;
    error(error: Error, message?: string): void;
}

export class ConsoleLogger implements MigrationLogger {
    log(message: string): void {
        cliLogger.info(message);
    }
    error(error: Error, message?: string | undefined): void {
        cliLogger.error(error);
        if (message) {
            cliLogger.error(message);
        }
    }
}
