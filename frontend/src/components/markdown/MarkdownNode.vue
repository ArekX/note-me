<script setup lang="ts">
import { computed } from "vue";
import Icon from "@/components/Icon.vue";
import type { AstNode } from "@/lib/markdown";
import CodeBlock from "./CodeBlock.vue";
import MarkdownExtension from "./MarkdownExtension.vue";
import MarkdownHeading from "./MarkdownHeading.vue";
import MarkdownLink from "./MarkdownLink.vue";
import type { MarkdownOptions } from "./Viewer.vue";

const props = defineProps<{
    node: AstNode;
    originalText: string;
    options: MarkdownOptions;
}>();

const children = computed(() =>
    "children" in props.node ? props.node.children : [],
);

const headChildren = computed(() =>
    children.value.filter((child) => child.type === "tableHead"),
);
const bodyChildren = computed(() =>
    children.value.filter((child) => child.type !== "tableHead"),
);

const showFootnote = (label: string) => {
    location.hash = `note-footnote-${label}`;
};
</script>

<template>
    <span v-if="node.type === 'text'">{{ node.content }}</span>
    <p v-else-if="node.type === 'paragraph'">
        <MarkdownNode
            v-for="(child, index) in children"
            :key="index"
            :node="child"
            :original-text="originalText"
            :options="options"
        />
    </p>
    <component
        :is="node.data.type === 'ordered' ? 'ol' : 'ul'"
        v-else-if="node.type === 'list'"
    >
        <MarkdownNode
            v-for="(child, index) in children"
            :key="index"
            :node="child"
            :original-text="originalText"
            :options="options"
        />
    </component>
    <li v-else-if="node.type === 'listItem'">
        <MarkdownNode
            v-for="(child, index) in children"
            :key="index"
            :node="child"
            :original-text="originalText"
            :options="options"
        />
    </li>
    <span v-else-if="node.type === 'softBreak'">&nbsp;</span>
    <p v-else-if="node.type === 'hardBreak'">&nbsp;</p>
    <blockquote v-else-if="node.type === 'blockQuote'">
        <MarkdownNode
            v-for="(child, index) in children"
            :key="index"
            :node="child"
            :original-text="originalText"
            :options="options"
        />
    </blockquote>
    <Icon
        v-else-if="node.type === 'taskListMarker'"
        :name="node.checked ? 'checkbox-checked' : 'checkbox'"
    />
    <hr v-else-if="node.type === 'rule'" />
    <img
        v-else-if="node.type === 'image'"
        :src="node.url"
        class="inline-block"
        :alt="node.title"
    />
    <component
        :is="{ emphasis: 'i', strong: 'strong', strikethrough: 's' }[node.type]"
        v-else-if="
            node.type === 'emphasis' ||
            node.type === 'strong' ||
            node.type === 'strikethrough'
        "
    >
        <MarkdownNode
            v-for="(child, index) in children"
            :key="index"
            :node="child"
            :original-text="originalText"
            :options="options"
        />
    </component>
    <MarkdownLink v-else-if="node.type === 'link'" :node="node">
        <MarkdownNode
            v-for="(child, index) in children"
            :key="index"
            :node="child"
            :original-text="originalText"
            :options="options"
        />
    </MarkdownLink>
    <code v-else-if="node.type === 'code'">{{ node.content }}</code>
    <MarkdownHeading v-else-if="node.type === 'heading'" :node="node">
        <MarkdownNode
            v-for="(child, index) in children"
            :key="index"
            :node="child"
            :original-text="originalText"
            :options="options"
        />
    </MarkdownHeading>
    <table v-else-if="node.type === 'table'">
        <MarkdownNode
            v-for="(child, index) in headChildren"
            :key="index"
            :node="child"
            :original-text="originalText"
            :options="options"
        />
        <tbody>
            <MarkdownNode
                v-for="(child, index) in bodyChildren"
                :key="index"
                :node="child"
                :original-text="originalText"
                :options="options"
            />
        </tbody>
    </table>
    <thead v-else-if="node.type === 'tableHead'">
        <tr>
            <MarkdownNode
                v-for="(child, index) in children"
                :key="index"
                :node="child"
                :original-text="originalText"
                :options="options"
            />
        </tr>
    </thead>
    <tr v-else-if="node.type === 'tableRow'">
        <MarkdownNode
            v-for="(child, index) in children"
            :key="index"
            :node="child"
            :original-text="originalText"
            :options="options"
        />
    </tr>
    <td v-else-if="node.type === 'tableCell'">
        <MarkdownNode
            v-for="(child, index) in children"
            :key="index"
            :node="child"
            :original-text="originalText"
            :options="options"
        />
    </td>
    <span v-else-if="node.type === 'footnoteDefinition'" class="footnote-def">
        <strong
            class="footnote-number"
            :id="`note-footnote-${node.data.label}`"
        >
            {{ node.data.label }}.
        </strong>
        <MarkdownNode
            v-for="(child, index) in children"
            :key="index"
            :node="child"
            :original-text="originalText"
            :options="options"
        />
    </span>
    <span v-else-if="node.type === 'footnoteReference'" class="footnote-ref">
        <sup @click="showFootnote(node.label)">{{ node.label }}</sup>
    </span>
    <CodeBlock v-else-if="node.type === 'codeBlock'" :node="node" />
    <MarkdownExtension
        v-else-if="node.type === 'extension'"
        :node="node"
        :original-text="originalText"
        :options="options"
    />
    <div
        v-else
        class="text-danger p-2 m-2 border-solid border-danger/60 border rounded-md bg-danger-soft"
    >
        Unknown node: {{ node.type }}
    </div>
</template>
