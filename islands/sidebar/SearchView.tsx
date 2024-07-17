import { SearchStateHook } from "./hooks/use-search-state.ts";
import Loader from "$islands/Loader.tsx";
import LoadMoreWrapper from "$islands/LoadMoreWrapper.tsx";
import TreeItemView from "$islands/sidebar/search/TreeItemView.tsx";
import Button from "$components/Button.tsx";
import { tagsToString } from "$frontend/tags.ts";
import Icon from "$components/Icon.tsx";

interface SearchViewProps {
    search: SearchStateHook;
}

export default function SearchView({
    search,
}: SearchViewProps) {
    return (
        <div class="relative">
            <div class="p-1">
                {search.groupRecord.value && (
                    <Button
                        size="sm"
                        color="success"
                        addClass="mr-2 mt-1"
                        title="Clear group filter"
                        onClick={() => search.setGroup(null)}
                    >
                        <Icon name="folder" size="sm" />{" "}
                        {search.groupRecord.value.name}{" "}
                        <Icon name="minus-circle" size="sm" />
                    </Button>
                )}
                {search.tags.value.length > 0 && (
                    <Button
                        size="sm"
                        color="success"
                        title="Clear tag filter"
                        addClass="mt-1"
                        onClick={() => search.setTags([])}
                    >
                        <Icon name="tag" size="sm" />{" "}
                        {tagsToString(search.tags.value)}{" "}
                        <Icon name="minus-circle" size="sm" />
                    </Button>
                )}
            </div>
            <div class="p-2">
                Search results{" "}
                {search.loader.running
                    ? ""
                    : `(${search.results.value.length})`}
            </div>
            {search.loader.running
                ? (
                    <div class="text-center">
                        <Loader color="white" />
                    </div>
                )
                : (
                    <>
                        {search.results.value.length === 0 && (
                            <div class="p-2 text-center text-gray-400">
                                No results found
                            </div>
                        )}
                        <LoadMoreWrapper
                            addCss="search-view-height"
                            hasMore={search.hasMoreData.value}
                            onLoadMore={() => search.loadMore()}
                        >
                            <div>
                                {search.results.value.map((i, idx) => (
                                    <TreeItemView
                                        search={search}
                                        key={idx}
                                        record={i}
                                    />
                                ))}
                            </div>
                        </LoadMoreWrapper>
                    </>
                )}
        </div>
    );
}
