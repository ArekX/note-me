import { PageProps, RouteConfig } from "fresh";
import ViewPage from "../shared-[id].tsx";
import { Partial } from "fresh/runtime";
import NoteLayout from "$components/NoteLayout.tsx";

export const config: RouteConfig = {
    skipAppWrapper: true,
    skipInheritedLayouts: true,
};

export { handler } from "../shared-[id].tsx";

export default function Page(props: PageProps) {
    return (
        <Partial name="body">
            <NoteLayout>
                <ViewPage {...props as Parameters<typeof ViewPage>[0]} />
            </NoteLayout>
        </Partial>
    );
}
