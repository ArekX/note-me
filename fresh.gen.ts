// DO NOT EDIT. This file is generated by Fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import * as $_404 from "./routes/_404.tsx";
import * as $_app from "./routes/_app.tsx";
import * as $api_middleware from "./routes/api/_middleware.ts";
import * as $api_add_note from "./routes/api/add-note.ts";
import * as $api_find_notes from "./routes/api/find-notes.ts";
import * as $app_layout from "./routes/app/_layout.tsx";
import * as $app_middleware from "./routes/app/_middleware.ts";
import * as $app_index from "./routes/app/index.tsx";
import * as $app_logout from "./routes/app/logout.tsx";
import * as $app_note_layout from "./routes/app/note/_layout.tsx";
import * as $app_note_index from "./routes/app/note/index.tsx";
import * as $app_profile from "./routes/app/profile.tsx";
import * as $app_users from "./routes/app/users.tsx";
import * as $greet_name_ from "./routes/greet/[name].tsx";
import * as $index from "./routes/index.tsx";
import * as $Button from "./islands/Button.tsx";
import * as $Counter from "./islands/Counter.tsx";
import * as $Loader from "./islands/Loader.tsx";
import * as $Notifications from "./islands/Notifications.tsx";
import * as $ScriptLoader from "./islands/ScriptLoader.tsx";
import * as $Viewer from "./islands/Viewer.tsx";
import * as $notes_NewNote from "./islands/notes/NewNote.tsx";
import * as $notes_Note from "./islands/notes/Note.tsx";
import * as $notes_NoteList from "./islands/notes/NoteList.tsx";
import { type Manifest } from "$fresh/server.ts";

const manifest = {
  routes: {
    "./routes/_404.tsx": $_404,
    "./routes/_app.tsx": $_app,
    "./routes/api/_middleware.ts": $api_middleware,
    "./routes/api/add-note.ts": $api_add_note,
    "./routes/api/find-notes.ts": $api_find_notes,
    "./routes/app/_layout.tsx": $app_layout,
    "./routes/app/_middleware.ts": $app_middleware,
    "./routes/app/index.tsx": $app_index,
    "./routes/app/logout.tsx": $app_logout,
    "./routes/app/note/_layout.tsx": $app_note_layout,
    "./routes/app/note/index.tsx": $app_note_index,
    "./routes/app/profile.tsx": $app_profile,
    "./routes/app/users.tsx": $app_users,
    "./routes/greet/[name].tsx": $greet_name_,
    "./routes/index.tsx": $index,
  },
  islands: {
    "./islands/Button.tsx": $Button,
    "./islands/Counter.tsx": $Counter,
    "./islands/Loader.tsx": $Loader,
    "./islands/Notifications.tsx": $Notifications,
    "./islands/ScriptLoader.tsx": $ScriptLoader,
    "./islands/Viewer.tsx": $Viewer,
    "./islands/notes/NewNote.tsx": $notes_NewNote,
    "./islands/notes/Note.tsx": $notes_Note,
    "./islands/notes/NoteList.tsx": $notes_NoteList,
  },
  baseUrl: import.meta.url,
} satisfies Manifest;

export default manifest;
