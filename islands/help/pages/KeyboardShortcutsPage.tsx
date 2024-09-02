import { getHotkeyMap } from "$frontend/hooks/use-hotkeys.ts";
import { useMemo } from "preact/hooks";

export default function KeyboardShortcuts() {
    const hotkeyMap = useMemo(() => {
        const hotkeyMap = getHotkeyMap();

        return {
            editor: {
                name: "Anywhere in note editor",
                hotkeys: [
                    ...hotkeyMap.insertDialog,
                    ...hotkeyMap.noteEditor,
                ],
            },
            textArea: {
                name: "When editing note text",
                hotkeys: [
                    ...hotkeyMap.noteTextArea,
                ],
            },
        };
    }, []);
    const hotkeys = Object.keys(hotkeyMap) as Array<keyof typeof hotkeyMap>;

    return (
        <div class="p-2">
            <h2 class="text-lg font-bold">
                Keyboard Shortcuts
            </h2>
            <p class="pt-2">
                {hotkeys.map((context) => (
                    <div class="py-2">
                        <h1 class="text-lg">{hotkeyMap[context].name}</h1>

                        <table class={"w-full"}>
                            <thead>
                                <tr>
                                    <th class="w-32">Hotkey</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hotkeyMap[context].hotkeys.map((hotkey) => (
                                    <tr>
                                        <td class="w-32">
                                            {hotkey.metaKeys.length > 0 &&
                                                `${
                                                    hotkey.metaKeys
                                                        .join(
                                                            "+",
                                                        )
                                                }+`}
                                            {hotkey.key}
                                        </td>
                                        <td>
                                            {hotkey.description}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </p>
        </div>
    );
}
