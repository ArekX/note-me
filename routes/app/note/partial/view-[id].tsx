import { PageProps, RouteConfig } from "$fresh/server.ts";
import ViewPage from "../view-[id].tsx";
import { Partial } from "$fresh/runtime.ts";
import NoteLayout from "$components/NoteLayout.tsx";

export const config: RouteConfig = {
    skipAppWrapper: true,
    skipInheritedLayouts: true,
};

export { handler } from "../view-[id].tsx";

export default function Page(props: PageProps) {
    return (
        <Partial name="body">
            <NoteLayout>
                <ViewPage {...props} />
            </NoteLayout>
        </Partial>
    );
}
