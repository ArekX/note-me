import { runOnReady } from "$frontend/propagation-manager.ts";

const paths = {
    root: () => "/app",
    logout: () => "/app/logout",
    newNote: (data: { groupId?: number } = {}) =>
        `/app/note/new${data.groupId ? `?group_id=${data.groupId}` : ""}`,
    viewNote: (data: { noteId: number }) => `/app/note/view-${data.noteId}`,
    editNote: (data: { noteId: number }) => `/app/note/edit-${data.noteId}`,
} as const;

export const redirectToUrl = (url: string) => {
    runOnReady(() => {
        window.location.href = url;
    });
};

export const reload = () => {
    runOnReady(() => {
        window.location.reload();
    });
};

const createRedirector =
    (urlGetter: (params: unknown) => string) => (params: unknown) =>
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
