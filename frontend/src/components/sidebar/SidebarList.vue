<script setup lang="ts" generic="T">
import { onMounted } from "vue";
import LoadMoreWrapper from "@/components/LoadMoreWrapper.vue";
import NoItemMessage from "@/components/NoItemMessage.vue";
import Skeleton from "@/components/Skeleton.vue";
import SwitcherContainer from "./SwitcherContainer.vue";
import type { LoadMoreList } from "@/composables/useLoadMore";

const props = defineProps<{
    list: LoadMoreList<T>;
    emptyIcon: string;
    recordKey: (record: T) => string | number;
}>();

defineSlots<{
    switcher(): unknown;
    search(): unknown;
    empty(): unknown;
    default(props: { record: T }): unknown;
}>();

const icons = [
    { name: "Reload", icon: "refresh", onClick: () => props.list.reload() },
];

onMounted(() => props.list.loadMore());
</script>

<template>
    <SwitcherContainer :icons="icons">
        <slot name="switcher" />
    </SwitcherContainer>
    <slot name="search" />

    <div class="grow overflow-auto content-sidebar">
        <Skeleton
            v-if="list.loader.running.value && list.records.value.length === 0"
            variant="list"
            :count="6"
        />
        <template v-else>
            <NoItemMessage
                v-if="list.records.value.length === 0"
                :icon="emptyIcon"
            >
                <slot name="empty" />
            </NoItemMessage>
            <LoadMoreWrapper
                :has-more="list.hasMore.value"
                @load-more="list.loadMore()"
            >
                <template
                    v-for="record in list.records.value"
                    :key="recordKey(record)"
                >
                    <slot :record="record" />
                </template>
            </LoadMoreWrapper>
        </template>
    </div>
</template>
