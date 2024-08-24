import { diffText } from "$frontend/diff.ts";

interface TextDiffProps {
    text1: string;
    text2: string;
}

export default function TextDiff({
    text1,
    text2,
}: TextDiffProps) {
    const diffLines = diffText(text1, text2);

    return (
        <div class="diff-viewer">
            <div>
                <span class="inline-block mr-2">
                    <span class="legend legend-added"></span> Line added
                </span>
                <span class="inline-block mr-2">
                    <span class="legend legend-removed"></span> Line removed
                </span>
                <span class="inline-block">
                    <span class="legend legend-changed"></span> Line changed
                </span>
            </div>
            <pre class="text-sm whitespace-pre-wrap block pt-10">
                {diffLines.map((line, index) => {
                    switch (line.type) {
                        case "added":
                            return (
                                <div class="diff-added" key={index}>
                                    {line.value}
                                </div>
                            );
                        case "removed":
                            return (
                                <div class="diff-removed" key={index}>
                                    {line.value}
                                </div>
                            );
                        case "same":
                            return (
                                <div class="diff-unchanged" key={index}>
                                    {line.value}
                                </div>
                            );
                        case "changed":
                            return (
                                <div
                                    class="diff-changed"
                                    key={index}
                                    title={`From: ${line.from}`}
                                >
                                    {line.to}
                                </div>
                            );
                    }
                })}
            </pre>
        </div>
    );
}
