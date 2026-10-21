<script setup lang="ts">
import { ref } from "vue";
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import CreateLinkForm from "./CreateLinkForm.vue";
import IconButton from "@/components/IconButton.vue";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { useToastStore } from "@/stores/toast";
import type {
    RemovePublicShareMessage,
    RemovePublicShareResponse,
} from "@/types/messages";
import type { PublicNoteShareRecord } from "@/types/records";

const props = defineProps<{
    noteId: number;
    initialLinks: PublicNoteShareRecord[];
}>();
const emit = defineEmits<{ linksChanged: [links: PublicNoteShareRecord[]] }>();

const { sendMessage } = useWebsocketService();
const links = ref<PublicNoteShareRecord[]>([...props.initialLinks]);

const linkUrl = (link: PublicNoteShareRecord) =>
    `${location.origin}/public/${link.identifier}`;

const setLinks = (newLinks: PublicNoteShareRecord[]) => {
    links.value = newLinks;
    emit("linksChanged", newLinks);
};

const deleteLink = async (link: PublicNoteShareRecord) => {
    try {
        await sendMessage<RemovePublicShareMessage, RemovePublicShareResponse>(
            "notes",
            "removePublicShare",
            {
                data: { note_id: props.noteId, id: link.id },
                expect: "removePublicShareResponse",
            },
        );
    } catch (error) {
        useToastStore().reportError(error);
        return;
    }
    setLinks(links.value.filter((l) => l.id !== link.id));
};

const copyLink = async (link: PublicNoteShareRecord) => {
    await navigator.clipboard.writeText(linkUrl(link));
    useToastStore().addMessage({
        type: "success",
        text: `Link "${link.identifier}" copied to clipboard`,
    });
};
</script>

<template>
    <div>
        <strong>Important:</strong> Links generated here can be viewed by anyone
        with that link.

        <div class="mt-4">
            <div class="text-xl font-semibold py-2">
                Public links for this note
            </div>
            <div
                v-for="link in links"
                :key="link.id"
                class="flex flex-wrap items-center justify-between p-2 border rounded-lg border-line bg-surface-2 mb-2"
            >
                <div class="max-md:basis-full max-md:max-w-full">
                    <a
                        :href="`/public/${link.identifier}`"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-md font-semibold block mb-2 underline whitespace-nowrap overflow-hidden text-ellipsis"
                    >
                        Link: {{ link.identifier }}
                    </a>
                    <div class="text-sm">
                        <p>
                            Expires
                            <TimeAgo
                                :time="link.expires_at"
                                empty-text="- never"
                            />
                        </p>
                        <p>Created <TimeAgo :time="link.created_at" /></p>
                    </div>
                </div>
                <div class="max-md:flex max-md:basis-full max-md:pt-2">
                    <Button
                        color="success"
                        size="sm"
                        title="Copy link"
                        add-class="md:mr-2 max-md:block max-md:basis-1/2"
                        @click="copyLink(link)"
                    >
                        <Icon name="clipboard" />
                    </Button>
                    <IconButton
                        icon="trash"
                        title="Delete link"
                        add-class="max-md:ml-2 max-md:block max-md:basis-1/2"
                        danger
                        @click="deleteLink(link)"
                    />
                </div>
            </div>
            <div v-if="links.length === 0" class="text-muted">
                No public links created.
            </div>
        </div>

        <CreateLinkForm
            :note-id="noteId"
            @link-created="(link) => setLinks([link, ...links])"
        />
    </div>
</template>
