import { ref } from "vue";
import { defineStore } from "pinia";

// Without a password to type, Allow stays disabled this long.
export const ALLOW_DELAY_SECONDS = 5;

export interface ConsentRequest {
    // Protection is locked, so the dialog also asks for the password.
    needsPassword: boolean;
}

// The grant covers one conversation in this tab only; a reload or another
// tab asks again (decision 0.83).
export const useAiConsentStore = defineStore("aiConsent", () => {
    const request = ref<ConsentRequest | null>(null);
    const granted = new Set<number>();
    let pending: ((allowed: boolean) => void) | null = null;
    let pendingConversation: number | null = null;

    const isGranted = (conversationId: number) => granted.has(conversationId);

    const ask = (conversationId: number, consent: ConsentRequest) =>
        new Promise<boolean>((resolve) => {
            pending?.(false);
            pending = resolve;
            pendingConversation = conversationId;
            request.value = consent;
        });

    const answer = (allowed: boolean) => {
        if (allowed && pendingConversation !== null) {
            granted.add(pendingConversation);
        }
        pending?.(allowed);
        pending = null;
        pendingConversation = null;
        request.value = null;
    };

    const reset = () => {
        answer(false);
        granted.clear();
    };

    return { request, isGranted, ask, answer, reset };
});
