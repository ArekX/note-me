import { migrator } from "$backend/migration-manager.ts";

export const initialize = async () => {
  await migrator.migrateUp();
};
