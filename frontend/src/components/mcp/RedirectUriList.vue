<script setup lang="ts">
import Button from "@/components/Button.vue";
import FormField from "@/components/FormField.vue";
import Icon from "@/components/Icon.vue";
import IconButton from "@/components/IconButton.vue";
import Input from "@/components/Input.vue";
import type { ValidationState } from "@/composables/useValidation";

defineProps<{ validation: ValidationState }>();

const uris = defineModel<string[]>({ required: true });
const newUri = defineModel<string>("newUri", { default: "" });

const presets = [
    {
        name: "Claude",
        uris: [
            "https://claude.ai/api/mcp/auth_callback",
            "https://claude.com/api/mcp/auth_callback",
        ],
    },
    {
        name: "ChatGPT",
        uris: ["https://chatgpt.com/connector_platform_oauth_redirect"],
    },
];

const add = (values: string[]) => {
    const added = values.map((v) => v.trim()).filter((v) => v !== "");
    uris.value = [...new Set([...uris.value, ...added])];
};

const hasAll = (values: string[]) =>
    values.every((v) => uris.value.includes(v));

const addTyped = () => {
    add([newUri.value]);
    newUri.value = "";
};

// Enter would submit the dialog's form instead.
const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
        event.preventDefault();
        addTyped();
    }
};

const remove = (uri: string) => {
    uris.value = uris.value.filter((u) => u !== uri);
};
</script>

<template>
    <FormField
        label="Redirect URIs"
        :validation="validation"
        path="redirect_uris"
    >
        <p class="text-xs text-muted pb-2">
            Where the AI app may send you back after you allow access. Add the
            preset for your app, or the address its settings show.
        </p>
        <div class="flex flex-wrap gap-2 pb-2">
            <Button
                v-for="preset in presets"
                :key="preset.name"
                size="sm"
                :disabled="hasAll(preset.uris)"
                @click="add(preset.uris)"
            >
                <Icon name="plus" size="lg" /> {{ preset.name }}
            </Button>
        </div>
        <ul v-if="uris.length > 0" class="pb-2">
            <li
                v-for="uri in uris"
                :key="uri"
                class="flex items-center gap-2 py-1 border-b border-line"
            >
                <code class="grow min-w-0 break-all text-xs">{{ uri }}</code>
                <IconButton
                    icon="x"
                    :title="`Remove ${uri}`"
                    danger
                    @click="remove(uri)"
                />
            </li>
        </ul>
        <div class="flex items-end gap-2">
            <Input
                v-model="newUri"
                class="grow"
                name="mcp-redirect-uri"
                placeholder="https://example.com/oauth/callback"
                @keydown="onKeydown"
            />
            <Button title="Add redirect URI" @click="addTyped">Add</Button>
        </div>
    </FormField>
</template>
