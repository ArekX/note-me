const sanitizeUrlForMarkdown = (url: string) => {
    return url.replace("(", "%28").replace(")", "%29");
};

export const getImageMarkdown = (url: string, alt: string) =>
    `![${alt}](${sanitizeUrlForMarkdown(url)})`;

export const getLinkMarkdown = (url: string, text: string) =>
    `[${text}](${sanitizeUrlForMarkdown(url)})`;

export const getFileViewUrl = (identifier: string) => `/file/${identifier}`;

export const getFileDownloadUrl = (identifier: string) =>
    getFileViewUrl(identifier) + "?download";
