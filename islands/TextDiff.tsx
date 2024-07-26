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
        <pre class="diff-viewer text-sm whitespace-pre-wrap">
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
    );
}
