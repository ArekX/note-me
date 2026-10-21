import { createPinia } from "pinia";
import { createSSRApp, h, type Component } from "vue";
import { renderToString } from "vue/server-renderer";
import { createMemoryHistory, createRouter } from "vue-router";
import { htmlToMarkdown } from "@/lib/html-to-markdown";
import { permissionForSettingsRoute } from "@/lib/settings-tabs";
import { helpTopics } from "./help-topics";

export interface HelpIndexEntry {
    key: string;
    name: string;
    permission: string | null;
}

export const helpIndex = (): HelpIndexEntry[] =>
    helpTopics.map(({ key, name, settingsRoute }) => ({
        key,
        name,
        permission: settingsRoute
            ? (permissionForSettingsRoute(settingsRoute) ?? null)
            : null,
    }));

// Help pages link to app routes by name, but the app router needs a browser
// history to load. Only a link's text is exported, so every link resolves to
// the same place.
const linkRouter = () => {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/:path(.*)*", component: { render: () => null } }],
    });
    const target = router.resolve("/");
    router.resolve = (() => target) as typeof router.resolve;
    return router;
};

const renderTopic = async (component: Component) => {
    const app = createSSRApp({ render: () => h(component) });
    app.use(createPinia());
    app.use(linkRouter());
    return htmlToMarkdown(await renderToString(app));
};

// Paths are relative to the build output folder.
export const exportHelp = async (): Promise<Record<string, string>> => {
    const files: Record<string, string> = {
        "help/index.json": JSON.stringify(helpIndex()),
    };
    for (const topic of helpTopics) {
        files[`help/${topic.key}.md`] = await renderTopic(topic.component);
    }
    return files;
};
