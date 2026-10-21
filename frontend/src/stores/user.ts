import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type {
    AuthenticationResponseJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { api, ApiError, type ProcessStepRequest } from "@/lib/api";
import { initials as toInitials } from "@/lib/initials";
import { getFileViewUrl } from "@/lib/markdown-snippets";
import { getPasskey, isPasskeyCancelled } from "@/lib/passkeys";
import { hasSettingsPermission, type AppPermission } from "@/lib/rbac";
import type { EditUserProfile } from "@/schemas/users";
import type {
    UpdateOnboardingStateMessage,
    UpdateOnboardingStateResponse,
    UpdateProfileMessage,
    UpdateProfilePictureMessage,
    UpdateProfilePictureResponse,
    UpdateProfileResponse,
} from "@/types/messages";
import { useSocketStore } from "./socket";
import type {
    SessionResponse,
    UserLoginRecord,
    UserOnboardingState,
    UserStep,
} from "@/types/records";

export type { SessionResponse, UserStep };

export interface LoginRequest {
    username: string;
    password: string;
}

interface PasskeyLoginOptions {
    request_id: string;
    options: PublicKeyCredentialRequestOptionsJSON;
}

export const useUserStore = defineStore("user", () => {
    const user = ref<UserLoginRecord | null>(null);
    const permissions = ref<AppPermission[]>([]);
    const requiredSteps = ref<UserStep[]>([]);
    const isLoaded = ref(false);

    const isLoggedIn = computed(() => user.value !== null);
    const canAccessSettingsArea = computed(() =>
        hasSettingsPermission(permissions.value),
    );

    const initials = computed(() => toInitials(user.value?.name ?? ""));
    const profilePictureUrl = computed(() =>
        user.value?.profile_picture
            ? getFileViewUrl(user.value.profile_picture)
            : null,
    );

    const can = (permission: AppPermission): boolean =>
        permissions.value.includes(permission);

    const setSession = (session: SessionResponse | null) => {
        user.value = session?.user ?? null;
        permissions.value = session?.permissions ?? [];
        requiredSteps.value = session?.required_steps ?? [];
        isLoaded.value = true;
    };

    const fetchSession = async (): Promise<void> => {
        try {
            setSession(await api.get<SessionResponse>("/api/session"));
        } catch (error) {
            if (!(error instanceof ApiError)) {
                throw error;
            }
            setSession(null);
        }
    };

    // The session is fetched once per page load; later changes arrive over
    // the websocket or in the responses of login and process-step.
    let restoring: Promise<void> | null = null;
    const restoreSession = (): Promise<void> => {
        restoring ??= fetchSession().catch((error: unknown) => {
            restoring = null;
            throw error;
        });
        return restoring;
    };

    const login = async (request: LoginRequest): Promise<void> => {
        setSession(await api.post<SessionResponse>("/api/login", request));
    };

    // Resolves false when the user closes the browser's passkey prompt.
    const loginWithPasskey = async (): Promise<boolean> => {
        const { request_id, options } = await api.post<PasskeyLoginOptions>(
            "/api/login/passkey/options",
            {},
        );

        let response: AuthenticationResponseJSON;
        try {
            response = await getPasskey(options);
        } catch (error) {
            if (isPasskeyCancelled(error)) {
                return false;
            }
            throw error;
        }

        setSession(
            await api.post<SessionResponse>("/api/login/passkey", {
                request_id,
                response,
            }),
        );
        return true;
    };

    const processStep = async (request: ProcessStepRequest): Promise<void> => {
        setSession(await api.processStep<SessionResponse>(request));
    };

    const logout = async (): Promise<void> => {
        try {
            await api.post("/api/logout");
        } finally {
            setSession(null);
        }
    };

    // The server also pushes sessionUpdated to every tab; applying the
    // response here updates the requesting tab without waiting for it.
    const updateProfile = async (data: EditUserProfile) => {
        const response = await (
            await useSocketStore().getService()
        ).sendMessage<UpdateProfileMessage, UpdateProfileResponse>(
            "users",
            "updateProfile",
            { data: { data }, expect: "updateProfileResponse" },
        );
        if (user.value) {
            user.value.name = response.data.name;
            user.value.timezone = response.data.timezone;
            user.value.preferred_editor =
                response.data.preferred_editor ?? user.value.preferred_editor;
        }
    };

    const updateProfilePicture = async (identifier: string | null) => {
        const response = await (
            await useSocketStore().getService()
        ).sendMessage<
            UpdateProfilePictureMessage,
            UpdateProfilePictureResponse
        >("users", "updateProfilePicture", {
            data: { identifier },
            expect: "updateProfilePictureResponse",
        });
        if (user.value) {
            user.value.profile_picture = response.identifier;
        }
    };

    // The server merges the keys and pushes the session to the other tabs.
    const updateOnboardingState = async (changes: UserOnboardingState) => {
        const response = await (
            await useSocketStore().getService()
        ).sendMessage<
            UpdateOnboardingStateMessage,
            UpdateOnboardingStateResponse
        >("users", "updateOnboarding", {
            data: { onboarding_state: changes },
            expect: "updateOnboardingResponse",
        });
        if (user.value) {
            user.value.onboarding_state = response.onboarding_state;
        }
    };

    return {
        user,
        permissions,
        requiredSteps,
        isLoaded,
        isLoggedIn,
        initials,
        profilePictureUrl,
        canAccessSettings: canAccessSettingsArea,
        can,
        setSession,
        restoreSession,
        login,
        loginWithPasskey,
        processStep,
        logout,
        updateProfile,
        updateProfilePicture,
        updateOnboardingState,
    };
});
