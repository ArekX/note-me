// DO NOT EDIT. This file is generated by Fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import * as $_404 from "./routes/_404.tsx";
import * as $_500 from "./routes/_500.tsx";
import * as $_app from "./routes/_app.tsx";
import * as $_middleware from "./routes/_middleware.ts";
import * as $app_layout from "./routes/app/_layout.tsx";
import * as $app_middleware from "./routes/app/_middleware.ts";
import * as $app_index from "./routes/app/index.tsx";
import * as $app_logout from "./routes/app/logout.tsx";
import * as $app_note_layout from "./routes/app/note/_layout.tsx";
import * as $app_note_edit_id_ from "./routes/app/note/edit-[id].tsx";
import * as $app_note_index from "./routes/app/note/index.tsx";
import * as $app_note_new from "./routes/app/note/new.tsx";
import * as $app_note_partial_edit_id_ from "./routes/app/note/partial/edit-[id].tsx";
import * as $app_note_partial_new from "./routes/app/note/partial/new.tsx";
import * as $app_note_partial_shared_id_ from "./routes/app/note/partial/shared-[id].tsx";
import * as $app_note_partial_view_id_ from "./routes/app/note/partial/view-[id].tsx";
import * as $app_note_shared_id_ from "./routes/app/note/shared-[id].tsx";
import * as $app_note_view_id_ from "./routes/app/note/view-[id].tsx";
import * as $app_profile_layout from "./routes/app/profile/_layout.tsx";
import * as $app_profile_files from "./routes/app/profile/files.tsx";
import * as $app_profile_index from "./routes/app/profile/index.tsx";
import * as $app_settings_layout from "./routes/app/settings/_layout.tsx";
import * as $app_settings_files from "./routes/app/settings/files.tsx";
import * as $app_settings_index from "./routes/app/settings/index.tsx";
import * as $app_settings_tags from "./routes/app/settings/tags.tsx";
import * as $app_settings_users from "./routes/app/settings/users.tsx";
import * as $file_identifier_ from "./routes/file/[identifier].tsx";
import * as $index from "./routes/index.tsx";
import * as $public_identifier_ from "./routes/public/[identifier].tsx";
import * as $Checkbox from "./islands/Checkbox.tsx";
import * as $ConfirmDialog from "./islands/ConfirmDialog.tsx";
import * as $Dialog from "./islands/Dialog.tsx";
import * as $DropdownMenu from "./islands/DropdownMenu.tsx";
import * as $InvalidateData from "./islands/InvalidateData.tsx";
import * as $IslandInitializer from "./islands/IslandInitializer.tsx";
import * as $Loader from "./islands/Loader.tsx";
import * as $Pagination from "./islands/Pagination.tsx";
import * as $ToastMessages from "./islands/ToastMessages.tsx";
import * as $UserPicker from "./islands/UserPicker.tsx";
import * as $files_FileDropWrapper from "./islands/files/FileDropWrapper.tsx";
import * as $files_FileItem from "./islands/files/FileItem.tsx";
import * as $files_FilePicker from "./islands/files/FilePicker.tsx";
import * as $files_FileUpload from "./islands/files/FileUpload.tsx";
import * as $files_UploadProgressDialog from "./islands/files/UploadProgressDialog.tsx";
import * as $files_hooks_use_file_uploader from "./islands/files/hooks/use-file-uploader.ts";
import * as $markdown_NodeItem from "./islands/markdown/NodeItem.tsx";
import * as $markdown_Viewer from "./islands/markdown/Viewer.tsx";
import * as $markdown_nodes_CodeBlock from "./islands/markdown/nodes/CodeBlock.tsx";
import * as $markdown_nodes_Extension from "./islands/markdown/nodes/Extension.tsx";
import * as $markdown_nodes_Heading from "./islands/markdown/nodes/Heading.tsx";
import * as $markdown_nodes_Link from "./islands/markdown/nodes/Link.tsx";
import * as $notes_DetailsLine from "./islands/notes/DetailsLine.tsx";
import * as $notes_InsertDialog from "./islands/notes/InsertDialog.tsx";
import * as $notes_MoreMenu from "./islands/notes/MoreMenu.tsx";
import * as $notes_NoteEditor from "./islands/notes/NoteEditor.tsx";
import * as $notes_NoteTextArea from "./islands/notes/NoteTextArea.tsx";
import * as $notes_NoteWindow from "./islands/notes/NoteWindow.tsx";
import * as $notes_TagInput from "./islands/notes/TagInput.tsx";
import * as $notes_ViewNote from "./islands/notes/ViewNote.tsx";
import * as $notes_blocks_TableOfContents from "./islands/notes/blocks/TableOfContents.tsx";
import * as $notes_helpers_markdown from "./islands/notes/helpers/markdown.ts";
import * as $notes_hooks_use_note_websocket from "./islands/notes/hooks/use-note-websocket.ts";
import * as $notes_insert_components_InsertFile from "./islands/notes/insert-components/InsertFile.tsx";
import * as $notes_insert_components_InsertGroupList from "./islands/notes/insert-components/InsertGroupList.tsx";
import * as $notes_insert_components_InsertImage from "./islands/notes/insert-components/InsertImage.tsx";
import * as $notes_insert_components_InsertLink from "./islands/notes/insert-components/InsertLink.tsx";
import * as $notes_insert_components_InsertNoteLink from "./islands/notes/insert-components/InsertNoteLink.tsx";
import * as $notes_insert_components_InsertToc from "./islands/notes/insert-components/InsertToc.tsx";
import * as $notes_insert_components_LinkForm from "./islands/notes/insert-components/LinkForm.tsx";
import * as $notes_windows_NoteDelete from "./islands/notes/windows/NoteDelete.tsx";
import * as $notes_windows_NoteDetails from "./islands/notes/windows/NoteDetails.tsx";
import * as $notes_windows_NoteHelp from "./islands/notes/windows/NoteHelp.tsx";
import * as $notes_windows_NoteHistory from "./islands/notes/windows/NoteHistory.tsx";
import * as $notes_windows_NoteMove from "./islands/notes/windows/NoteMove.tsx";
import * as $notes_windows_NoteReminder from "./islands/notes/windows/NoteReminder.tsx";
import * as $notes_windows_NoteShare from "./islands/notes/windows/NoteShare.tsx";
import * as $notes_windows_components_CreateLinkForm from "./islands/notes/windows/components/CreateLinkForm.tsx";
import * as $notes_windows_components_HistoryDiff from "./islands/notes/windows/components/HistoryDiff.tsx";
import * as $notes_windows_components_OneTimeReminder from "./islands/notes/windows/components/OneTimeReminder.tsx";
import * as $notes_windows_components_PresetReminder from "./islands/notes/windows/components/PresetReminder.tsx";
import * as $notes_windows_components_RepeatReminder from "./islands/notes/windows/components/RepeatReminder.tsx";
import * as $notes_windows_components_ShareLinks from "./islands/notes/windows/components/ShareLinks.tsx";
import * as $notes_windows_components_ShareToUsers from "./islands/notes/windows/components/ShareToUsers.tsx";
import * as $notifications_NotificationItem from "./islands/notifications/NotificationItem.tsx";
import * as $notifications_NotificationList from "./islands/notifications/NotificationList.tsx";
import * as $notifications_notification_message_text from "./islands/notifications/notification-message-text.ts";
import * as $notifications_views_NotificationSharedView from "./islands/notifications/views/NotificationSharedView.tsx";
import * as $notifications_views_ReminderView from "./islands/notifications/views/ReminderView.tsx";
import * as $profile_UserProfile from "./islands/profile/UserProfile.tsx";
import * as $sidebar_ListSwitcher from "./islands/sidebar/ListSwitcher.tsx";
import * as $sidebar_LogoutButton from "./islands/sidebar/LogoutButton.tsx";
import * as $sidebar_RemindersList from "./islands/sidebar/RemindersList.tsx";
import * as $sidebar_SearchBar from "./islands/sidebar/SearchBar.tsx";
import * as $sidebar_SharedNotesList from "./islands/sidebar/SharedNotesList.tsx";
import * as $sidebar_SideBarPanel from "./islands/sidebar/SideBarPanel.tsx";
import * as $tags_EditTagForm from "./islands/tags/EditTagForm.tsx";
import * as $tags_TagsList from "./islands/tags/TagsList.tsx";
import * as $tree_DeleteGroupProgressDialog from "./islands/tree/DeleteGroupProgressDialog.tsx";
import * as $tree_MoreMenu from "./islands/tree/MoreMenu.tsx";
import * as $tree_RootGroupBar from "./islands/tree/RootGroupBar.tsx";
import * as $tree_TreeItem from "./islands/tree/TreeItem.tsx";
import * as $tree_TreeList from "./islands/tree/TreeList.tsx";
import * as $tree_hooks_record_container from "./islands/tree/hooks/record-container.ts";
import * as $tree_hooks_use_record_tree from "./islands/tree/hooks/use-record-tree.ts";
import * as $tree_hooks_use_tree_state from "./islands/tree/hooks/use-tree-state.ts";
import * as $tree_hooks_use_tree_websocket from "./islands/tree/hooks/use-tree-websocket.ts";
import * as $users_EditUserForm from "./islands/users/EditUserForm.tsx";
import * as $users_UserList from "./islands/users/UserList.tsx";
import { type Manifest } from "$fresh/server.ts";

