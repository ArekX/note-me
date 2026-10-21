import { markRaw, type Component } from "vue";
import {
    getFileDownloadUrl,
    getFileViewUrl,
    getImageMarkdown,
    getLinkMarkdown,
    getMediaMarkdown,
    getTableMarkdown,
} from "@/lib/markdown-snippets";
import type { FileMetaRecord } from "@/types/records";
import InsertFile from "./InsertFile.vue";
import InsertNoteLink, { type InsertNoteLinkData } from "./InsertNoteLink.vue";
import InsertNoteList, { type InsertNoteListData } from "./InsertNoteList.vue";
import InsertTable, { type InsertTableData } from "./InsertTable.vue";

export interface InsertButton {
    name: string;
    icon: string;
    formatData: (data: never) => string;
}

export type InsertComponentId = "table" | "file" | "note-list" | "note-link";

export interface InsertComponent {
    id: InsertComponentId;
    name: string;
    icon: string;
    description: string;
    component: Component;
    insertButtons: Record<string, InsertButton>;
}

const button = <T>(
    name: string,
    icon: string,
    formatData: (data: T) => string,
): InsertButton => ({ name, icon, formatData });

export const insertComponents: InsertComponent[] = [
    {
        id: "table",
        name: "Table",
        icon: "table",
        description: "Insert a table",
        component: markRaw(InsertTable),
        insertButtons: {
            table: button<InsertTableData>("Insert", "table", (data) =>
                getTableMarkdown(data.rows),
            ),
        },
    },
    {
        id: "file",
        name: "File",
        icon: "paperclip",
        description: "Upload or select a file to insert",
        component: markRaw(InsertFile),
        insertButtons: {
            image: button<FileMetaRecord[]>("Image", "image", (files) =>
                files
                    .map((file) =>
                        getImageMarkdown(
                            getFileViewUrl(file.identifier),
                            file.name,
                        ),
                    )
                    .join("\n"),
            ),
            audio: button<FileMetaRecord[]>("Audio player", "music", (files) =>
                files
                    .map((file) =>
                        getMediaMarkdown(
                            "audio",
                            getFileViewUrl(file.identifier),
                        ),
                    )
                    .join("\n"),
            ),
            video: button<FileMetaRecord[]>("Video player", "video", (files) =>
                files
                    .map((file) =>
                        getMediaMarkdown(
                            "video",
                            getFileViewUrl(file.identifier),
                        ),
                    )
                    .join("\n"),
            ),
            "download-link": button<FileMetaRecord[]>(
                "Download link",
                "link",
                (files) =>
                    files
                        .map((file) =>
                            getLinkMarkdown(
                                getFileDownloadUrl(file.identifier),
                                file.name,
                            ),
                        )
                        .join("\n"),
            ),
            "view-link": button<FileMetaRecord[]>(
                "In-browser link",
                "link",
                (files) =>
                    files
                        .map((file) =>
                            getLinkMarkdown(
                                getFileViewUrl(file.identifier),
                                file.name,
                            ),
                        )
                        .join("\n"),
            ),
            "download-link-text": button<FileMetaRecord[]>(
                "Download Link Text",
                "text",
                (files) =>
                    files
                        .map((file) => getFileDownloadUrl(file.identifier))
                        .join("\n"),
            ),
            "view-link-text": button<FileMetaRecord[]>(
                "In-browser Link Text",
                "text",
                (files) =>
                    files
                        .map((file) => getFileViewUrl(file.identifier))
                        .join("\n"),
            ),
        },
    },
    {
        id: "note-list",
        name: "Note list",
        icon: "detail",
        description: "Insert a dynamic note list from a group",
        component: markRaw(InsertNoteList),
        insertButtons: {
            list: button<InsertNoteListData>(
                "Insert List",
                "list-ul",
                (data) => `{:note-list|${data.groupId}}`,
            ),
        },
    },
    {
        id: "note-link",
        name: "Note link",
        icon: "note",
        description: "Insert a dynamic link to a note from list",
        component: markRaw(InsertNoteLink),
        insertButtons: {
            link: button<InsertNoteLinkData>(
                "Insert Link",
                "link",
                (data) => `{:note-link|${data.noteId}}`,
            ),
        },
    },
];
