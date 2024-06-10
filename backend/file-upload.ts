const tempLocation = new URL(
    `../temp`,
    import.meta.url,
).pathname;

const getFileLocation = (prefix: string, fileTarget: string): string =>
    `${tempLocation}/${prefix}-${fileTarget}`;

export const initTempLocation = async (): Promise<void> => {
    await Deno.mkdir(tempLocation, { recursive: true });
};

export const createTempFile = async (prefix: string): Promise<string> => {
    const fileTarget = crypto.randomUUID();
    await Deno.create(getFileLocation(prefix, fileTarget));
    return fileTarget;
};

export const appendToTempFile = async (
    prefix: string,
    fileTarget: string,
    data: Uint8Array,
): Promise<void> => {
    const location = getFileLocation(prefix, fileTarget);
    await Deno.writeFile(location, data, { append: true });
};

export const removeTempFile = async (
    prefix: string,
    fileTarget: string,
): Promise<void> => {
    try {
        const location = getFileLocation(prefix, fileTarget);
        await Deno.remove(location);
    } catch {
        // Skip empty file.
    }
};

export const readTempFile = async (
    prefix: string,
    fileTarget: string,
): Promise<Uint8Array> => {
    const location = getFileLocation(prefix, fileTarget);
    return await Deno.readFile(location);
};

export const getTempFileSize = async (
    prefix: string,
    fileTarget: string,
): Promise<number> => {
    const location = getFileLocation(prefix, fileTarget);
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
