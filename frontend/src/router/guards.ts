import type { NavigationGuardWithThis } from "vue-router";
import { useUserStore, type UserStep } from "@/stores/user";
import { permissionForSettingsRoute, settingsTabs } from "@/lib/settings-tabs";

export const stepRoutes: Record<UserStep, string> = {
    password_reset: "reset-password",
};

const stepRouteNames = new Set(Object.values(stepRoutes));

// _middleware.ts chain of the original app
export const authGuard: NavigationGuardWithThis<undefined> = async (to) => {
    // Shown when loading failed, which can include loading the session.
    if (to.name === "error") {
        return true;
    }

    const userStore = useUserStore();

    if (!userStore.isLoaded) {
        await userStore.restoreSession();
    }

    if (to.meta.guestOnly && userStore.isLoggedIn) {
        return { name: "dashboard" };
    }

    if (to.meta.requiresAuth && !userStore.isLoggedIn) {
        return { name: "login", query: { redirect: to.fullPath } };
    }

    if (to.meta.requiresAuth && to.name !== "logout") {
        const [pendingStep] = userStore.requiredSteps;
        const stepRoute = pendingStep ? stepRoutes[pendingStep] : undefined;

        if (stepRoute && to.name !== stepRoute) {
            return to.meta.returnAfterSteps
                ? { name: stepRoute, query: { redirect: to.fullPath } }
                : { name: stepRoute };
        }

        if (!stepRoute && stepRouteNames.has(to.name as string)) {
            return { name: "dashboard" };
        }
    }

    if (to.meta.requiresSettingsAccess && !userStore.canAccessSettings) {
        return { name: "dashboard" };
    }

    // A settings tab the user may not open falls back to the first one they
    // may; the original answered 403.
    const permission = permissionForSettingsRoute(to.name as string);
    if (permission && !userStore.can(permission)) {
        const allowed = settingsTabs.find((tab) =>
            userStore.can(tab.permission),
        );
        return { name: allowed?.route ?? "dashboard" };
    }

    return true;
};
