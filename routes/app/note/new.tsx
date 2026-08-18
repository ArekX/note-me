import { FreshContext, page, PageProps } from "fresh";
import { AppState } from "$types";
import { parseQueryParams } from "$backend/parse-query-params.ts";
import { GroupRecord, repository } from "$db";
import EditNotePage from "$islands/notes/pages/EditNotePage.tsx";
import { Handlers } from "fresh/compat";

interface PageData {
    group: GroupRecord | null;
}

interface QueryParams {
    group_id?: number;
}

export const handler: Handlers<PageData> = {
    async GET(ctx: FreshContext<AppState>) {
        const req = ctx.req;
        const noteParams = parseQueryParams<QueryParams>(req.url, {
            group_id: { type: "number", optional: true },
        });

        const group = await repository.group.getSingleUserGroup({
            id: noteParams.group_id ?? 0,
            user_id: ctx.state.session?.getUserId() ?? 0,
        });

        if (!group && noteParams.group_id) {
            throw new Deno.errors.NotFound("Requested group not found.");
        }

        return page({
            group,
        });
    },
};

export default function Page(props: PageProps<PageData, AppState>) {
    return (
        <EditNotePage
            note={{
                id: 0,
                title: "",
                note: "",
                is_encrypted: false,
                tags: [],
                group_id: props.data.group?.id ?? null,
                group_name: props.data.group?.name ?? "",
                updated_at: 0,
            }}
        />
    );
}
