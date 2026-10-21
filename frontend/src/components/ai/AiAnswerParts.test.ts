import { describe, expect, it, vi } from "vitest";
import { useSidebar } from "@/composables/useSidebar";
import { useSearchStore } from "@/stores/search";
import { useSocketStore } from "@/stores/socket";
import { mount } from "@vue/test-utils";
import { createdNotes, type ChatStep } from "@/lib/ai/conversation-view";
import AiAnswerParts from "./AiAnswerParts.vue";

const push = vi.fn();
vi.mock("vue-router", async (importOriginal) => ({
    ...(await importOriginal<typeof import("vue-router")>()),
    useRouter: () => ({ push }),
}));

const createStep = (overrides: Partial<ChatStep>): ChatStep => ({
    id: "call-1",
    name: "create_note",
    title: "Create note",
    arguments: { title: "Shopping", text: "" },
    status: "done",
    result: null,
    ...overrides,
});

describe("created note cards", () => {
    it("reads the note from live and stored results", () => {
        const live = createStep({
            result: JSON.stringify({
                requestId: "r",
                namespace: "notes",
                type: "createNoteResponse",
                record: { id: 7, title: "Shopping" },
                group_id: null,
            }),
        });
        const stored = createStep({
            id: "call-2",
            result: '{"group_id":null,"record":{"id":8,"title":""}}',
        });
        expect(
            createdNotes([
                live,
                stored,
                createStep({
                    id: "call-3",
                    status: "failed",
                    result: "Title must have at least one character",
                }),
                createStep({
                    id: "call-4",
                    status: "declined",
                    result: "The user declined this action.",
                }),
                createStep({ id: "call-5", result: "not json" }),
                createStep({
                    id: "call-6",
                    name: "update_note",
                    result: '{"updated_id":3}',
                }),
            ]),
        ).toEqual([
            { id: 7, title: "Shopping" },
            { id: 8, title: "" },
        ]);
    });

    it("shows a card after the steps that opens the note", async () => {
        const wrapper = mount(AiAnswerParts, {
            props: {
                parts: [
                    { kind: "text", text: "Done." },
                    {
                        kind: "steps",
                        steps: [
                            createStep({
                                result: '{"record":{"id":7,"title":"Shopping"}}',
                            }),
                        ],
                    },
                ],
            },
        });
        const card = wrapper.get('button[title="Open Shopping"]');
        expect(card.text()).toContain("Shopping");
        expect(card.text()).toContain("Note created");

        await card.trigger("click");
        expect(push).toHaveBeenCalledWith({
            name: "note-view",
            params: { id: 7 },
        });
    });

    it("opens app links in place and leaves other links alone", async () => {
        push.mockClear();
        const wrapper = mount(AiAnswerParts, {
            props: {
                parts: [
                    {
                        kind: "text",
                        text: "See [Plan](/app/note/shared-3) and [docs](https://example.com).",
                    },
                ],
            },
        });
        const [shared, external] = wrapper.findAll("a");

        const plain = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            button: 0,
        });
        shared!.element.dispatchEvent(plain);
        expect(plain.defaultPrevented).toBe(true);
        expect(push).toHaveBeenCalledWith("/app/note/shared-3");

        const withCtrl = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            button: 0,
            ctrlKey: true,
        });
        shared!.element.dispatchEvent(withCtrl);
        expect(withCtrl.defaultPrevented).toBe(false);

        const outside = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            button: 0,
        });
        external!.element.dispatchEvent(outside);
        expect(outside.defaultPrevented).toBe(false);
        expect(push).toHaveBeenCalledTimes(1);
    });

    it("searches a tag link like a note's tag", async () => {
        await useSocketStore().connect();
        const sidebar = useSidebar();
        sidebar.show("ai");
        const wrapper = mount(AiAnswerParts, {
            props: {
                parts: [
                    {
                        kind: "text",
                        text: "Tagged [#peach jam](#tag:peach%20jam) and [#fruit](#tag:fruit).",
                    },
                ],
            },
        });
        const [jam, fruit] = wrapper.findAll("a");

        const click = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            button: 0,
        });
        jam!.element.dispatchEvent(click);
        expect(click.defaultPrevented).toBe(true);
        expect(sidebar.section.value).toBe("notes");
        expect(useSearchStore().tags).toEqual(["peach jam"]);

        await fruit!.trigger("click");
        expect(useSearchStore().tags).toEqual(["fruit"]);
        expect(push).not.toHaveBeenCalledWith(expect.stringContaining("tag"));
        useSocketStore().disconnect();
    });
});
