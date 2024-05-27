import { PageProps, RouteConfig } from "$fresh/server.ts";
import NewPage from "./new.tsx";
import { Partial } from "$fresh/runtime.ts";

export const config: RouteConfig = {
    skipAppWrapper: true,
    skipInheritedLayouts: true,
};

export { handler } from "./new.tsx";

export default function Page(props: PageProps) {
    return (
        <Partial name="noteBody">
            <NewPage {...props} />
        </Partial>
    );
}
