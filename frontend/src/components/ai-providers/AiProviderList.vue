<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "@/components/Badge.vue";
import Button from "@/components/Button.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import Icon from "@/components/Icon.vue";
import IconButton from "@/components/IconButton.vue";
import PageHeader from "@/components/PageHeader.vue";
import Table, { type TableColumn } from "@/components/Table.vue";
import { useDataChanges } from "@/composables/useDataChanges";
import { useLoader } from "@/composables/useLoader";
import { useAiProvidersStore } from "@/stores/ai-providers";
import { useToastStore } from "@/stores/toast";
import type { AiProviderRecord } from "@/types/records";
import AiProviderForm, {
    defaultBaseUrls,
    type EditableAiProvider,
} from "./AiProviderForm.vue";

const providersStore = useAiProvidersStore();
const toastStore = useToastStore();
const loader = useLoader(true);
const testing = ref(new Set<number>());
const providerToEdit = ref<EditableAiProvider | null>(null);
const providerToDelete = ref<AiProviderRecord | null>(null);

const typeLabels = { ollama: "Ollama", openai: "OpenAI", claude: "Claude" };

const columns: TableColumn<AiProviderRecord>[] = [
    { id: "name", name: "Name" },
    { id: "type", name: "Type" },
    { id: "model", name: "Model", key: "model" },
    { id: "actions", name: "", cellClass: "text-right whitespace-nowrap" },
];

const load = loader.wrap(async () => {
    try {
        await providersStore.load();
    } catch (error) {
        toastStore.reportError(error);
    }
});

const add = () => {
    providerToEdit.value = {
        id: null,
        name: "",
        type: "ollama",
        base_url: defaultBaseUrls.ollama,
        model: "",
        has_key: false,
        is_default: providersStore.providers.length === 0,
    };
};

const edit = (provider: AiProviderRecord) => {
    providerToEdit.value = {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        base_url: provider.base_url,
        model: provider.model,
        has_key: provider.has_key,
        is_default: provider.is_default,
    };
};

const run = async (action: () => Promise<unknown>) => {
    try {
        await action();
    } catch (error) {
        toastStore.reportError(error);
    }
};

const test = async (provider: AiProviderRecord) => {
    testing.value = new Set(testing.value).add(provider.id);
    await run(async () => {
        const result = await providersStore.test(provider.id);
        toastStore.addMessage({
            type: result.success ? "success" : "error",
            text: result.success
                ? `${provider.name}: ${result.message}`
                : `${provider.name} failed: ${result.message}`,
        });
    });
    const next = new Set(testing.value);
    next.delete(provider.id);
    testing.value = next;
};

const deletePrompt = computed(() => {
    const provider = providerToDelete.value;
    if (!provider) {
        return "";
    }
    const defaultWarning = provider.is_default
        ? " It is the default, so users on the default lose the assistant too."
        : "";
    return `Delete ${provider.name}? Users set to it get no AI.${defaultWarning} Their conversations stay, read only.`;
});

const confirmDelete = async () => {
    const provider = providerToDelete.value!;
    providerToDelete.value = null;
    await run(() => providersStore.remove(provider.id));
};

useDataChanges(["aiProvider"], load, { skipOwnRequests: true });
onMounted(load);
</script>

<template>
    <div>
        <PageHeader title="AI" help="admin-ai">
            AI providers the assistant can use. Users get the default provider
            unless their own setting in Settings → Users picks another one or no
            AI.
            <template #actions>
                <Button color="success" @click="add">
                    <Icon name="plus" size="lg" /> Add
                </Button>
            </template>
        </PageHeader>

        <Table
            :columns="columns"
            :rows="providersStore.providers"
            :is-loading="loader.running.value"
            :row-key="(row) => row.id"
            no-rows-text="No AI providers yet."
        >
            <template #cell-name="{ row }">
                <span class="inline-flex flex-wrap items-center gap-2">
                    {{ row.name }}
                    <Badge v-if="row.is_default" tone="accent">Default</Badge>
                    <Badge v-if="row.key_unreadable" tone="danger">
                        API key cannot be decrypted, enter it again
                    </Badge>
                </span>
            </template>
            <template #cell-type="{ row }">
                {{ typeLabels[row.type] }}
            </template>
            <template #cell-actions="{ row }">
                <IconButton icon="pencil" title="Edit" @click="edit(row)" />
                <IconButton
                    v-if="row.is_default"
                    icon="star"
                    title="Remove as default"
                    @click="run(() => providersStore.setDefault(null))"
                />
                <IconButton
                    v-else
                    icon="star"
                    title="Set as default"
                    add-class="opacity-50"
                    @click="run(() => providersStore.setDefault(row.id))"
                />
                <IconButton
                    :icon="testing.has(row.id) ? 'loader-alt' : 'check-shield'"
                    title="Test"
                    @click="testing.has(row.id) || test(row)"
                />
                <IconButton
                    icon="trash"
                    title="Delete"
                    danger
                    @click="providerToDelete = row"
                />
            </template>
        </Table>

        <AiProviderForm
            v-if="providerToEdit"
            :provider="providerToEdit"
            @close="providerToEdit = null"
        />
        <ConfirmDialog
            v-if="providerToDelete"
            :prompt="deletePrompt"
            confirm-color="danger"
            confirm-text="Delete"
            @confirm="confirmDelete"
            @cancel="providerToDelete = null"
        />
    </div>
</template>
