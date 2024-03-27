// DO NOT EDIT. This file is generated by Fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import * as $_404 from "./routes/_404.tsx";
import * as $_500 from "./routes/_500.tsx";
import * as $_app from "./routes/_app.tsx";
import * as $_middleware from "./routes/_middleware.ts";
import * as $api_middleware from "./routes/api/_middleware.ts";
import * as $api_groups_id_ from "./routes/api/groups/[id].ts";
import * as $api_groups_index from "./routes/api/groups/index.ts";
import * as $api_notes_index from "./routes/api/notes/index.ts";
import * as $api_profile from "./routes/api/profile.ts";
import * as $api_tags_id_ from "./routes/api/tags/[id].ts";
import * as $api_tags_index from "./routes/api/tags/index.ts";
import * as $api_users_id_ from "./routes/api/users/[id].ts";
import * as $api_users_index from "./routes/api/users/index.ts";
import * as $app_layout from "./routes/app/_layout.tsx";
import * as $app_middleware from "./routes/app/_middleware.ts";
import * as $app_index from "./routes/app/index.tsx";
import * as $app_logout from "./routes/app/logout.tsx";
import * as $app_note_index from "./routes/app/note/index.tsx";
import * as $app_note_new from "./routes/app/note/new.tsx";
import * as $app_profile from "./routes/app/profile.tsx";
import * as $app_settings_layout from "./routes/app/settings/_layout.tsx";
import * as $app_settings_index from "./routes/app/settings/index.tsx";
import * as $app_settings_tags_index from "./routes/app/settings/tags/index.tsx";
import * as $app_settings_users_index from "./routes/app/settings/users/index.tsx";
import * as $index from "./routes/index.tsx";
import * as $ConfirmDialog from "./islands/ConfirmDialog.tsx";
import * as $Dialog from "./islands/Dialog.tsx";
import * as $IconMenu from "./islands/IconMenu.tsx";
import * as $Loader from "./islands/Loader.tsx";
import * as $Pagination from "./islands/Pagination.tsx";
import * as $ScriptLoader from "./islands/ScriptLoader.tsx";
import * as $Viewer from "./islands/Viewer.tsx";
import * as $groups_GroupItem from "./islands/groups/GroupItem.tsx";
import * as $groups_GroupList from "./islands/groups/GroupList.tsx";
import * as $groups_RootGroupBar from "./islands/groups/RootGroupBar.tsx";
import * as $groups_SearchBar from "./islands/groups/SearchBar.tsx";
import * as $notes_MoreMenu from "./islands/notes/MoreMenu.tsx";
import * as $notes_NoteEditor from "./islands/notes/NoteEditor.tsx";
import * as $notes_ViewNote from "./islands/notes/ViewNote.tsx";
import * as $notifications_NotificationItem from "./islands/notifications/NotificationItem.tsx";
import * as $notifications_NotificationList from "./islands/notifications/NotificationList.tsx";
import * as $notifications_views_ReminderView from "./islands/notifications/views/ReminderView.tsx";
import * as $profile_UserProfile from "./islands/profile/UserProfile.tsx";
import * as $sidebar_ListSwitcher from "./islands/sidebar/ListSwitcher.tsx";
import * as $sidebar_RemindersList from "./islands/sidebar/RemindersList.tsx";
import * as $sidebar_RenderViews from "./islands/sidebar/RenderViews.tsx";
import * as $sidebar_SharedNotesList from "./islands/sidebar/SharedNotesList.tsx";
import * as $sidebar_SideBarPanel from "./islands/sidebar/SideBarPanel.tsx";
import * as $tags_EditTagForm from "./islands/tags/EditTagForm.tsx";
import * as $tags_TagsList from "./islands/tags/TagsList.tsx";
import * as $users_EditUserForm from "./islands/users/EditUserForm.tsx";
import * as $users_UserList from "./islands/users/UserList.tsx";
import { type Manifest } from "$fresh/server.ts";

const manifest = {
    routes: {
        "./routes/_404.tsx": $_404,
        "./routes/_500.tsx": $_500,
        "./routes/_app.tsx": $_app,
        "./routes/_middleware.ts": $_middleware,
        "./routes/api/_middleware.ts": $api_middleware,
        "./routes/api/groups/[id].ts": $api_groups_id_,
        "./routes/api/groups/index.ts": $api_groups_index,
        "./routes/api/notes/index.ts": $api_notes_index,
        "./routes/api/profile.ts": $api_profile,
        "./routes/api/tags/[id].ts": $api_tags_id_,
        "./routes/api/tags/index.ts": $api_tags_index,
        "./routes/api/users/[id].ts": $api_users_id_,
        "./routes/api/users/index.ts": $api_users_index,
        "./routes/app/_layout.tsx": $app_layout,
        "./routes/app/_middleware.ts": $app_middleware,
        "./routes/app/index.tsx": $app_index,
        "./routes/app/logout.tsx": $app_logout,
        "./routes/app/note/index.tsx": $app_note_index,
        "./routes/app/note/new.tsx": $app_note_new,
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
        "./islands/IconMenu.tsx": $IconMenu,
        "./islands/Loader.tsx": $Loader,
        "./islands/Pagination.tsx": $Pagination,
        "./islands/ScriptLoader.tsx": $ScriptLoader,
        "./islands/Viewer.tsx": $Viewer,
        "./islands/groups/GroupItem.tsx": $groups_GroupItem,
        "./islands/groups/GroupList.tsx": $groups_GroupList,
        "./islands/groups/RootGroupBar.tsx": $groups_RootGroupBar,
        "./islands/groups/SearchBar.tsx": $groups_SearchBar,
        "./islands/notes/MoreMenu.tsx": $notes_MoreMenu,
        "./islands/notes/NoteEditor.tsx": $notes_NoteEditor,
        "./islands/notes/ViewNote.tsx": $notes_ViewNote,
        "./islands/notifications/NotificationItem.tsx":
            $notifications_NotificationItem,
        "./islands/notifications/NotificationList.tsx":
            $notifications_NotificationList,
        "./islands/notifications/views/ReminderView.tsx":
            $notifications_views_ReminderView,
        "./islands/profile/UserProfile.tsx": $profile_UserProfile,
        "./islands/sidebar/ListSwitcher.tsx": $sidebar_ListSwitcher,
        "./islands/sidebar/RemindersList.tsx": $sidebar_RemindersList,
        "./islands/sidebar/RenderViews.tsx": $sidebar_RenderViews,
        "./islands/sidebar/SharedNotesList.tsx": $sidebar_SharedNotesList,
        "./islands/sidebar/SideBarPanel.tsx": $sidebar_SideBarPanel,
        "./islands/tags/EditTagForm.tsx": $tags_EditTagForm,
        "./islands/tags/TagsList.tsx": $tags_TagsList,
        "./islands/users/EditUserForm.tsx": $users_EditUserForm,
        "./islands/users/UserList.tsx": $users_UserList,
    },
    baseUrl: import.meta.url,
} satisfies Manifest;

export default manifest;
