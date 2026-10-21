import { previewKind } from "./file-kind";

const sanitizeUrl = (url: string) =>
    url.replaceAll("(", "%28").replaceAll(")", "%29");

export const getImageMarkdown = (url: string, alt: string) =>
    `![${alt}](${sanitizeUrl(url)})`;

export const getLinkMarkdown = (url: string, text: string) =>
    `[${text}](${sanitizeUrl(url)})`;

export type MediaKind = "audio" | "video";

export const mediaAligns = ["left", "center", "right"] as const;

export type MediaAlign = (typeof mediaAligns)[number];

export const alignOf = (param: string | undefined): MediaAlign =>
    mediaAligns.find((align) => align === param?.trim()) ?? "left";

// "|" and "}" would end an extension parameter.
const extensionParam = (value: string) =>
    value.replace(/\|/g, "%7C").replace(/}/g, "%7D");

const extensionText = (value: string) => value.replace(/[|}\s]+/g, " ").trim();

// Left is where everything sits anyway, so it is not written.
export const getMediaMarkdown = (
    kind: MediaKind,
    url: string,
    align: MediaAlign = "left",
) => `{:${kind}|${extensionParam(url)}${align === "left" ? "" : `|${align}`}}`;

// A plain markdown image cannot be aligned, so an aligned one is written as
// the image extension.
export const getAlignedImageMarkdown = (
    url: string,
    alt: string,
    align: MediaAlign,
) => {
    const text = extensionText(alt);
    return `{:image|${extensionParam(url)}|${align}${text ? `|${text}` : ""}}`;
};

// Only uploaded files and http(s) addresses reach a media element.
export const playableMediaUrl = (url: string | undefined): string | null => {
    const trimmed = url?.trim() ?? "";
    return trimmed.startsWith("/file/") || /^https?:\/\//i.test(trimmed)
        ? trimmed
        : null;
};

export const getFileViewUrl = (identifier: string) => `/file/${identifier}`;

export const getFileDownloadUrl = (identifier: string) =>
    `${getFileViewUrl(identifier)}?download`;

// Every cell is padded to the longest one; the first row is the header.
export const getTableMarkdown = (rows: string[][]): string => {
    const [header, ...body] = rows;
    if (!header) {
        return "";
    }

    const width = Math.max(0, ...rows.flat().map((cell) => cell.length));
    const line = (cells: string[]) =>
        `| ${cells.map((cell) => cell.padEnd(width)).join(" | ")} |`;

    return [
        line(header),
        line(header.map(() => "-".repeat(width))),
        ...body.map(line),
    ].join("\n");
};

// Images show inline, audio and video get a player, anything else becomes
// a download link.
export const getFileMarkdown = (file: {
    identifier: string;
    name: string;
    mime_type: string;
}) => {
    const kind = previewKind(file.mime_type);
    const url = getFileViewUrl(file.identifier);
    if (kind === "image") {
        return getImageMarkdown(url, file.name);
    }
    if (kind === "audio" || kind === "video") {
        return getMediaMarkdown(kind, url);
    }
    return getLinkMarkdown(getFileDownloadUrl(file.identifier), file.name);
};

export const getUploadedFilesMarkdown = (
    uploaded: { file: File; identifier: string }[],
) =>
    uploaded
        .map(({ file, identifier }) =>
            getFileMarkdown({
                identifier,
                name: file.name,
                mime_type: file.type,
            }),
        )
        .join("\n");
