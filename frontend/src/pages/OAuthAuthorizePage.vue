<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import Button from "@/components/Button.vue";
import Callout from "@/components/Callout.vue";
import Icon from "@/components/Icon.vue";
import Loader from "@/components/Loader.vue";
import Logo from "@/components/Logo.vue";
import { useLoader } from "@/composables/useLoader";
import { api, apiErrorMessage } from "@/lib/api";

interface Consent {
    client_name: string;
    is_read_only: boolean;
    user: { name: string; username: string };
}

const route = useRoute();
const loading = useLoader(true);
const answering = useLoader();
const consent = ref<Consent | null>(null);
const error = ref("");
const redirecting = ref(false);

// The server checks the request again on every call, so it gets the query
// exactly as the AI app sent it.
const query = route.fullPath.split("#")[0]!.split("?")[1] ?? "";

const load = loading.wrap(async () => {
    try {
        consent.value = await api.get<Consent>(`/api/oauth/consent?${query}`);
    } catch (e) {
        error.value = apiErrorMessage(e);
    }
});

const answer = answering.wrap(async (allow: boolean) => {
    error.value = "";
    try {
        const { redirect_url } = await api.post<{ redirect_url: string }>(
            "/api/oauth/consent",
            { query, allow },
        );
        redirecting.value = true;
        location.assign(redirect_url);
    } catch (e) {
        consent.value = null;
        error.value = apiErrorMessage(e);
    }
});

onMounted(load);
</script>

<template>
    <div class="flex items-center justify-center h-dvh px-4 py-6 text-fg">
        <div
            class="w-full max-w-md max-h-full overflow-auto rounded-2xl border border-line bg-night/60 glass shadow-float px-10 py-8 max-md:px-6"
        >
            <div class="text-center mb-5">
                <Logo white :size="72" />
            </div>
            <Loader v-if="loading.running.value">Loading...</Loader>
            <Callout v-else-if="error" tone="danger" icon="error">
                {{ error }}
            </Callout>
            <template v-else-if="consent">
                <h1 class="text-xl font-bold tracking-tight text-center">
                    {{ consent.client_name }} wants to access your NoteMe
                    account
                </h1>
                <p class="text-sm text-muted text-center mt-1">
                    Signed in as {{ consent.user.name }} ({{
                        consent.user.username
                    }})
                </p>

                <div class="flex flex-col gap-3 my-6 text-sm">
                    <p v-if="consent.is_read_only" class="flex gap-2">
                        <Icon name="show" size="lg" class-name="text-accent" />
                        <span>
                            <strong>Read only access:</strong> it can read your
                            notes, folders, reminders, tags, files and
                            notifications but not change anything.
                        </span>
                    </p>
                    <p v-else class="flex gap-2">
                        <Icon name="edit" size="lg" class-name="text-warning" />
                        <span>
                            <strong>Full access:</strong> it can read and change
                            your notes, folders, reminders, sharing and files
                            with your permissions.
                        </span>
                    </p>
                    <p class="flex gap-2">
                        <Icon name="lock" size="lg" class-name="text-muted" />
                        <span class="text-muted">
                            Protected notes are never available to it. You can
                            take access back at any time by deleting the client
                            in Profile → MCP clients.
                        </span>
                    </p>
                </div>

                <Loader v-if="answering.running.value || redirecting">
                    Please wait...
                </Loader>
                <div v-else class="flex justify-end gap-2">
                    <Button @click="answer(false)">Deny</Button>
                    <Button color="success" @click="answer(true)">
                        Allow
                    </Button>
                </div>
            </template>
        </div>
    </div>
</template>
