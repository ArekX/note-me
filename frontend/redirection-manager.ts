import { runOnReady } from "$frontend/propagation-manager.ts";

type PathResult = string | { url: string; fullRender: boolean };

const paths = {
    root: () => "/app",
    logout: () => ({ url: "/app/logout", fullRender: true }),
    newNote: (data: { groupId?: number } = {}) =>
        `/app/note/new${data.groupId ? `?group_id=${data.groupId}` : ""}`,
    viewNote: (data: { noteId: number }) => `/app/note/view-${data.noteId}`,
    editNote: (data: { noteId: number }) => `/app/note/edit-${data.noteId}`,
} as const;

export const redirectToUrl = (url: PathResult) => {
    runOnReady(() => {
        let location = "";
        let fullRender = false;
        if (typeof url !== "string") {
            location = url.url;
            fullRender = url.fullRender;
        } else {
            location = url;
        }

        if (fullRender) {
            window.location.href = location;
            return;
        }

        const clientNav = document.getElementById("clientNav");
        const a = document.createElement("a");
        a.href = location;
        clientNav?.appendChild(a);
        a.click();
        clientNav?.removeChild(a);
    });
};

export const reload = () => {
    runOnReady(() => {
        window.location.reload();
    });
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
