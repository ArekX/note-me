import { PageProps, RouteConfig } from "$fresh/server.ts";
import NewPage from "../new.tsx";
import { Partial } from "$fresh/runtime.ts";
import NoteLayout from "$components/NoteLayout.tsx";

export const config: RouteConfig = {
    skipAppWrapper: true,
    skipInheritedLayouts: true,
};

export { handler } from "../new.tsx";

export default function Page(props: PageProps) {
    return (
        <Partial name="body">
            <NoteLayout>
                <NewPage {...props} />
            </NoteLayout>
        </Partial>
    );
}
