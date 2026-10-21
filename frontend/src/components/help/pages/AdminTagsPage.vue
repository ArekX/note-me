<script setup lang="ts">
import HelpAction from "../HelpAction.vue";
import HelpLink from "../HelpLink.vue";
</script>

<template>
    <div>
        <h1>Tags</h1>

        <p>
            Tags are shared by everyone: all users pick from the same list of
            tags when tagging their notes.
            <HelpLink :to="{ name: 'settings-tags' }">Settings → Tags</HelpLink>
            lets you keep that list tidy. Search it by name; it is paged.
        </p>

        <ul class="list-disc pl-5">
            <li>
                <strong>Add</strong> creates a new tag. Type the name and press
                Enter or the check button; Escape cancels.
            </li>
            <li>
                <strong>Rename</strong>: click a tag's name, change it and press
                Enter. The new name shows on every note that has the tag, for
                every user. Renaming to a name that already exists leaves two
                tags with the same name.
            </li>
            <li>
                <strong>Delete</strong>: the minus icon removes the tag from
                every note that has it, for every user. The notes stay. This
                cannot be undone.
            </li>
        </ul>

        <p>
            Renames and deletes are recorded in the
            <HelpAction page="admin-audit-log" class="link">
                audit log</HelpAction
            >.
        </p>
    </div>
</template>
