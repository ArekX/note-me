import { inputHandler } from "$frontend/methods.ts";
import { useSignal } from "@preact/signals";

interface TagInputProps {
    initialTags: string[];
    isSaving: boolean;
    onChange: (tags: string[]) => void;
}

const getTagArray = (tagString: string) => {
    const sanitizedTagString = tagString
        .replace(/[^a-zA-Z0-9_# -]+/g, "")
        .replace(/#/g, " ")
        .replace(/ {2,}/g, " ")
        .replace(/\-{2,}/g, "-")
        .replace(/\_{2,}/g, "_")
        .trim();
    if (sanitizedTagString.length == 0) {
        return [];
    }

    return Array.from(new Set(sanitizedTagString.split(" ")));
};

const getFormattedTagString = (tagString: string) => {
    const tags = getTagArray(tagString);
    return tags.length > 0 ? `#${tags.join(" #")}` : "";
};

export default function TagInput({
    initialTags,
    isSaving,
    onChange,
}: TagInputProps) {
    const tagString = useSignal(getFormattedTagString(initialTags.join(" ")));

    const formatTagString = () => {
        tagString.value = getFormattedTagString(tagString.value);
        onChange(getTagArray(tagString.value));
    };

    return (
        <div>
            <input
                class="outline-none block bg-transparent mt-2 w-full tag-editor"
                type="text"
                placeholder="Tag your note"
                tabIndex={2}
                value={tagString.value}
                disabled={isSaving}
                onInput={inputHandler((value) => tagString.value = value)}
                onBlur={formatTagString}
            />
        </div>
    );
}
