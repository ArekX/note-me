import TagsList from "$islands/tags/TagsList.tsx";
import { guardHandler } from "$backend/rbac/authorizer.ts";
import { FreshContext, page } from "fresh";
import { AppState } from "$types";
import { CanManageTags } from "$backend/rbac/permissions.ts";
import { Handlers } from "fresh/compat";

export const handler: Handlers = {
    GET: guardHandler(
        CanManageTags.Read,
        (_ctx: FreshContext<AppState>) => {
            return page({});
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
