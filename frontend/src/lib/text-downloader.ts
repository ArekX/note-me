export const markdownFileName = (title: string) =>
    title.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".md";

export const downloadTextAsMarkdown = (title: string, text: string) => {
    const file = new File([text], markdownFileName(title), {
        type: "text/markdown",
    });

    const link = document.createElement("a");
    const url = URL.createObjectURL(file);

    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
