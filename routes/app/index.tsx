import { FreshContext } from "fresh";
import { AppState } from "$types";
import { Handlers } from "fresh/compat";

export const handler: Handlers<string> = {
    GET(_ctx: FreshContext<AppState>) {
        return new Response("", {
            status: 302,
            headers: { Location: "/app/note" },
        });
    },
};
