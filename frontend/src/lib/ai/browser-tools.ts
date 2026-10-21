import { createApp, h, type Component } from "vue";
import { getActivePinia } from "pinia";
import { canSeeHelpTopic, helpTopics } from "@/components/help/help-topics";
import { redirectTo } from "@/lib/redirect";
import { router } from "@/router";
import { useDataExportStore } from "@/stores/data-export";
import { useHelpStore } from "@/stores/help";
import { useProtectionLockStore } from "@/stores/protection-lock";
import { useUserStore } from "@/stores/user";
import type {
    GetNoteMessage,
    GetNoteResponse,
    UpdateNoteMessage,
    UpdateNoteResponse,
} from "@/types/messages";
import { addPasskey, deletePasskey } from "./passkey-tools";
import {
    DENIED_TEXT,
    LOCKED_TEXT,
    decryptText,
    encryptText,
    ensureProtectedAccess,
} from "./protected-notes";
import {
    declined,
    done,
    failed,
    type ToolContext,
    type ToolOutcome,
} from "./tool-outcome";

type Arguments = Record<string, unknown>;

const visibleTopics = () => {
    const userStore = useUserStore();
    return helpTopics.filter((topic) => canSeeHelpTopic(topic, userStore));
};

// Help pages are components, so a page is rendered off screen and its text
// read block by block.
const helpText = (component: Component) => {
    const container = document.createElement("div");
    const app = createApp({ render: () => h(component) });
    const pinia = getActivePinia();
    if (pinia) {
        app.use(pinia);
    }
    app.use(router);
    app.mount(container);
    const blocks = Array.from(
        container.querySelectorAll("h1, h2, h3, p, li, pre"),
    ).map((element) => {
        const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
        return /^H\d$/.test(element.tagName) ? `# ${text}` : text;
    });
    app.unmount();
    return blocks.filter(Boolean).join("\n");
};

const setNoteProtection = async (
    args: Arguments,
    context: ToolContext,
): Promise<ToolOutcome> => {
    if (useProtectionLockStore().isLocked) {
        return failed(LOCKED_TEXT);
    }
    if (!(await ensureProtectedAccess(context.conversationId))) {
        return declined(DENIED_TEXT);
    }
    const id = Number(args.id);
    const isProtected = args.protected === true;
    const { record } = await context.service.sendMessage<
        GetNoteMessage,
        GetNoteResponse
    >("notes", "getNote", { data: { id }, expect: "getNoteResponse" });
    if (record.is_encrypted === isProtected) {
        return done({ id, protected: isProtected, changed: false });
    }
    const text = isProtected
        ? await encryptText(context.service, record.note)
        : await decryptText(context.service, record.note);
    await context.service.sendMessage<UpdateNoteMessage, UpdateNoteResponse>(
        "notes",
        "updateNote",
        {
            data: { id, data: { is_encrypted: isProtected, text } },
            expect: "updateNoteResponse",
            notOwn: true,
        },
    );
    return done({ id, protected: isProtected, changed: true });
};

// Settles once the export starts: it can outlast the turn's wait for tool
// results, and the user downloads it from the dialog anyway.
const exportMyData = async (): Promise<ToolOutcome> => {
    const result = await useDataExportStore().request();
    switch (result.status) {
        case "started":
            return done({
                started: true,
                note: "The export runs in a dialog that shows its progress and then the download button.",
            });
        case "declined":
            return declined("The user did not start the export.");
        case "busy":
            return failed(
                "An export is already running or waiting for the user.",
            );
        case "failed":
            return failed(result.message);
    }
};

export const browserTools: Record<
    string,
    (args: Arguments, context: ToolContext) => Promise<ToolOutcome>
> = {
    open_note: async (args) => {
        await router.push(redirectTo.viewNote({ noteId: Number(args.id) }));
        return done({ opened: Number(args.id) });
    },
    open_help: async (args) => {
        const topic =
            visibleTopics().find((item) => item.key === args.topic)?.key ??
            "general";
        useHelpStore().open(topic);
        return done({ opened: topic });
    },
    list_help_topics: async () =>
        done(visibleTopics().map(({ key, name }) => ({ topic: key, name }))),
    get_help_topic: async (args) => {
        const topic = visibleTopics().find((item) => item.key === args.topic);
        if (!topic) {
            return failed(`There is no help topic ${String(args.topic)}.`);
        }
        return done({
            topic: topic.key,
            name: topic.name,
            text: helpText(topic.component),
        });
    },
    get_profile: async () => {
        const user = useUserStore().user;
        return done({
            name: user?.name,
            username: user?.username,
            role: user?.role,
            timezone: user?.timezone,
            preferred_editor: user?.preferred_editor,
        });
    },
    set_note_protection: setNoteProtection,
    add_passkey: addPasskey,
    delete_passkey: deletePasskey,
    export_my_data: exportMyData,
};
