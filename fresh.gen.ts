// DO NOT EDIT. This file is generated by Fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import * as $_404 from "./routes/_404.tsx";
import * as $_app from "./routes/_app.tsx";
import * as $api_joke from "./routes/api/joke.ts";
import * as $api_test from "./routes/api/test.ts";
import * as $app_layout from "./routes/app/_layout.tsx";
import * as $app_middleware from "./routes/app/_middleware.ts";
import * as $app_index from "./routes/app/index.tsx";
import * as $app_logout from "./routes/app/logout.tsx";
import * as $app_profile from "./routes/app/profile.tsx";
import * as $app_sockets from "./routes/app/sockets.tsx";
import * as $app_users from "./routes/app/users.tsx";
import * as $greet_name_ from "./routes/greet/[name].tsx";
import * as $index from "./routes/index.tsx";
import * as $Counter from "./islands/Counter.tsx";
import * as $Notifications from "./islands/Notifications.tsx";
import { type Manifest } from "$fresh/server.ts";

const manifest = {
  routes: {
    "./routes/_404.tsx": $_404,
    "./routes/_app.tsx": $_app,
    "./routes/api/joke.ts": $api_joke,
    "./routes/api/test.ts": $api_test,
    "./routes/app/_layout.tsx": $app_layout,
    "./routes/app/_middleware.ts": $app_middleware,
    "./routes/app/index.tsx": $app_index,
    "./routes/app/logout.tsx": $app_logout,
    "./routes/app/profile.tsx": $app_profile,
    "./routes/app/sockets.tsx": $app_sockets,
    "./routes/app/users.tsx": $app_users,
    "./routes/greet/[name].tsx": $greet_name_,
    "./routes/index.tsx": $index,
  },
  islands: {
    "./islands/Counter.tsx": $Counter,
    "./islands/Notifications.tsx": $Notifications,
  },
  baseUrl: import.meta.url,
} satisfies Manifest;

export default manifest;
