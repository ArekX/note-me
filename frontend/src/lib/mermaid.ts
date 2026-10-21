import type { Mermaid } from "mermaid";

const palette = [
    "#1e4361ff",
    "#24583aff",
    "#653a17ff",
    "#523f79ff",
    "#236d69ff",
    "#792424ff",
    "#4e3a11ff",
    "#3a424eff",
];

const indexed = (prefix: string, colors: string[], start = 0) =>
    Object.fromEntries(
        colors.map((color, i) => [`${prefix}${i + start}`, color]),
    );

// Theme of the original app.
const themeVariables = {
    primaryColor: "#2d3748",
    primaryTextColor: "#e2e8f0",
    primaryBorderColor: "#4a5568",
    secondaryColor: "#1a202c",
    tertiaryColor: "#2d3748",
    background: "#0f1419",
    mainBkg: "#1a202c",
    secondBkg: "#2d3748",
    lineColor: "#63b3ed",
    edgeLabelBackground: "#1a202c",
    textColor: "#e2e8f0",
    labelTextColor: "#cbd5e0",
    ...indexed("fillType", palette),
    ...indexed("c", palette),
    ...indexed(
        "pie",
        [...palette, "#0c2b45ff", "#164329ff", "#3f3939ff", "#3a3445ff"],
        1,
    ),
    ...indexed("cScale", palette.slice(0, 3)),
    ...indexed("git", palette),
    gridColor: "#4a5568",
    sectionBkgColor: "#2d3748",
    altSectionBkgColor: "#1a202c",
    errorBkgColor: "#e53e3e",
    errorTextColor: "#ffffff",
    noteBkgColor: "#2d3748",
    noteBorderColor: "#4a5568",
    noteTextColor: "#e2e8f0",
};

let loading: Promise<Mermaid> | null = null;

// Mermaid is large, so it is fetched the first time a diagram is shown.
export const loadMermaid = () =>
    (loading ??= import("mermaid").then(({ default: mermaid }) => {
        mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            // HTML in labels is rendered as text everywhere (SF-12).
            htmlLabels: false,
            flowchart: { htmlLabels: false },
            class: { htmlLabels: false },
            theme: "dark",
            themeVariables,
        });
        return mermaid;
    }));
