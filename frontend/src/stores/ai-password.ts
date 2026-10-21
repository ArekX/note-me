import { ref } from "vue";
import { defineStore } from "pinia";

export interface PasswordRequest {
    title: string;
    message: string;
    confirmLabel: string;
}

// The assistant's passkey changes always ask for the password in the
// browser, whatever the server remembers (decision 0.83).
export const useAiPasswordStore = defineStore("aiPassword", () => {
    const request = ref<PasswordRequest | null>(null);
    let pending: ((password: string | null) => void) | null = null;

    const ask = (next: PasswordRequest) =>
        new Promise<string | null>((resolve) => {
            pending?.(null);
            pending = resolve;
            request.value = next;
        });

    // null when the user cancelled.
    const answer = (password: string | null) => {
        pending?.(password);
        pending = null;
        request.value = null;
    };

    return { request, ask, answer };
});
