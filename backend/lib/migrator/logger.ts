export interface MigrationLogger {
    log(message: string): void;
    error(error: Error, message?: string): void;
}

export class ConsoleLogger implements MigrationLogger {
    log(message: string): void {
        console.log(message);
    }
    error(error: Error, message?: string | undefined): void {
        console.error(error);
        if (message) {
            console.error(message);
        }
    }
}
