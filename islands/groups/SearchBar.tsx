import type { Signal } from "@preact/signals";
import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  return (
    <div class="flex relative">
      <div class="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400">
        <Icon name="search-alt" />
      </div>
      <input
        type="text"
        class="outline-none border-1 pl-9 border-gray-900 bg-gray-700 p-2 w-full"
        placeholder="Search notes..."
        onInput={(e) => onSearch((e.target as HTMLInputElement).value)}
      />
    </div>
  );
}
