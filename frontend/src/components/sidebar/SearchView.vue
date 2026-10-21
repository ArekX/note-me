<script setup lang="ts">
import { useOpenNote } from "@/composables/useOpenNote";
import Icon from "@/components/Icon.vue";
import LoadMoreWrapper from "@/components/LoadMoreWrapper.vue";
import Skeleton from "@/components/Skeleton.vue";
import RecycleBinItem from "./recycle-bin/RecycleBinItem.vue";
import ReminderItem from "./reminders/ReminderItem.vue";
import SharedNoteItem from "./shared/SharedNoteItem.vue";
import NoteItemView from "./search/NoteItemView.vue";
import SwitcherContainer from "./SwitcherContainer.vue";
import { redirectTo } from "@/lib/redirect";
import { tagsToString } from "@/lib/tags";
import { useSearchStore } from "@/stores/search";
import type {
    DeletedNoteRecord,
    NoteSearchRecord,
    ReminderNoteRecord,
    UserSharedNoteMeta,
} from "@/types/records";

const openNote = useOpenNote();
const search = useSearchStore();

const icons = [
    { name: "Refresh search", icon: "refresh", onClick: () => search.reload() },
];
</script>

<template>
    <SwitcherContainer :icons="icons">
        Search results
        {{ search.isRunning ? "" : `(${search.results.length})` }}
    </SwitcherContainer>
    <slot name="search" />
    <div
        v-if="search.group || search.tags.length > 0"
        class="flex flex-wrap gap-1.5 px-3 pb-2"
    >
        <button
            v-if="search.group"
            type="button"
            class="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-accent-soft text-accent text-xs font-medium cursor-pointer"
            title="Clear group filter"
            @click="search.setGroup(null)"
        >
            <Icon name="folder" size="sm" /> {{ search.group.name }}
            <Icon name="x" size="sm" />
        </button>
        <button
            v-if="search.tags.length > 0"
            type="button"
            class="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-accent-soft text-accent text-xs font-medium cursor-pointer"
            title="Clear tag filter"
            @click="search.setTags([])"
        >
            <Icon name="tag" size="sm" />
            {{ tagsToString(search.tags) }}
            <Icon name="x" size="sm" />
        </button>
    </div>
    <div class="grow overflow-auto content-sidebar">
        <Skeleton
            v-if="search.results.length === 0 && search.isRunning"
            variant="list"
            :count="6"
        />
        <template v-else>
            <div
                v-if="!search.hasMore && search.results.length === 0"
                class="p-4 text-center text-muted text-sm"
            >
                No results found
            </div>
            <LoadMoreWrapper
                :has-more="search.hasMore"
                @load-more="search.loadMore()"
            >
                <template v-if="search.type === 'general'">
                    <NoteItemView
                        v-for="record in search.results as NoteSearchRecord[]"
                        :key="record.id"
                        :record="record"
                        :search-query="search.query"
                        @note-click="
                            openNote(redirectTo.viewNote({ noteId: record.id }))
                        "
                    />
                </template>
                <template v-else-if="search.type === 'shared'">
                    <SharedNoteItem
                        v-for="record in search.results as UserSharedNoteMeta[]"
                        :key="record.share_id"
                        :record="record"
                    />
                </template>
                <template v-else-if="search.type === 'reminders'">
                    <ReminderItem
                        v-for="record in search.results as ReminderNoteRecord[]"
                        :key="record.id"
                        :record="record"
                    />
                </template>
                <template v-else-if="search.type === 'recycleBin'">
                    <RecycleBinItem
                        v-for="record in search.results as DeletedNoteRecord[]"
                        :key="record.id"
                        :record="record"
                    />
                </template>
            </LoadMoreWrapper>
        </template>
    </div>
</template>
