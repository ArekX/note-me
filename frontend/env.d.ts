/// <reference types="vite/client" />

declare module "*.vue" {
    import type { DefineComponent } from "vue";
    const component: DefineComponent<object, object, unknown>;
    export default component;
}

interface ImportMetaEnv {
    readonly VITE_API_PROXY_TARGET?: string;
    readonly VITE_DEV_HOST?: string;
    readonly VITE_DEV_PORT?: string;
}

declare module "markdown-it-footnote" {
    import type { PluginSimple } from "markdown-it";
    const footnote: PluginSimple;
    export default footnote;
}
