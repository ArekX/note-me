import { inputHandler } from "$frontend/methods.ts";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { createRef } from "preact";
import Loader from "$islands/Loader.tsx";
import { useSinglePopover } from "$frontend/hooks/use-single-popover.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    FindTagsMessage,
    FindTagsResponse,
} from "$workers/websocket/api/tags/messages.ts";
import {
    findTagSides,
    getFormattedTagString,
    getTagArray,
} from "$frontend/tags.ts";
import { useDebouncedCallback } from "$frontend/hooks/use-debounced-callback.ts";

const insertTag = (element: HTMLInputElement, tag: string) => {
    const tagString = element.value;
    const { leftIndex = null, rightIndex = null } = findTagSides(
        tagString,
        element.selectionStart ?? 0,
    ) ?? {};

    if (leftIndex === null || rightIndex === null) {
        return;
    }

    let before = tagString.substring(0, leftIndex).trim();
    let after = tagString.substring(rightIndex).trim();

    if (before.length > 0) {
        before += " ";
    }

    if (after.length > 0) {
        after = " " + after;
    }

    element.value = before + `#${tag}` + after;
    element.selectionStart = leftIndex + tag.length + 2;
    element.selectionEnd = leftIndex + tag.length + 2;
    element.dispatchEvent(new Event("input"));
};

const calculateDropdownPos = (
    dropdown: HTMLDivElement,
    input: HTMLInputElement,
) => {
    const position = input.selectionStart || 0;
    const span = document.createElement("span");
    span.style.position = "absolute";
    span.style.visibility = "hidden";

    const styles = getComputedStyle(input);

    for (let i = 0; i < styles.length; i++) {
        const key = styles[i];
        // deno-lint-ignore no-explicit-any
        span.style[key as any] = styles[key as any];
    }

    span.style.display = "inline-block";
    span.style.width = "auto";

    span.textContent = input.value.substring(0, position);
    document.body.appendChild(span);
    const textWidth = span.offsetWidth;
    document.body.removeChild(span);

    const { left, top } = input.getBoundingClientRect();

    dropdown.style.top = `${top + input.offsetHeight}px`;
    dropdown.style.left = `${textWidth + left}px`;
};

interface TagInputProps {
    initialTags: string[];
    isSaving?: boolean;
    placeholder?: string;
    addClass?: string;
    noTransparentBackground?: boolean;
    onChange: (tags: string[]) => void;
    onEnterPressed?: () => void;
}

export default function TagInput({
    initialTags,
    isSaving = false,
    placeholder = "Tag your note",
    addClass = "",
    noTransparentBackground = false,
    onEnterPressed,
    onChange,
}: TagInputProps) {
    const tagString = useSignal(getFormattedTagString(initialTags.join(" ")));
    const inputRef = createRef<HTMLInputElement>();
    const isSearching = useLoader(true);
    const dropdownRef = createRef<HTMLDivElement>();
    const tagInputRef = createRef<HTMLDivElement>();
    const selectedTagIndex = useSignal<number | null>(null);
    const autocompleteTags = useSignal<string[]>([]);

    const { sendMessage } = useWebsocketService();

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === "s") {
            writeTags();
            return;
        }

        if (!isOpen && e.key === "Enter") {
            writeTags();
            onEnterPressed?.();
            return;
        }

        if (autocompleteTags.value.length == 0) {
            isSearching.start();
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
        } else if (e.key === "Enter") {
            if (selectedTagIndex.value !== null) {
                insertTag(
                    inputRef.current!,
                    autocompleteTags.value[selectedTagIndex.value],
                );
                closeTagWindow();
            }
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if (
            e.key === "Tab" || e.key === "ArrowDown" || e.key === "ArrowUp" ||
            e.key === "Enter"
        ) {
            return;
        }

        const target = e.currentTarget as HTMLInputElement;

        const { tag } = findTagSides(
            target.value ?? "",
            target.selectionStart ?? 0,
        ) || {};

        isSearching.start();
        searchTags(tag ?? null);
    };

    const handleTagClick = (tag: string) => {
        insertTag(inputRef.current!, tag);
        closeTagWindow();
    };

    const searchTags = useDebouncedCallback(async (tag: string | null) => {
        if (!tag) {
            closeTagWindow();
            isSearching.stop();
            return;
        }

        await isSearching.run(async () => {
            open();
            const { records } = await sendMessage<
                FindTagsMessage,
                FindTagsResponse
            >("tags", "findTags", {
                data: {
                    filters: {
                        name: tag,
                    },
                    page: 1,
                },
                expect: "findTagsResponse",
            });

            autocompleteTags.value = records.results.map((r) => r.name);
            selectedTagIndex.value = 0;
        });
    }, 250);

    const recalculatePosition = () => {
        if (!dropdownRef.current || !inputRef.current) {
            return;
        }

        calculateDropdownPos(dropdownRef.current, inputRef.current);
    };

    const writeTags = () => {
        tagString.value = getFormattedTagString(tagString.value);
        onChange(getTagArray(tagString.value));
    };

    const { isOpen, open, close: closeTagWindow } = useSinglePopover(
        "tagInput-0",
        dropdownRef,
        () => {
            recalculatePosition();
            selectedTagIndex.value = 0;
        },
        () => {
            selectedTagIndex.value = null;
            writeTags();
        },
    );

    useEffect(() => {
        if (dropdownRef.current) {
            recalculatePosition();
        }
    }, [dropdownRef]);

    useEffect(() => {
        const handleInputLeave = (e: MouseEvent) => {
            if (e.target === inputRef.current) {
                return;
            }

            if (
                tagInputRef.current &&
                !tagInputRef.current.contains(e.target as Node)
            ) {
                closeTagWindow();
            }
            writeTags();
        };

        document.addEventListener("click", handleInputLeave);

        return () => {
            document.removeEventListener("click", handleInputLeave);
        };
    }, []);

    return (
        <div ref={tagInputRef}>
            <input
                ref={inputRef}
                class={`outline-none block ${
                    noTransparentBackground ? "" : "bg-transparent"
                } mt-2 w-full tag-editor ${addClass}`}
                type="text"
                placeholder={placeholder}
                tabIndex={2}
                value={tagString.value}
                disabled={isSaving}
                onInput={inputHandler((value) => tagString.value = value)}
                onBlur={() => writeTags()}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
            />
            {isOpen && (
                <div
                    ref={dropdownRef}
                    class="z-40 fixed top-full left-0 bg-gray-800 border border-b-0 border-gray-600/50 text-white max-h-52 overflow-auto rounded-md"
                >
                    {isSearching.running && (
                        <div class="p-4">
                            <Loader color="white">Searching...</Loader>
                        </div>
                    )}
                    {!isSearching.running &&
                        autocompleteTags.value.map((tag, index) => (
                            <div
                                onClick={() => handleTagClick(tag)}
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
                                class={`cursor-pointer border-b last:border-b-0 border-gray-600/50 pr-4 pl-4 pt-2 pb-2 
                                  hover:bg-gray-400 ${
                                    selectedTagIndex.value === index
                                        ? "bg-gray-600"
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
