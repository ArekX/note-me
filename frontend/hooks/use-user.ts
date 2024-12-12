import { signal } from "@preact/signals";
import { UserOnboardingState, UserRecord } from "$db";
import { AppPermissions } from "$backend/rbac/permissions.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    UpdateOnboardingStateMessage,
    UpdateProfileMessage,
    UpdateProfileResponse,
    UserFrontendResponse,
} from "$workers/websocket/api/users/messages.ts";
import { useProtectionLock } from "$frontend/hooks/use-protection-lock.ts";
import { EditUserProfile } from "$schemas/users.ts";

export type FrontendUserData =
    & Pick<
        UserRecord,
        "id" | "name" | "timezone"
    >
    & {
        permissions: AppPermissions[];
        csrfToken: string;
        onboardingState: UserOnboardingState;
    };

export const userData = signal<FrontendUserData | null>(null);

export const setupUserData = (data: FrontendUserData) => userData.value = data;

export const useUser = () => {
    const protectionLock = useProtectionLock();

    const { dispatchMessage, sendMessage } = useWebsocketService<
        UserFrontendResponse
    >({
        eventMap: {
            users: {
                updateProfileResponse: (response) => {
                    if (!userData.value) {
                        return;
                    }

                    userData.value = {
                        ...userData.value,
                        name: response.data.name,
                        timezone: response.data.timezone,
                    };
                },
                updateOnboardingResponse: (response) => {
                    if (!userData.value) {
                        return;
                    }

                    userData.value = {
                        ...userData.value,
                        onboardingState: response.onboarding_state,
                    };
                },
            },
        },
    });

    const can = (action: AppPermissions): boolean =>
        userData.value?.permissions?.includes(action) ?? false;

    const getUserId = (): number | null => userData.value?.id ?? null;

    const getName = (): string => userData.value?.name ?? "";

    const getTimezone = (): string => userData.value?.timezone ?? "";

    const getOnboardingState = (): UserOnboardingState =>
        userData.value?.onboardingState ?? {};

    const updateOnboardingState = (
        state: Partial<UserOnboardingState>,
    ) => {
        if (!userData.value) {
            return;
        }

        const onboardingState = {
            ...userData.value.onboardingState,
            ...state,
        };

        dispatchMessage<UpdateOnboardingStateMessage>(
            "users",
            "updateOnboarding",
            {
                onboarding_state: onboardingState,
            },
        );
    };

    const updateProfile = async (data: EditUserProfile) => {
        if (!userData.value) {
            return;
        }

        const response = await sendMessage<
            UpdateProfileMessage,
            UpdateProfileResponse
        >(
            "users",
            "updateProfile",
            {
                data: {
                    data,
                },
                expect: "updateProfileResponse",
            },
        );

        if (response.data.new_password) {
            protectionLock.resolveUnlockRequest(response.data.new_password);
        }
    };

    return {
        can,
        getUserId,
        getName,
        getTimezone,
        getOnboardingState,
        updateOnboardingState,
        updateProfile,
    };
};
