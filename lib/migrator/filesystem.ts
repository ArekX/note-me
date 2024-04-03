import {
    FileMigrationProviderFS,
    FileMigrationProviderPath,
    join,
} from "./deps.ts";

export type MigratorFileSystem =
    & { writeFile(path: string, data: string): void }
    & FileMigrationProviderFS
    & FileMigrationProviderPath;

export const defaultFileSystem: MigratorFileSystem = {
    async readdir(path: string): Promise<string[]> {
        const dirEntries = await Deno.readDir(path);
        const fileNames: string[] = [];

        for await (const dirEntry of dirEntries) {
            if (dirEntry.isFile) {
                fileNames.push(dirEntry.name);
            }
        }

        return fileNames;
    },
    writeFile(path: string, data: string): void {
        Deno.writeFileSync(path, new TextEncoder().encode(data));
    },
    join(...path: string[]): string {
        return join(...path);
    },
};
