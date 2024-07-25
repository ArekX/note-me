import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { AppState } from "$types";
import { parseQueryParams } from "$backend/parse-query-params.ts";
import {
    getSingleUserGroup,
    GroupRecord,
} from "$backend/repository/group-repository.ts";
import EditNotePage from "$islands/notes/pages/EditNotePage.tsx";

interface PageData {
    group: GroupRecord | null;
}

interface QueryParams {
    group_id?: number;
}

export const handler: Handlers<PageData> = {
    async GET(req, ctx: FreshContext<AppState, PageData>) {
        const noteParams = parseQueryParams<QueryParams>(req.url, {
            group_id: { type: "number", optional: true },
        });

        const group = await getSingleUserGroup(
            noteParams.group_id ?? 0,
            ctx.state.session?.getUserId() ?? 0,
        );

        if (!group && noteParams.group_id) {
            throw new Deno.errors.NotFound("Requested group not found.");
        }

        return ctx.render({
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