const manifest = {
    routes: {
        "./routes/_404.tsx": $_404,
        "./routes/_500.tsx": $_500,
        "./routes/_app.tsx": $_app,
        "./routes/_middleware.ts": $_middleware,
        "./routes/app/_layout.tsx": $app_layout,
        "./routes/app/_middleware.ts": $app_middleware,
        "./routes/app/index.tsx": $app_index,
        "./routes/app/logout.tsx": $app_logout,
        "./routes/app/note/_layout.tsx": $app_note_layout,
        "./routes/app/note/edit-[id].tsx": $app_note_edit_id_,
        "./routes/app/note/index.tsx": $app_note_index,
        "./routes/app/note/new.tsx": $app_note_new,
        "./routes/app/note/partial/edit-[id].tsx": $app_note_partial_edit_id_,
        "./routes/app/note/partial/new.tsx": $app_note_partial_new,
        "./routes/app/note/partial/shared-[id].tsx":
            $app_note_partial_shared_id_,
        "./routes/app/note/partial/view-[id].tsx": $app_note_partial_view_id_,
        "./routes/app/note/shared-[id].tsx": $app_note_shared_id_,
        "./routes/app/note/view-[id].tsx": $app_note_view_id_,
        "./routes/app/profile/_layout.tsx": $app_profile_layout,
        "./routes/app/profile/files.tsx": $app_profile_files,
        "./routes/app/profile/index.tsx": $app_profile_index,
        "./routes/app/settings/_layout.tsx": $app_settings_layout,
        "./routes/app/settings/files.tsx": $app_settings_files,
        "./routes/app/settings/index.tsx": $app_settings_index,
        "./routes/app/settings/tags.tsx": $app_settings_tags,
        "./routes/app/settings/users.tsx": $app_settings_users,
        "./routes/file/[identifier].tsx": $file_identifier_,
        "./routes/index.tsx": $index,
        "./routes/public/[identifier].tsx": $public_identifier_,
    },
    islands: {
        "./islands/Checkbox.tsx": $Checkbox,
        "./islands/ConfirmDialog.tsx": $ConfirmDialog,
        "./islands/Dialog.tsx": $Dialog,
        "./islands/DropdownMenu.tsx": $DropdownMenu,
        "./islands/InvalidateData.tsx": $InvalidateData,
        "./islands/IslandInitializer.tsx": $IslandInitializer,
        "./islands/Loader.tsx": $Loader,
        "./islands/Pagination.tsx": $Pagination,
        "./islands/ToastMessages.tsx": $ToastMessages,
        "./islands/UserPicker.tsx": $UserPicker,
        "./islands/files/FileDropWrapper.tsx": $files_FileDropWrapper,
        "./islands/files/FileItem.tsx": $files_FileItem,
        "./islands/files/FilePicker.tsx": $files_FilePicker,
        "./islands/files/FileUpload.tsx": $files_FileUpload,
        "./islands/files/UploadProgressDialog.tsx": $files_UploadProgressDialog,
        "./islands/files/hooks/use-file-uploader.ts":
            $files_hooks_use_file_uploader,
        "./islands/markdown/NodeItem.tsx": $markdown_NodeItem,
        "./islands/markdown/Viewer.tsx": $markdown_Viewer,
        "./islands/markdown/nodes/CodeBlock.tsx": $markdown_nodes_CodeBlock,
        "./islands/markdown/nodes/Extension.tsx": $markdown_nodes_Extension,
        "./islands/markdown/nodes/Heading.tsx": $markdown_nodes_Heading,
        "./islands/markdown/nodes/Link.tsx": $markdown_nodes_Link,
        "./islands/notes/DetailsLine.tsx": $notes_DetailsLine,
        "./islands/notes/InsertDialog.tsx": $notes_InsertDialog,
        "./islands/notes/MoreMenu.tsx": $notes_MoreMenu,
        "./islands/notes/NoteEditor.tsx": $notes_NoteEditor,
        "./islands/notes/NoteTextArea.tsx": $notes_NoteTextArea,
        "./islands/notes/NoteWindow.tsx": $notes_NoteWindow,
        "./islands/notes/TagInput.tsx": $notes_TagInput,
        "./islands/notes/ViewNote.tsx": $notes_ViewNote,
        "./islands/notes/blocks/TableOfContents.tsx":
            $notes_blocks_TableOfContents,
        "./islands/notes/helpers/markdown.ts": $notes_helpers_markdown,
        "./islands/notes/hooks/use-note-websocket.ts":
            $notes_hooks_use_note_websocket,
        "./islands/notes/insert-components/InsertFile.tsx":
            $notes_insert_components_InsertFile,
        "./islands/notes/insert-components/InsertGroupList.tsx":
            $notes_insert_components_InsertGroupList,
        "./islands/notes/insert-components/InsertImage.tsx":
            $notes_insert_components_InsertImage,
        "./islands/notes/insert-components/InsertLink.tsx":
            $notes_insert_components_InsertLink,
        "./islands/notes/insert-components/InsertNoteLink.tsx":
            $notes_insert_components_InsertNoteLink,
        "./islands/notes/insert-components/InsertToc.tsx":
            $notes_insert_components_InsertToc,
        "./islands/notes/insert-components/LinkForm.tsx":
            $notes_insert_components_LinkForm,
        "./islands/notes/windows/NoteDelete.tsx": $notes_windows_NoteDelete,
        "./islands/notes/windows/NoteDetails.tsx": $notes_windows_NoteDetails,
        "./islands/notes/windows/NoteHelp.tsx": $notes_windows_NoteHelp,
        "./islands/notes/windows/NoteHistory.tsx": $notes_windows_NoteHistory,
        "./islands/notes/windows/NoteMove.tsx": $notes_windows_NoteMove,
        "./islands/notes/windows/NoteReminder.tsx": $notes_windows_NoteReminder,
        "./islands/notes/windows/NoteShare.tsx": $notes_windows_NoteShare,
        "./islands/notes/windows/components/CreateLinkForm.tsx":
            $notes_windows_components_CreateLinkForm,
        "./islands/notes/windows/components/HistoryDiff.tsx":
            $notes_windows_components_HistoryDiff,
        "./islands/notes/windows/components/OneTimeReminder.tsx":
            $notes_windows_components_OneTimeReminder,
        "./islands/notes/windows/components/PresetReminder.tsx":
            $notes_windows_components_PresetReminder,
        "./islands/notes/windows/components/RepeatReminder.tsx":
            $notes_windows_components_RepeatReminder,
        "./islands/notes/windows/components/ShareLinks.tsx":
            $notes_windows_components_ShareLinks,
        "./islands/notes/windows/components/ShareToUsers.tsx":
            $notes_windows_components_ShareToUsers,
        "./islands/notifications/NotificationItem.tsx":
            $notifications_NotificationItem,
        "./islands/notifications/NotificationList.tsx":
            $notifications_NotificationList,
        "./islands/notifications/notification-message-text.ts":
            $notifications_notification_message_text,
        "./islands/notifications/views/NotificationSharedView.tsx":
            $notifications_views_NotificationSharedView,
        "./islands/notifications/views/ReminderView.tsx":
            $notifications_views_ReminderView,
        "./islands/profile/UserProfile.tsx": $profile_UserProfile,
        "./islands/sidebar/ListSwitcher.tsx": $sidebar_ListSwitcher,
        "./islands/sidebar/LogoutButton.tsx": $sidebar_LogoutButton,
        "./islands/sidebar/RemindersList.tsx": $sidebar_RemindersList,
        "./islands/sidebar/SearchBar.tsx": $sidebar_SearchBar,
        "./islands/sidebar/SharedNotesList.tsx": $sidebar_SharedNotesList,
        "./islands/sidebar/SideBarPanel.tsx": $sidebar_SideBarPanel,
        "./islands/tags/EditTagForm.tsx": $tags_EditTagForm,
        "./islands/tags/TagsList.tsx": $tags_TagsList,
        "./islands/tree/DeleteGroupProgressDialog.tsx":
            $tree_DeleteGroupProgressDialog,
        "./islands/tree/MoreMenu.tsx": $tree_MoreMenu,
        "./islands/tree/RootGroupBar.tsx": $tree_RootGroupBar,
        "./islands/tree/TreeItem.tsx": $tree_TreeItem,
        "./islands/tree/TreeList.tsx": $tree_TreeList,
        "./islands/tree/hooks/record-container.ts":
            $tree_hooks_record_container,
        "./islands/tree/hooks/use-record-tree.ts": $tree_hooks_use_record_tree,
        "./islands/tree/hooks/use-tree-state.ts": $tree_hooks_use_tree_state,
        "./islands/tree/hooks/use-tree-websocket.ts":
            $tree_hooks_use_tree_websocket,
        "./islands/users/EditUserForm.tsx": $users_EditUserForm,
        "./islands/users/UserList.tsx": $users_UserList,
    },
    baseUrl: import.meta.url,
} satisfies Manifest;

export default manifest;
