import Loader from "$islands/Loader.tsx";
import LoadMoreWrapper from "$islands/LoadMoreWrapper.tsx";
import NoteItemView from "./search/NoteItemView.tsx";
import Button from "$components/Button.tsx";
import { tagsToString } from "$frontend/tags.ts";
import Icon from "$components/Icon.tsx";
import { useSearch } from "$frontend/hooks/use-search.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import Picker from "$components/Picker.tsx";
import { NoteSearchRecord } from "$backend/repository/note-search-repository.ts";
import ReminderItem from "$islands/sidebar/reminders/ReminderItem.tsx";
import { ReminderNoteRecord } from "$backend/repository/note-reminder-repository.ts";
import RecycleBinItem from "$islands/sidebar/recycle-bin/RecycleBinItem.tsx";
import { DeletedNoteRecord } from "$backend/repository/note-repository.ts";
import SharedNoteItem from "$islands/sidebar/shared/SharedNoteItem.tsx";
import { UserSharedNoteMeta } from "$backend/repository/note-share-repository.ts";
import SwitcherContainer from "$islands/sidebar/SwitcherContainer.tsx";

export default function SearchView() {
    const search = useSearch();
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
                <SwitcherContainer
                    switcherComponent={
                        <>
                            Search results {search.isRunning.value
                                ? ""
                                : `(${search.results.value.length})`}
                        </>
                    }
                    icons={[
                        {
                            icon: "refresh",
                            name: "Refresh search",
                            onClick: () => search.reload(),
                        },
                    ]}
                />
            </div>
            {search.isRunning.value
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
                            {search.results.value.map((i, idx) => (
                                <Picker
                                    key={idx}
                                    selector={search.type.value}
                                    map={{
                                        general: () => (
                                            <NoteItemView
                                                record={i as NoteSearchRecord}
                                                searchQuery={search.query
                                                    .value}
                                                onNoteClick={() =>
                                                    redirectTo.viewNote({
                                                        noteId: i.id,
                                                    })}
                                            />
                                        ),
                                        reminders: () => (
                                            <ReminderItem
                                                record={i as ReminderNoteRecord}
                                            />
                                        ),
                                        recycleBin: () => (
                                            <RecycleBinItem
                                                record={i as DeletedNoteRecord}
                                            />
                                        ),
                                        shared: () => (
                                            <SharedNoteItem
                                                record={i as UserSharedNoteMeta}
                                            />
                                        ),
                                    }}
                                />
                            ))}
                        </LoadMoreWrapper>
                    </>
                )}
        </div>
    );
}
