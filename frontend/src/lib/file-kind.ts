export type FileKind = "image" | "document" | "other";

// Counterpart of the mime type conditions in the sqlite FindFiles query.
const documentTypes = new Set([
    "application/pdf",
    "application/msword",
    "application/rtf",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
    "application/json",
]);

const documentPrefixes = [
    "text/",
    "application/vnd.openxmlformats-officedocument.",
    "application/vnd.oasis.opendocument.",
];

export const fileKind = (mimeType: string): FileKind => {
    if (mimeType.startsWith("image/")) {
        return "image";
    }
    if (
        documentTypes.has(mimeType) ||
        documentPrefixes.some((prefix) => mimeType.startsWith(prefix))
    ) {
        return "document";
    }
    return "other";
};

export const fileKindIcons: Record<FileKind, string> = {
    image: "image",
    document: "file-blank",
    other: "file",
};

export const previewKind = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
        return "image";
    }
    if (mimeType.startsWith("video/")) {
        return "video";
    }
    return mimeType.startsWith("audio/") ? "audio" : "file";
};
