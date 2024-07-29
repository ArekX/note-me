export const downloadTextAsMarkdown = (title: string, text: string) => {
    const filename = title.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".md";

    const file = new File([text], filename, {
        type: "text/markdown",
    });

    const link = document.createElement("a");
    const url = URL.createObjectURL(file);

    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};
