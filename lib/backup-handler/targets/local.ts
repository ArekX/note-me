import {
    BackupItem,
    BackupStream,
    CreateBackupTarget,
} from "$lib/backup-handler/mod.ts";
import { exists, joinPath } from "$lib/backup-handler/deps.ts";

export interface LocalBackupSettings {
    location: string;
}

export const localBackupTarget: CreateBackupTarget<
    "local",
    LocalBackupSettings
> = {
    type: "local",
    create: (settings) => {
        const getBackupLocation = (identifier: string) =>
            joinPath(settings.location, identifier);

        return {
            name: "local",
            setup: async function (): Promise<void> {
                await Deno.mkdir(settings.location, { recursive: true });
            },
            saveBackup: async function (record): Promise<BackupItem> {
                const location = getBackupLocation(record.identifier);
                await Deno.copyFile(record.inputLocation, location);

                const stat = await Deno.stat(location);

                return {
                    identifier: record.identifier,
                    name: record.identifier,
                    created_at: Math.floor((stat.mtime?.getTime() ?? 0) / 1000),
                    size: stat.size,
                };
            },
            deleteBackup: async function (
                identifier,
            ): Promise<void> {
                const location = getBackupLocation(identifier);
                if (await exists(location)) {
                    await Deno.remove(location);
                }
            },
            getBackupStream: async function (
                identifier,
            ): Promise<BackupStream> {
                const location = getBackupLocation(identifier);
                if (!(await exists(location))) {
                    throw new Error("Backup not found");
                }

                const stat = await Deno.stat(location);

                const file = await Deno.open(location, { read: true });
                const stream = file.readable;

                const reader = stream.getReader();
                const newStream = new ReadableStream({
                    async pull(controller) {
                        const { done, value } = await reader.read();
                        if (done) {
                            try {
                                controller.close();
                                file.close();
                            } catch {
                                // Ignore errors when closing the file
                            }
                        } else {
                            controller.enqueue(value);
                        }
                    },
                    cancel() {
                        try {
                            file.close();
                        } catch {
                            // Ignore errors when closing the file
                        }
                    },
                });

                return {
                    identifier,
                    size: stat.size,
                    stream: newStream,
                };
            },
            listBackups: async function (): Promise<BackupItem[]> {
                if (!(await exists(settings.location))) {
                    return [];
                }

                const files: BackupItem[] = [];
                for await (const file of Deno.readDir(settings.location)) {
                    if (!file.isFile) {
                        continue;
                    }

                    const stat = await Deno.stat(
                        joinPath(settings.location, file.name),
                    );
                    files.push({
                        identifier: file.name,
                        name: file.name,
                        created_at: Math.floor(
                            (stat.mtime?.getTime() ?? 0) / 1000,
                        ),
                        size: stat.size,
                    });
                }

                return files.sort((a, b) => b.created_at - a.created_at);
            },
        };
    },
};
