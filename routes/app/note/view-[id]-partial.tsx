import { PageProps, RouteConfig } from "$fresh/server.ts";
import ViewPage from "./view-[id].tsx";
import { Partial } from "$fresh/runtime.ts";

export const config: RouteConfig = {
    skipAppWrapper: true,
    skipInheritedLayouts: true,
};

export { handler } from "./view-[id].tsx";

export default function Page(props: PageProps) {
    return (
        <Partial name="noteBody">
            <ViewPage {...props} />
        </Partial>
    );
}
