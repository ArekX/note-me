import { ZipWriter } from "$backend/deps.ts";
import { TextReader } from "$backend/deps.ts";

export const createZip = async (location: string) => {
    const file = await Deno.open(location, { write: true });
    const writer = new ZipWriter(file);

    const addTextFile = async (name: string, content: string) => {
        await writer.add(name, new TextReader(content));
    };

    const finalize = async () => {
        await writer.close();
        file.close();
    };

    return { addTextFile, finalize };
};
