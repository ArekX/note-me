import { type Signal, useSignal } from "@preact/signals";
import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";
import { useRef } from "preact/hooks";
import { createRef } from "preact";

interface SearchBarProps {
    onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
    const showAdvancedSearch = useSignal(false);
    const dialogRef = createRef<HTMLDialogElement>();
    return (
        <div class="flex relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400">
                <Icon name="search-alt" />
            </div>
            <div
                class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-white cursor-pointer"
                title="Advanced search"
                onClick={() => dialogRef.current?.showModal()}
            >
                <Icon name="filter-alt" />
            </div>
            <input
                type="text"
                class="outline-none border-1 pl-9 pr-9 border-gray-900 bg-gray-700 p-2 w-full"
                placeholder="Search notes..."
                onInput={(e) => onSearch((e.target as HTMLInputElement).value)}
            />
            <dialog ref={dialogRef}>
                <button onClick={() => dialogRef.current?.close()}>
                    finish this
                </button>
            </dialog>
        </div>
    );
}
