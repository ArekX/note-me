import { migrator } from "$backend/migration-manager.ts";

export const initialize = async () => {
  console.log("Making sure the database is up to date...");
  await migrator.migrateUp();
};
