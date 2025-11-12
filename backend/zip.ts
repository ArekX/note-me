import { BlobReader, TextReader, ZipWriter } from "$backend/deps.ts";

export type ZipFile = Awaited<ReturnType<typeof createZip>>;

export const createZip = async (location: string) => {
    const file = await Deno.open(location, { write: true, create: true });
    const writer = new ZipWriter(file);
    let isClosed = false;

    const addTextFile = async (name: string, content: string) => {
        if (isClosed) {
            return;
        }
        await writer.add(name, new TextReader(content));
    };

    const addBinaryFile = async (name: string, content: Uint8Array) => {
        if (isClosed) {
            return;
        }
        await writer.add(
            name,
            new BlobReader(new Blob([content as unknown as ArrayBuffer])),
        );
    };

    const finalize = async () => {
        if (isClosed) {
            return;
        }

        try {
            await writer.close();
            file.close();
        } catch {
            // ignore
        }

        isClosed = true;
    };

    return {
        addTextFile,
        addBinaryFile,
        finalize,
        [Symbol.dispose]() {
            return finalize();
        },
    };
};
