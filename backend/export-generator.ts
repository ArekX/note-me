import { createZip } from "$backend/zip.ts";
import { createTempFile, getFileLocation } from "$backend/temp.ts";

interface GenerateExportOptions {
    fileLocation: string;
    userPassword: string;
    onProgressUpdate: (percentage: number) => void;
}

export const generateExport = async ({
    fileLocation,
    onProgressUpdate,
}: GenerateExportOptions) => {
    const zip = await createZip(fileLocation);

    await zip.addTextFile("notes.txt", "Hello, world!");

    onProgressUpdate(100);

    await zip.finalize();
};

export const createInitialExportFile = async (userId: number) => {
    const prefix = "data-export-" + userId;
    const exportId = await createTempFile(prefix);

    return {
        exportId,
        fileLocation: getExportLocation(exportId, userId),
    };
};

export const getExportLocation = (exportId: string, userId: number) => {
    const prefix = "data-export-" + userId;
    return getFileLocation(prefix, exportId);
};
