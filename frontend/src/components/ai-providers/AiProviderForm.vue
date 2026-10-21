<script lang="ts">
import type { AiProviderType } from "@/types/records";

export interface EditableAiProvider {
    id: number | null;
    name: string;
    type: AiProviderType;
    base_url: string;
    model: string;
    has_key: boolean;
    is_default: boolean;
}

// Ollama starts at its cloud; a local server is http://localhost:11434.
export const defaultBaseUrls: Record<AiProviderType, string> = {
    ollama: "https://ollama.com",
    openai: "https://api.openai.com/v1",
    claude: "https://api.anthropic.com",
};
</script>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Button from "@/components/Button.vue";
import Checkbox from "@/components/Checkbox.vue";
import Dialog from "@/components/Dialog.vue";
import DropdownList from "@/components/DropdownList.vue";
import Icon from "@/components/Icon.vue";
import Input from "@/components/Input.vue";
import Loader from "@/components/Loader.vue";
import { useLoader } from "@/composables/useLoader";
import { useValidation } from "@/composables/useValidation";
import { aiProviderSchema, type AiProviderRequest } from "@/schemas/ai";
import { useAiProvidersStore } from "@/stores/ai-providers";
import { useToastStore } from "@/stores/toast";

const props = defineProps<{ provider: EditableAiProvider }>();
const emit = defineEmits<{ close: [] }>();

const providersStore = useAiProvidersStore();
const toastStore = useToastStore();
const saving = useLoader();
const loadingModels = useLoader();
const isNew = props.provider.id === null;
const validation = useValidation<AiProviderRequest>(aiProviderSchema(isNew));

const name = ref(props.provider.name);
const type = ref<AiProviderType>(props.provider.type);
const baseUrl = ref(props.provider.base_url);
const model = ref(props.provider.model);
const apiKey = ref("");
const isDefault = ref(props.provider.is_default);
const models = ref<string[]>([]);

const typeItems: { value: AiProviderType; label: string }[] = [
    { value: "ollama", label: "Ollama" },
    { value: "openai", label: "OpenAI (or compatible)" },
    { value: "claude", label: "Claude" },
];

// A base URL still at the old type's default follows the new type.
watch(type, (next, previous) => {
    if (baseUrl.value === "" || baseUrl.value === defaultBaseUrls[previous]) {
        baseUrl.value = defaultBaseUrls[next];
    }
    models.value = [];
});

const modelItems = computed(() =>
    models.value.map((value) => ({ value, label: value })),
);

const keyPlaceholder = computed(() =>
    props.provider.has_key
        ? "Leave empty to keep the stored key"
        : type.value === "ollama"
          ? "Needed for ollama.com, not for a local server"
          : "",
);

const data = (): AiProviderRequest => ({
    name: name.value,
    type: type.value,
    base_url: baseUrl.value,
    model: model.value,
    ...(apiKey.value.trim() ? { api_key: apiKey.value.trim() } : {}),
});

const loadModels = loadingModels.wrap(async () => {
    try {
        models.value = await providersStore.listModels(
            props.provider.id,
            type.value,
            baseUrl.value,
            apiKey.value.trim() || null,
        );
        if (models.value.length === 0) {
            toastStore.addMessage({
                type: "info",
                text: "The provider lists no models.",
            });
        }
    } catch (error) {
        toastStore.reportError(error);
    }
});

const save = saving.wrap(async () => {
    if (!(await validation.validate(data()))) {
        return;
    }
    try {
        await providersStore.save(props.provider.id, data(), isDefault.value);
        emit("close");
    } catch (error) {
        if (validation.setServerErrors(error)) {
            return;
        }
        toastStore.reportError(error);
    }
});
</script>

<template>
    <Dialog
        can-cancel
        class="w-[36rem] max-md:w-full"
        :title="isNew ? 'Add AI provider' : 'Edit AI provider'"
        icon="bot"
        @cancel="emit('close')"
    >
        <form id="ai-provider-form" @submit.prevent="save">
            <div class="py-2">
                <Input
                    v-model="name"
                    label="Name"
                    :validation="validation.state"
                    path="name"
                />
            </div>
            <div class="py-2">
                <DropdownList
                    v-model="type"
                    label="Type"
                    :items="typeItems"
                    :validation="validation.state"
                    path="type"
                />
            </div>
            <div class="py-2">
                <Input
                    v-model="baseUrl"
                    label="Base URL"
                    :validation="validation.state"
                    path="base_url"
                />
            </div>
            <div class="py-2">
                <Input
                    v-model="apiKey"
                    type="password"
                    label="API key"
                    disable-autocomplete
                    :placeholder="keyPlaceholder"
                    :validation="validation.state"
                    path="api_key"
                />
            </div>
            <div class="py-2 flex items-end gap-2">
                <Input
                    v-model="model"
                    class="grow"
                    label="Model"
                    :validation="validation.state"
                    path="model"
                />
                <Button
                    :disabled="loadingModels.running.value"
                    title="Load models"
                    @click="loadModels"
                >
                    <Icon name="list-ul" size="lg" /> Load models
                </Button>
            </div>
            <div v-if="modelItems.length > 0" class="py-2">
                <DropdownList
                    v-model="model"
                    label="Models of the provider"
                    :items="modelItems"
                />
            </div>
            <div class="py-2">
                <Checkbox v-model="isDefault" label="Default provider" />
                <p class="text-xs text-muted">
                    Users get the default provider unless their own setting
                    picks another one or no AI.
                </p>
            </div>
            <Loader v-if="saving.running.value" color="white">Saving...</Loader>
        </form>
        <template #footer>
            <Button @click="emit('close')">Cancel</Button>
            <Button type="submit" form="ai-provider-form" color="success">
                Save
            </Button>
        </template>
    </Dialog>
</template>
