<script setup lang="ts">
import HelpAction from "../HelpAction.vue";
import HelpLink from "../HelpLink.vue";
</script>

<template>
    <div>
        <h1>MCP clients</h1>

        <p>
            MCP (Model Context Protocol) lets an AI app you use yourself, such
            as Claude Code, Claude Desktop, claude.ai, ChatGPT, Cursor or VS
            Code, work with your NoteMe account. It gets the same tools as the
            <HelpAction page="ai-assistant" class="link"
                >AI assistant</HelpAction
            >: it can search and read your notes, folders, reminders, tags,
            files and help, and change them. It does not depend on the AI
            assistant: you can connect your own AI even when no AI provider is
            set up for you.
        </p>

        <h2>Adding a client</h2>
        <p>
            Open
            <HelpLink :to="{ name: 'profile-mcp-clients' }"
                >Profile → MCP clients</HelpLink
            >
            and press <strong>Add client</strong>. Give it a name you will
            recognise and pick how the AI connects:
        </p>
        <ul class="list-disc pl-5">
            <li>
                <strong>Token</strong>: for Claude Code, Cursor, VS Code and
                other tools where you paste a token. NoteMe creates a personal
                token the tool sends with every request.
            </li>
            <li>
                <strong>OAuth</strong>: for Claude Desktop, claude.ai and
                ChatGPT connectors. NoteMe creates a client ID and a client
                secret, and you list the redirect URIs of the app. The buttons
                <strong>Claude</strong> and <strong>ChatGPT</strong> add theirs.
                When the app connects, NoteMe asks you to sign in and to allow
                or deny access.
            </li>
        </ul>
        <p>
            After adding, NoteMe shows the MCP server URL, the token or the
            client secret, and example settings to copy. The token and the
            client secret are shown only once. If you lose one, generate a new
            one from the list: a new token replaces the old one at once; a new
            client secret leaves apps that are already connected working until
            they connect again.
        </p>

        <h2>Connecting</h2>
        <ul class="list-disc pl-5">
            <li>
                <strong>Claude Code</strong>: run the
                <code>claude mcp add</code> command shown after adding a token
                client.
            </li>
            <li>
                <strong>Cursor, VS Code and other tools</strong>: add the server
                URL and an <code>Authorization: Bearer</code> header with the
                token to the tool's MCP settings.
            </li>
            <li>
                <strong>Claude Desktop and claude.ai</strong>: Settings →
                Connectors → Add custom connector, enter the server URL, and in
                Advanced settings the OAuth client ID and client secret.
            </li>
            <li>
                <strong>ChatGPT</strong>: Settings → Apps &amp; Connectors,
                create a connector with the server URL, choose OAuth and enter
                the client ID and client secret.
            </li>
        </ul>

        <h2>What the AI can do</h2>
        <p>
            The AI acts as you, with your own permissions, and everything it
            changes shows up right away in every open tab. Your AI app should
            ask you before it deletes something or shares a note, but NoteMe
            itself shows no Allow or Deny for single actions, so check what your
            app lets the AI do on its own.
        </p>
        <p>
            Turn on <strong>Read only</strong> for a client to give it only the
            tools that read. It cannot change anything then. The switch can be
            changed later and applies to the AI's next request.
        </p>
        <p>
            <HelpAction page="protecting-notes" class="link"
                >Protected notes</HelpAction
            >
            are never available over MCP, not even their text when you have
            unlocked them in the app. Changing passwords, passkeys, note
            protection and exporting your data are not available either.
        </p>

        <h2>Taking access back</h2>
        <p>
            Delete the client in the list. The AI loses access at once, and so
            does every app connected with it.
        </p>
    </div>
</template>
