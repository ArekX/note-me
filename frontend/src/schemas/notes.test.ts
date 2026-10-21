import { describe, expect, it } from "vitest";
import { addNoteRequestSchema, setReminderSchema } from "./notes";
import { validateSchema } from "./index";

describe("note schemas", () => {
    it("accepts a valid note", async () => {
        const issues = await validateSchema(addNoteRequestSchema, {
            title: "Hello",
            text: "# Hello",
            is_encrypted: false,
            tags: ["a", "b"],
            group_id: null,
        });
        expect(issues).toBeNull();
    });

    it("rejects an empty title and unknown keys", async () => {
        const issues = await validateSchema(addNoteRequestSchema, {
            title: "",
            text: "",
            is_encrypted: false,
            tags: [],
            group_id: null,
            extra: true,
        });
        expect(issues).not.toBeNull();
        const paths = issues!.map((issue) => issue.path.join("."));
        expect(paths).toContain("title");
    });

    it("validates both reminder variants", async () => {
        expect(
            await validateSchema(setReminderSchema, {
                note_id: 1,
                reminder: { type: "once", next_at: 123 },
            }),
        ).toBeNull();
        expect(
            await validateSchema(setReminderSchema, {
                note_id: 1,
                reminder: {
                    type: "repeat",
                    interval: 1,
                    unit_value: 1,
                    repeat_count: 1,
                },
            }),
        ).toBeNull();
        expect(
            await validateSchema(setReminderSchema, {
                note_id: 1,
                reminder: { type: "repeat", interval: 0 },
            }),
        ).not.toBeNull();
    });
});
