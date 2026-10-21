<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Logo from "@/components/Logo.vue";
import Alert from "@/components/Alert.vue";
import Input from "@/components/Input.vue";
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";
import Loader from "@/components/Loader.vue";
import { useUserStore } from "@/stores/user";
import { useLoader } from "@/composables/useLoader";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { clearStorage } from "@/lib/local-storage";
import { passkeyErrorMessage, supportsPasskeys } from "@/lib/passkeys";
import { sameSitePath } from "@/lib/redirect";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const username = ref("");
const password = ref("");
const message = ref("");
const submitting = useLoader();
const passkeyRunning = useLoader();
const canUsePasskeys = supportsPasskeys();

// Drop data cached by a previous session.
onMounted(clearStorage);

// /file/ is served by the server, not the app.
const goToRedirect = async () => {
    const target = sameSitePath(route.query.redirect);
    if (target?.startsWith("/file/")) {
        location.assign(target);
        return;
    }
    await router.push(target ?? { name: "dashboard" });
};

const submit = submitting.wrap(async () => {
    message.value = "";
    try {
        await userStore.login({
            username: username.value,
            password: password.value,
        });
        await goToRedirect();
    } catch (error) {
        message.value = apiErrorMessage(error);
    }
});

const signInWithPasskey = passkeyRunning.wrap(async () => {
    message.value = "";
    try {
        if (await userStore.loginWithPasskey()) {
            await goToRedirect();
        }
    } catch (error) {
        message.value =
            error instanceof ApiError
                ? error.message
                : `Passkey sign in failed: ${passkeyErrorMessage(error)}`;
    }
});
</script>

<template>
    <div
        class="flex items-center lg:justify-end justify-center h-dvh px-4 py-6 lg:pr-12 text-fg"
    >
        <div
            class="w-full max-w-md max-h-full overflow-auto rounded-2xl border border-line bg-night/60 glass shadow-float px-10 py-8 max-md:px-6"
        >
            <div class="text-center mb-5">
                <Logo white :size="96" />
            </div>
            <form @submit.prevent="submit">
                <h1 class="mb-6 text-center">
                    <span class="block text-2xl font-bold tracking-tight">
                        Welcome to NoteMe
                    </span>
                    <span class="block text-muted text-sm mt-1">
                        Please sign in to continue
                    </span>
                </h1>
                <Alert :message="message" />
                <div class="max-w-sm m-auto">
                    <div class="mb-4">
                        <Input
                            v-model="username"
                            label="Username"
                            icon="user"
                            placeholder="Username"
                            name="username"
                        />
                    </div>
                    <div class="mb-4">
                        <Input
                            v-model="password"
                            label="Password"
                            icon="key"
                            placeholder="Password"
                            type="password"
                            name="password"
                        />
                    </div>
                </div>
                <div class="max-w-sm m-auto mt-6">
                    <div class="flex flex-col gap-2">
                        <Button
                            v-if="!passkeyRunning.running.value"
                            type="submit"
                            color="success"
                            :disabled="submitting.running.value"
                            add-class="w-full"
                        >
                            <Icon name="log-in" size="lg" /> Sign in
                        </Button>
                        <Button
                            v-if="canUsePasskeys"
                            :disabled="
                                passkeyRunning.running.value ||
                                submitting.running.value
                            "
                            add-class="w-full"
                            @click="signInWithPasskey"
                        >
                            <Loader
                                v-if="passkeyRunning.running.value"
                                color="white"
                                size="mdButton"
                            >
                                Waiting...
                            </Loader>
                            <template v-else>
                                <Icon name="fingerprint" size="lg" /> Sign in
                                with Passkey
                            </template>
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    </div>
</template>
