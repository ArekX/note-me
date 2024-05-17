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
import * as $app_note_view_id_ from "./routes/app/note/view-[id].tsx";
import * as $app_profile from "./routes/app/profile.tsx";
import * as $app_settings_layout from "./routes/app/settings/_layout.tsx";
import * as $app_settings_index from "./routes/app/settings/index.tsx";
import * as $app_settings_tags_index from "./routes/app/settings/tags/index.tsx";
import * as $app_settings_users_index from "./routes/app/settings/users/index.tsx";
import * as $index from "./routes/index.tsx";
import * as $ConfirmDialog from "./islands/ConfirmDialog.tsx";
import * as $Dialog from "./islands/Dialog.tsx";
import * as $InvalidateData from "./islands/InvalidateData.tsx";
import * as $Loader from "./islands/Loader.tsx";
import * as $Pagination from "./islands/Pagination.tsx";
import * as $ScriptLoader from "./islands/ScriptLoader.tsx";
import * as $notes_InsertDialog from "./islands/notes/InsertDialog.tsx";
import * as $notes_MoreMenu from "./islands/notes/MoreMenu.tsx";
import * as $notes_NoteEditor from "./islands/notes/NoteEditor.tsx";
import * as $notes_NoteTextArea from "./islands/notes/NoteTextArea.tsx";
import * as $notes_NoteWindow from "./islands/notes/NoteWindow.tsx";
import * as $notes_TagInput from "./islands/notes/TagInput.tsx";
import * as $notes_ViewNote from "./islands/notes/ViewNote.tsx";
import * as $notes_insert_components_InsertImage from "./islands/notes/insert-components/InsertImage.tsx";
import * as $notes_insert_components_InsertLink from "./islands/notes/insert-components/InsertLink.tsx";
import * as $notes_windows_Help from "./islands/notes/windows/Help.tsx";
import * as $notes_windows_NoteDelete from "./islands/notes/windows/NoteDelete.tsx";
import * as $notes_windows_NoteDetails from "./islands/notes/windows/NoteDetails.tsx";
import * as $notifications_NotificationItem from "./islands/notifications/NotificationItem.tsx";
import * as $notifications_NotificationList from "./islands/notifications/NotificationList.tsx";
import * as $notifications_views_ReminderView from "./islands/notifications/views/ReminderView.tsx";
import * as $profile_UserProfile from "./islands/profile/UserProfile.tsx";
import * as $sidebar_ListSwitcher from "./islands/sidebar/ListSwitcher.tsx";
import * as $sidebar_LogoutButton from "./islands/sidebar/LogoutButton.tsx";
import * as $sidebar_RemindersList from "./islands/sidebar/RemindersList.tsx";
import * as $sidebar_RenderViews from "./islands/sidebar/RenderViews.tsx";
import * as $sidebar_SearchBar from "./islands/sidebar/SearchBar.tsx";
import * as $sidebar_SharedNotesList from "./islands/sidebar/SharedNotesList.tsx";
import * as $sidebar_SideBarPanel from "./islands/sidebar/SideBarPanel.tsx";
import * as $tags_EditTagForm from "./islands/tags/EditTagForm.tsx";
import * as $tags_TagsList from "./islands/tags/TagsList.tsx";
import * as $tree_MoreMenu from "./islands/tree/MoreMenu.tsx";
import * as $tree_RootGroupBar from "./islands/tree/RootGroupBar.tsx";
import * as $tree_TreeItem from "./islands/tree/TreeItem.tsx";
import * as $tree_TreeList from "./islands/tree/TreeList.tsx";
import * as $tree_hooks_record_container from "./islands/tree/hooks/record-container.ts";
import * as $tree_hooks_use_drag_manager from "./islands/tree/hooks/use-drag-manager.ts";
import * as $tree_hooks_use_record_tree from "./islands/tree/hooks/use-record-tree.ts";
import * as $tree_hooks_use_tree_state from "./islands/tree/hooks/use-tree-state.ts";
import * as $users_EditUserForm from "./islands/users/EditUserForm.tsx";
import * as $users_UserList from "./islands/users/UserList.tsx";
import * as $viewer_Viewer from "./islands/viewer/Viewer.tsx";
import * as $viewer_blocks_Blockquote from "./islands/viewer/blocks/Blockquote.tsx";
import * as $viewer_blocks_Break from "./islands/viewer/blocks/Break.tsx";
import * as $viewer_blocks_Checkbox from "./islands/viewer/blocks/Checkbox.tsx";
import * as $viewer_blocks_ChildrenNode from "./islands/viewer/blocks/ChildrenNode.tsx";
import * as $viewer_blocks_Code from "./islands/viewer/blocks/Code.tsx";
import * as $viewer_blocks_CodeBlock from "./islands/viewer/blocks/CodeBlock.tsx";
import * as $viewer_blocks_Extension from "./islands/viewer/blocks/Extension.tsx";
import * as $viewer_blocks_Footnote from "./islands/viewer/blocks/Footnote.tsx";
import * as $viewer_blocks_Heading from "./islands/viewer/blocks/Heading.tsx";
import * as $viewer_blocks_HorizontalLine from "./islands/viewer/blocks/HorizontalLine.tsx";
import * as $viewer_blocks_Image from "./islands/viewer/blocks/Image.tsx";
import * as $viewer_blocks_Link from "./islands/viewer/blocks/Link.tsx";
import * as $viewer_blocks_List from "./islands/viewer/blocks/List.tsx";
import * as $viewer_blocks_Root from "./islands/viewer/blocks/Root.tsx";
import * as $viewer_blocks_Text from "./islands/viewer/blocks/Text.tsx";
import * as $viewer_renderer from "./islands/viewer/renderer.tsx";
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
        "./routes/app/note/view-[id].tsx": $app_note_view_id_,
        "./routes/app/profile.tsx": $app_profile,
        "./routes/app/settings/_layout.tsx": $app_settings_layout,
        "./routes/app/settings/index.tsx": $app_settings_index,
        "./routes/app/settings/tags/index.tsx": $app_settings_tags_index,
        "./routes/app/settings/users/index.tsx": $app_settings_users_index,
        "./routes/index.tsx": $index,
    },
    islands: {
        "./islands/ConfirmDialog.tsx": $ConfirmDialog,
        "./islands/Dialog.tsx": $Dialog,
        "./islands/InvalidateData.tsx": $InvalidateData,
        "./islands/Loader.tsx": $Loader,
        "./islands/Pagination.tsx": $Pagination,
        "./islands/ScriptLoader.tsx": $ScriptLoader,
        "./islands/notes/InsertDialog.tsx": $notes_InsertDialog,
        "./islands/notes/MoreMenu.tsx": $notes_MoreMenu,
        "./islands/notes/NoteEditor.tsx": $notes_NoteEditor,
        "./islands/notes/NoteTextArea.tsx": $notes_NoteTextArea,
        "./islands/notes/NoteWindow.tsx": $notes_NoteWindow,
        "./islands/notes/TagInput.tsx": $notes_TagInput,
        "./islands/notes/ViewNote.tsx": $notes_ViewNote,
        "./islands/notes/insert-components/InsertImage.tsx":
            $notes_insert_components_InsertImage,
        "./islands/notes/insert-components/InsertLink.tsx":
            $notes_insert_components_InsertLink,
        "./islands/notes/windows/Help.tsx": $notes_windows_Help,
        "./islands/notes/windows/NoteDelete.tsx": $notes_windows_NoteDelete,
        "./islands/notes/windows/NoteDetails.tsx": $notes_windows_NoteDetails,
        "./islands/notifications/NotificationItem.tsx":
            $notifications_NotificationItem,
        "./islands/notifications/NotificationList.tsx":
            $notifications_NotificationList,
        "./islands/notifications/views/ReminderView.tsx":
            $notifications_views_ReminderView,
        "./islands/profile/UserProfile.tsx": $profile_UserProfile,
        "./islands/sidebar/ListSwitcher.tsx": $sidebar_ListSwitcher,
        "./islands/sidebar/LogoutButton.tsx": $sidebar_LogoutButton,
        "./islands/sidebar/RemindersList.tsx": $sidebar_RemindersList,
        "./islands/sidebar/RenderViews.tsx": $sidebar_RenderViews,
        "./islands/sidebar/SearchBar.tsx": $sidebar_SearchBar,
        "./islands/sidebar/SharedNotesList.tsx": $sidebar_SharedNotesList,
        "./islands/sidebar/SideBarPanel.tsx": $sidebar_SideBarPanel,
        "./islands/tags/EditTagForm.tsx": $tags_EditTagForm,
        "./islands/tags/TagsList.tsx": $tags_TagsList,
        "./islands/tree/MoreMenu.tsx": $tree_MoreMenu,
        "./islands/tree/RootGroupBar.tsx": $tree_RootGroupBar,
        "./islands/tree/TreeItem.tsx": $tree_TreeItem,
        "./islands/tree/TreeList.tsx": $tree_TreeList,
        "./islands/tree/hooks/record-container.ts":
            $tree_hooks_record_container,
        "./islands/tree/hooks/use-drag-manager.ts":
            $tree_hooks_use_drag_manager,
        "./islands/tree/hooks/use-record-tree.ts": $tree_hooks_use_record_tree,
        "./islands/tree/hooks/use-tree-state.ts": $tree_hooks_use_tree_state,
        "./islands/users/EditUserForm.tsx": $users_EditUserForm,
        "./islands/users/UserList.tsx": $users_UserList,
        "./islands/viewer/Viewer.tsx": $viewer_Viewer,
        "./islands/viewer/blocks/Blockquote.tsx": $viewer_blocks_Blockquote,
        "./islands/viewer/blocks/Break.tsx": $viewer_blocks_Break,
        "./islands/viewer/blocks/Checkbox.tsx": $viewer_blocks_Checkbox,
        "./islands/viewer/blocks/ChildrenNode.tsx": $viewer_blocks_ChildrenNode,
        "./islands/viewer/blocks/Code.tsx": $viewer_blocks_Code,
        "./islands/viewer/blocks/CodeBlock.tsx": $viewer_blocks_CodeBlock,
        "./islands/viewer/blocks/Extension.tsx": $viewer_blocks_Extension,
        "./islands/viewer/blocks/Footnote.tsx": $viewer_blocks_Footnote,
        "./islands/viewer/blocks/Heading.tsx": $viewer_blocks_Heading,
        "./islands/viewer/blocks/HorizontalLine.tsx":
            $viewer_blocks_HorizontalLine,
        "./islands/viewer/blocks/Image.tsx": $viewer_blocks_Image,
        "./islands/viewer/blocks/Link.tsx": $viewer_blocks_Link,
        "./islands/viewer/blocks/List.tsx": $viewer_blocks_List,
        "./islands/viewer/blocks/Root.tsx": $viewer_blocks_Root,
        "./islands/viewer/blocks/Text.tsx": $viewer_blocks_Text,
        "./islands/viewer/renderer.tsx": $viewer_renderer,
    },
    baseUrl: import.meta.url,
} satisfies Manifest;

export default manifest;
