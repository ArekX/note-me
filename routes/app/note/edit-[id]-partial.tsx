import { PageProps, RouteConfig } from "$fresh/server.ts";
import EditPage from "./edit-[id].tsx";
import { Partial } from "$fresh/runtime.ts";

export const config: RouteConfig = {
    skipAppWrapper: true,
    skipInheritedLayouts: true,
};

export { handler } from "./edit-[id].tsx";

export default function Page(props: PageProps) {
    return (
        <Partial name="noteBody">
            <EditPage {...props} />
        </Partial>
    );
}
