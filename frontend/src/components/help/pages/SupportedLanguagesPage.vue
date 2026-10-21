<script setup lang="ts">
import { codeLanguages as languages } from "@/lib/code-languages";
</script>

<template>
    <div class="p-2">
        <h2 class="text-lg font-bold">Supported languages in code blocks</h2>
        <p class="py-2">
            Following table contains all aliases for which code highlighting is
            supported in NoteMe.
        </p>
        <table>
            <thead>
                <tr>
                    <th>Language</th>
                    <th class="w-2/5">Name to use in code block</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="language in languages" :key="language.id">
                    <td>{{ language.name }}</td>
                    <td class="w-2/5">
                        <template
                            v-for="(alias, index) in language.aliases"
                            :key="alias"
                        >
                            <pre class="inline">{{ alias }}</pre>
                            <strong v-if="index < language.aliases.length - 1">
                                OR
                            </strong>
                        </template>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
