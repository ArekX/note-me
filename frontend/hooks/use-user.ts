import { signal } from "@preact/signals";
import { UserRecord } from "$backend/repository/user-repository.ts";
import { AppPermissions } from "$backend/rbac/permissions.ts";

export type FrontendUserData =
    & Pick<
        UserRecord,
        "id" | "name" | "timezone"
    >
    & {
        permissions: AppPermissions[];
        csrfToken: string;
    };

export const userData = signal<FrontendUserData | null>(null);

export const setupUserData = (data: FrontendUserData) => userData.value = data;

export const useUser = () => {
    const can = (action: AppPermissions): boolean =>
        userData.value?.permissions?.includes(action) ?? false;

    const getUserId = (): number | null => userData.value?.id ?? null;

    return {
        can,
        getUserId,
    };
};
