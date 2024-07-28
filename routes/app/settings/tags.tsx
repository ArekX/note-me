import TagsList from "$islands/tags/TagsList.tsx";
import { guardHandler } from "$backend/rbac/authorizer.ts";
import { FreshContext, Handlers } from "$fresh/server.ts";
import { AppState } from "$types";
import { CanManageTags } from "$backend/rbac/permissions.ts";

export const handler: Handlers<string> = {
    GET: guardHandler(
        CanManageTags.Read,
        (_req, ctx: FreshContext<AppState>) => {
            return ctx.render({});
        },
    ),
};

export default function Page() {
    return (
        <div>
            <TagsList />
        </div>
    );
}
