import { db } from "$backend/database.ts";
import { KyselyMigrationManager } from "$lib/migrator/migrator.ts";
import { joinPath } from "./deps.ts";
import { ConsoleLogger, MigrationLogger } from "$lib/migrator/logger.ts";
import { Tables } from "$types";

const createMigrator = (logger: MigrationLogger | null) =>
    new KyselyMigrationManager<Tables>(
        db,
        joinPath(Deno.cwd(), "migrations"),
        logger,
    );

export let migrator = createMigrator(new ConsoleLogger());

export const setupTestMigrator = () => {
    migrator = createMigrator(null);
};
