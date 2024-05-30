const tempLocation = new URL(
    `../temp`,
    import.meta.url,
).pathname;

export const initTempLocation = async (): Promise<void> => {
    await Deno.mkdir(tempLocation, { recursive: true });
};

export const createTempFile = async (): Promise<string> => {
    const fileTarget = crypto.randomUUID();
    const location = `${tempLocation}/${fileTarget}`;
    await Deno.create(location);
    return fileTarget;
};

export const appendToTempFile = async (
    fileTarget: string,
    data: Uint8Array,
): Promise<void> => {
    const location = `${tempLocation}/${fileTarget}`;
    await Deno.writeFile(location, data, { append: true });
};

export const removeTempFile = async (fileTarget: string): Promise<void> => {
    try {
        const location = `${tempLocation}/${fileTarget}`;
        await Deno.remove(location);
    } catch {
        // Skip empty file.
    }
};

export const readTempFile = async (fileTarget: string): Promise<Uint8Array> => {
    const location = `${tempLocation}/${fileTarget}`;
    return await Deno.readFile(location);
};

export const getTempFileSize = async (fileTarget: string): Promise<number> => {
    const location = `${tempLocation}/${fileTarget}`;
    const { size } = await Deno.stat(location);
    return size!;
};

const maxOldFileAge = 1000 * 60 * 60;

export const cleanupOldTempFiles = async (): Promise<void> => {
    const now = Date.now();
    for await (const entry of Deno.readDir(tempLocation)) {
        if (!entry.isFile) {
            continue;
        }

        const fileLocation = `${tempLocation}/${entry.name}`;

        const { mtime } = await Deno.stat(fileLocation);
        if (now - mtime!.getTime() > maxOldFileAge) {
            await Deno.remove(fileLocation);
        }
    }
};
