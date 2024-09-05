import { runOnReady } from "$frontend/propagation-manager.ts";

export type PathResult = string | {
    url: string;
    partialUrl: string;
    fullRender: boolean;
};

const paths = {
    root: () => "/app/note",
    logout: () => ({ url: "/app/logout", fullRender: true }),
    newNote: (data: { groupId?: number } = {}) => ({
        url: `/app/note/new${data.groupId ? `?group_id=${data.groupId}` : ""}`,
        partialUrl: `/app/note/partial/new${
            data.groupId ? `?group_id=${data.groupId}` : ""
        }`,
    }),
    viewNote: (data: { noteId: number }) => ({
        url: `/app/note/view-${data.noteId}`,
        partialUrl: `/app/note/partial/view-${data.noteId}`,
    }),
    viewSharedNote: (data: { noteId: number }) => ({
        url: `/app/note/shared-${data.noteId}`,
        partialUrl: `/app/note/partial/shared-${data.noteId}`,
    }),
    editNote: (data: { noteId: number }) => ({
        url: `/app/note/edit-${data.noteId}`,
        partialUrl: `/app/note/partial/edit-${data.noteId}`,
    }),
    settings: () => "/app/settings",
    userFiles: () => "/app/profile/files",
    userData: () => "/app/profile/data",
    userProfile: () => "/app/profile",
} as const;

export const redirectToUrl = (url: PathResult) => {
    runOnReady(async () => {
        let location = "";
        let partialLocation = "";
        let fullRender = false;
        if (typeof url !== "string") {
            location = url.url;
            fullRender = url.fullRender;
            partialLocation = url.partialUrl ?? url.url;
        } else {
            location = url;
            partialLocation = location;
        }

        for (const listener of redirectListeners) {
            const shouldRedirect = await listener(url);
            if (!shouldRedirect) {
                return;
            }
        }

        if (fullRender) {
            window.location.href = location;
            return;
        }

        const clientNav = document.getElementById("clientNav");
        const a = document.createElement("a");
        a.href = location;
        a.setAttribute("f-partial", partialLocation);
        clientNav?.appendChild(a);
        a.click();
        clientNav?.removeChild(a);
    });
};

export const reload = () => {
    runOnReady(() => {
        window.location.reload();
        return Promise.resolve();
    });
};

type RedirectListener = (
    url: PathResult,
) => Promise<boolean>;

const redirectListeners: RedirectListener[] = [];

export const addBeforeRedirectListener = (listener: RedirectListener) => {
    redirectListeners.push(listener);
};

export const removeBeforeRedirectListener = (listener: RedirectListener) => {
    const index = redirectListeners.indexOf(listener);
    if (index !== -1) {
        redirectListeners.splice(index, 1);
    }
};

const createRedirector =
    (urlGetter: (params: unknown) => PathResult) => (params: unknown) =>
        redirectToUrl(urlGetter(params));

type Paths = typeof paths;

type RedirectorPaths = {
    [K in keyof Paths]: (...params: Parameters<Paths[K]>) => void;
};

export const redirectTo = Object.fromEntries(
    Object.entries(paths).map((
        [key, value],
    ) => [key, createRedirector(value as (params: unknown) => string)]),
) as RedirectorPaths;
