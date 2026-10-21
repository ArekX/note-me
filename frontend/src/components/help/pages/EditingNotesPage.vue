<script setup lang="ts">
import HelpAction from "../HelpAction.vue";
import HelpLink from "../HelpLink.vue";
</script>

<template>
    <div>
        <h1>Editing</h1>

        <p>
            You can edit notes by clicking on the edit icon, clicking on the
            pencil icon in the sidebar, or clicking on edit in the top right
            menu of the note you are viewing (on a phone).
        </p>

        <p>
            In the note editor you can set the title of the note, add one or
            more tags and edit the contents of the note. Please note that NoteMe
            works with
            <a
                href="https://en.wikipedia.org/wiki/Markdown"
                target="_blank"
                rel="noopener noreferrer"
                >markdown syntax</a
            >
            which will be displayed here, refer to the
            <HelpAction page="markdown-syntax" class="link">
                markdown syntax</HelpAction
            >
            to see what is supported.
        </p>

        <p>
            Tags are used to organize notes and can be added as words separated
            by a # (hash) symbol. Tags can be used to easily search similar
            notes together which can be stored in one or more different groups.
        </p>

        <h1>Rich and source editor</h1>

        <p>
            Notes open in the rich editor, which shows the text formatted while
            you write. Markdown typed into it formats in place: "# " starts a
            heading, **bold** and *italic* format the text between the stars, "-
            ", "1. ", "- [ ] " and "&gt; " start lists, checklists and quotes,
            three backticks start a code block, and links, images, footnotes and
            blocks like {:note-link|...} turn into what they show. The note is
            still saved as markdown.
        </p>

        <p>
            Note lists and note links show which group or note they point to;
            click one to pick another. Audio and video show their player. The
            pencil and code icons above the toolbar switch between the rich
            editor and the markdown source while you edit; the note editor in
            <HelpLink :to="{ name: 'profile' }">your profile</HelpLink> sets
            which one a note opens in. A note first saved from the rich editor
            can have its markdown tidied up (list markers, blank lines, table
            spacing); its history shows those changes.
        </p>

        <h1>Inserting content</h1>

        <p>
            When editing contents of a note you can use keyboard shortcuts to
            make the process faster and to insert predefined templates like
            links, images, and more. You can see the full list of shortcuts in
            the
            <HelpAction page="keyboard-shortcuts" class="link">
                Keyboard Shortcuts</HelpAction
            >
            section.
        </p>

        <p>
            The toolbar above the text formats the selected text (bold, italic,
            code, headings 1 to 6, lists and checklists) and inserts links,
            images and a table of contents. In the source editor a link or image
            is inserted with placeholders to fill in; in the rich editor a
            dialog asks for the address. Either way, selected text becomes the
            link text or the image description. The table, file, note list and
            note link buttons open a dialog to set them up before they are
            inserted.
        </p>

        <p>
            Files can also be inserted without the toolbar, by dragging the
            files into the note editor or by pasting the file from the
            clipboard. Files will be uploaded to your profile and NoteMe will
            use its best judgment of the file type to decide how it should be
            inserted into the note, for example if you insert an image file it
            will be inserted as a markdown image.
        </p>

        <h1>Previewing changes</h1>

        <p>
            You can preview changes to the note by clicking on the eye icon
            above the toolbar, next to the lock (or "Preview mode" in the top
            right menu, or Ctrl+E). This shows how the note will look when it is
            saved. The pencil or code icon next to it goes back to writing.
        </p>

        <h1>Note width</h1>

        <p>
            New notes start in a narrower, centred column that is easier to
            read. On a larger screen the arrows icon next to the lock switches
            the note to full width and back. The choice is saved with the note
            and used whenever the note is shown.
        </p>

        <h1>Protecting the note</h1>

        <p>
            You can protect your note by clicking on the lock icon above the
            toolbar or "Protect" / "Unprotect" in the top right menu. This will
            encrypt the note's contents with your password so that only you can
            see its contents. Check
            <HelpAction page="protecting-notes" class="link">
                Protecting Notes</HelpAction
            >
            for more information.
        </p>
    </div>
</template>
