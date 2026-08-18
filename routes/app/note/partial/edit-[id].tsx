import { PageProps, RouteConfig } from "fresh";
import EditPage from "../edit-[id].tsx";
import { Partial } from "fresh/runtime";
import NoteLayout from "$components/NoteLayout.tsx";

export const config: RouteConfig = {
    skipAppWrapper: true,
    skipInheritedLayouts: true,
};

export { handler } from "../edit-[id].tsx";

export default function Page(props: PageProps) {
    return (
        <Partial name="body">
            <NoteLayout>
                <EditPage {...props as Parameters<typeof EditPage>[0]} />
            </NoteLayout>
        </Partial>
    );
}
