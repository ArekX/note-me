<script setup lang="ts">
import HelpAction from "../HelpAction.vue";
import HelpLink from "../HelpLink.vue";
</script>

<template>
    <div>
        <h1>AI</h1>

        <p>
            <HelpLink :to="{ name: 'settings-ai' }">Settings → AI</HelpLink>
            lists the AI providers the
            <HelpAction page="ai-assistant" class="link">assistant</HelpAction>
            can use.
        </p>

        <h2>Providers</h2>
        <ul class="list-disc pl-5">
            <li>
                <strong>Ollama</strong> starts with Ollama's cloud,
                <code>https://ollama.com</code>, which needs an API key from
                ollama.com/settings/keys. For your own Ollama server enter its
                address instead, for example
                <code>http://localhost:11434</code>; it needs no key unless a
                proxy asks for one. The model must support tools, which
                <strong>Test</strong> checks.
            </li>
            <li>
                <strong>OpenAI</strong> uses the Chat Completions API. Change
                the base URL for other servers that offer the same API.
            </li>
            <li><strong>Claude</strong> uses Anthropic's Messages API.</li>
            <li>
                <strong>Load models</strong> lists the models the provider
                offers; any name can be typed instead.
            </li>
            <li>
                API keys are stored encrypted with the server's
                <code>AI_ENCRYPTION_KEY</code> and never shown again; leave the
                field empty to keep the stored key. When that variable changes
                or a backup is restored on another server, the key cannot be
                decrypted and must be entered again.
            </li>
        </ul>

        <h2>Who gets AI</h2>
        <p>
            Users get the <strong>default</strong> provider unless their own
            setting in
            <HelpLink :to="{ name: 'settings-users' }"
                >Settings → Users</HelpLink
            >
            picks another provider or <strong>No AI</strong>. Without a default
            only users with their own provider have the assistant. Tick
            <strong>Default provider</strong> when adding or editing a provider,
            or use the star in the list. Users are not told which provider or
            model they use.
        </p>
        <p>
            Deleting a provider turns the users set to it into No AI; users on
            the default lose the assistant when it was the default. Their
            conversations stay, read only. Changing a provider's model or key
            keeps its conversations open.
        </p>

        <p>
            Provider changes and per-user settings are recorded in the
            <HelpAction page="admin-audit-log" class="link">
                audit log</HelpAction
            >.
        </p>
    </div>
</template>
