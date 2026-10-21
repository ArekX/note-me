// @vitest-environment node
import { describe, expect, it } from "vitest";
import { permissionForSettingsRoute } from "@/lib/settings-tabs";
import { exportHelp, helpIndex } from "./help-export";
import { helpTopics } from "./help-topics";

describe("exportHelp", () => {
    it("writes the index in topic order with admin permissions", async () => {
        const files = await exportHelp();

        const index = JSON.parse(files["help/index.json"]!);
        expect(index).toEqual(helpIndex());
        expect(index).toEqual(
            helpTopics.map((topic) => ({
                key: topic.key,
                name: topic.name,
                permission: topic.settingsRoute
                    ? permissionForSettingsRoute(topic.settingsRoute)
                    : null,
            })),
        );
        helpTopics.forEach((topic, i) => {
            if (topic.settingsRoute) {
                expect(index[i].permission, topic.key).toEqual(
                    expect.any(String),
                );
            }
        });
    });

    it("renders every topic to markdown starting with its title", async () => {
        const files = await exportHelp();

        expect(Object.keys(files)).toHaveLength(helpTopics.length + 1);
        for (const topic of helpTopics) {
            const markdown = files[`help/${topic.key}.md`];
            expect(markdown, topic.key).toMatch(/^# \S/);
            expect(markdown!.split("\n").length, topic.key).toBeGreaterThan(2);
            expect(markdown, topic.key).not.toMatch(
                /<!--|<\/?(a|code|div|h\d|li|p|pre|span|strong|t[dhr])\b/,
            );
        }
    });

    it("renders links, tables and code from the pages", async () => {
        const files = await exportHelp();

        expect(files["help/general.md"]).toContain(
            "import them from data section in your profile.",
        );
        expect(files["help/keyboard-shortcuts.md"]).toContain(
            "| ctrl+s | Save note changes |",
        );
        expect(files["help/markdown-syntax.md"]).toContain(
            "  ```\n  # Heading 1\n  ## Heading 2\n  ### Heading 3\n  ```",
        );
        expect(files["help/supported-language-highlights.md"]).toMatch(
            /\| JavaScript \| `javascript` \*\*OR\*\* `js`/,
        );
    });
});
