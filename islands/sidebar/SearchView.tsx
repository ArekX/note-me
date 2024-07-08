import { useEffect } from "preact/hooks";
import { SearchStateHook } from "./hooks/use-search-state.ts";

interface SearchViewProps {
    search: SearchStateHook;
}

export default function SearchView({
    search,
}: SearchViewProps) {
    useEffect(() => {
        console.log("new req", search.request.value);
    }, [search.request.value]);

    return (
        <div>
            Search results for "{search.request.value.type}"
        </div>
    );
}
