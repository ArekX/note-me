import { inputHandler } from "$frontend/methods.ts";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { createRef } from "preact";
import Loader from "$islands/Loader.tsx";
import { useSinglePopover } from "$frontend/hooks/use-single-popover.ts";
import { useLoader } from "$frontend/hooks/use-loading.ts";

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
    const inputRef = createRef<HTMLInputElement>();
    const isSearching = useLoader(true);
    const dropdownRef = createRef<HTMLDivElement>();
    const tagInputRef = createRef<HTMLDivElement>();
    const selectedTagIndex = useSignal<number | null>(null);
    const autocompleteTags = useSignal<string[]>([
        "tag1",
        "tag2",
        "tag3",
        "tag3",
        "tag3",
        "tag3",
        "tag3",
    ]);

    const handleBlur = () => {
        tagString.value = getFormattedTagString(tagString.value);
        onChange(getTagArray(tagString.value));
        // selectedTagIndex.value = null;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if (autocompleteTags.value.length === 0) {
            return;
        }

        if (e.key === "Tab") {
            return;
        }

        if (e.key === "ArrowDown") {
            selectedTagIndex.value = Math.min(
                (selectedTagIndex.value ?? -1) + 1,
                autocompleteTags.value.length - 1,
            );
            e.preventDefault();
        } else if (e.key === "ArrowUp") {
            selectedTagIndex.value = Math.max(
                (selectedTagIndex.value ?? 1) - 1,
                0,
            );

            e.preventDefault();
        }

        open();
    };

    const calculateDropdownPos = () => {
        if (!dropdownRef.current || !inputRef.current) {
            return;
        }

        const el = inputRef.current;

        const position = el.selectionStart || 0;
        const span = document.createElement("span");
        span.style.position = "absolute";
        span.style.visibility = "hidden";

        const styles = getComputedStyle(el);

        for (let i = 0; i < styles.length; i++) {
            const key = styles[i];
            // deno-lint-ignore no-explicit-any
            span.style[key as any] = styles[key as any];
        }

        span.style.display = "inline-block";
        span.style.width = "auto";

        span.textContent = el.value.substring(0, position);
        document.body.appendChild(span);
        const textWidth = span.offsetWidth;
        document.body.removeChild(span);

        const { left, top } = el.getBoundingClientRect();

        dropdownRef.current.style.top = `${top + el.offsetHeight}px`;
        dropdownRef.current.style.left = `${textWidth + left}px`;
    };

    const handleAddTag = (tag: string) => {
        tagString.value = `${tagString.value} ${tag}`;
        onChange(getTagArray(tagString.value));
        selectedTagIndex.value = null;
        console.log(tag);
    };

    const { isOpen, open } = useSinglePopover(
        "tagInput-0",
        dropdownRef,
        () => {
            calculateDropdownPos();
            selectedTagIndex.value = 0;
        },
        () => selectedTagIndex.value = null,
    );

    useEffect(() => {
        if (dropdownRef.current) {
            calculateDropdownPos();
        }
    }, [dropdownRef]);

    return (
        <div ref={tagInputRef}>
            <input
                ref={inputRef}
                class="outline-none block bg-transparent mt-2 w-full tag-editor"
                type="text"
                placeholder="Tag your note"
                tabIndex={2}
                value={tagString.value}
                disabled={isSaving}
                onInput={inputHandler((value) => tagString.value = value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyUp}
            />
            {isOpen && (
                <div
                    ref={dropdownRef}
                    class="fixed top-full left-0 bg-gray-800 text-white max-h-52 overflow-auto rounded-md"
                >
                    {isSearching.running && (
                        <div class="p-4">
                            <Loader color="white">Searching...</Loader>
                        </div>
                    )}
                    {!isSearching.running &&
                        autocompleteTags.value.map((tag, index) => (
                            <div
                                onClick={() => handleAddTag(tag)}
                                ref={(el) => {
                                    if (
                                        selectedTagIndex.value === index
                                    ) {
                                        el?.scrollIntoView({
                                            behavior: "smooth",
                                            block: "nearest",
                                        });
                                    }
                                }}
                                class={`cursor-pointer border-b-2 last:border-b-0 border-gray-100 pr-4 pl-4 pt-2 pb-2 
                                  hover:bg-gray-100 hover:text-black ${
                                    selectedTagIndex.value === index
                                        ? "bg-gray-100 text-black"
                                        : ""
                                }`}
                            >
                                #{tag}
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}
