import {
    FileMigrationProvider,
    formatDate,
    join,
    Kysely,
    Migrator,
} from "./deps.ts";
import { defaultFileSystem, MigratorFileSystem } from "./filesystem.ts";
import { ConsoleLogger, MigrationLogger } from "./logger.ts";

export class KyselyMigrationManager<T> {
    #migrator: Migrator;

    constructor(
        private readonly db: Kysely<T>,
        private readonly migrationFolder: string,
        private readonly logger: MigrationLogger | null = new ConsoleLogger(),
        private readonly fileSystem: MigratorFileSystem = defaultFileSystem,
    ) {
        this.#migrator = new Migrator({
            db: this.db,
            migrationLockTableName: "migration_lock",
            migrationTableName: "migration",
            provider: new FileMigrationProvider({
                fs: this.fileSystem,
                path: this.fileSystem,
                migrationFolder,
            }),
        });
    }

    async migrateUp(amount?: number) {
        const migrator = this.#migrator;

        const newMigrations = (await migrator.getMigrations()).filter(
            (x) => !x.executedAt,
        ).slice(0, amount);

        if (newMigrations.length === 0) {
            this.logger?.log("No new migrations to run.");
            return;
        }

        this.logger?.log("Migrations to migrate up:");
        for (const migration of newMigrations) {
            this.logger?.log(`\t - ${migration.name}`);
        }

        this.logger?.log("Deploying migrations...");
        let migrationError: Error | null = null;

        if (amount) {
            for (let i = 0; i < amount; i++) {
                const { error } = await migrator.migrateUp();

                if (error) {
                    migrationError = new Error("Migration failed.", error);
                    break;
                }
            }
        } else {
            const { error } = await migrator.migrateToLatest();

            if (error) {
                migrationError = new Error("Migration failed.", error);
            }
        }

        if (migrationError) {
            this.logger?.error(migrationError, "Error when migrating up.");
            throw migrationError;
        }

        this.logger?.log("Migrations finished successfully!");
    }

    async migrateDown(amount?: number) {
        const migrator = this.#migrator;

        if (!amount) {
            amount = 1;
        }

        const migrations = (await migrator.getMigrations()).toReversed().filter(
            (x) => x.executedAt,
        ).slice(0, amount);

        const migrationsToDowngrade = migrations.slice(
            migrations.length - amount - 1,
        );

        if (migrationsToDowngrade.length === 0) {
            this.logger?.log("No migrations to downgrade.");
            return;
        }

        this.logger?.log("Migrations to roll back:");
        for (const migration of migrationsToDowngrade) {
            this.logger?.log(`\t - ${migration.name}`);
        }

        this.logger?.log("Rolling back migrations...");
        for (let i = 0; i < amount; i++) {
            const { error } = await migrator.migrateDown();

            if (error) {
                console.log(error);
                const migrationError = new Error("Migration failed.", error);
                this.logger?.error(
                    migrationError,
                    "Error when migrating down.",
                );
                throw migrationError;
            }
        }

        this.logger?.log("Migrate down successful!");
    }

    migrateNew(name: string) {
        const newMigrationName = formatDate(new Date(), "yyyyMMdd_HHmmss_") +
            name.replace(/[^a-zA-Z0-9_]/g, "_") +
            ".ts";

        const template = `
import { Kysely } from "$lib/migrator/deps.ts";

export async function up(db: Kysely<unknown>): Promise<void> {
}

export async function down(db: Kysely<unknown>): Promise<void> {
}
`;

        this.fileSystem.writeFile(
            join(this.migrationFolder, newMigrationName),
            template,
        );
        this.logger?.log(`Created new migration: ${newMigrationName}`);
    }
}
