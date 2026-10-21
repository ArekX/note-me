<script setup lang="ts">
import {
    noteEditorHotkeys,
    noteTextAreaHotkeys,
    type HotkeyItem,
} from "@/composables/useHotkeys";

// Generated from the hotkey maps the editor uses, so it stays accurate.
const sections: { name: string; hotkeys: readonly HotkeyItem[] }[] = [
    {
        name: "Anywhere in note editor",
        hotkeys: noteEditorHotkeys,
    },
    { name: "When editing note text", hotkeys: noteTextAreaHotkeys },
];

const label = (hotkey: HotkeyItem) =>
    [...hotkey.metaKeys, hotkey.key].join("+");
</script>

<template>
    <div class="p-2">
        <h2 class="text-lg font-bold">Keyboard Shortcuts</h2>
        <div class="pt-2">
            <div v-for="section in sections" :key="section.name" class="py-2">
                <h1 class="text-lg">{{ section.name }}</h1>
                <table class="w-full">
                    <thead>
                        <tr>
                            <th class="w-32">Hotkey</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="hotkey in section.hotkeys"
                            :key="hotkey.identifier"
                        >
                            <td class="w-32">{{ label(hotkey) }}</td>
                            <td>{{ hotkey.description }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p class="py-2">
                The rich editor uses the same shortcuts: Ctrl+K and Ctrl+P open
                a dialog for the address, and Ctrl+] and Ctrl+[ move a list item
                in and out.
            </p>
        </div>
    </div>
</template>
