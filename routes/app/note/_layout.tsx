import { defineLayout } from "$fresh/server.ts";
import { Partial } from "$fresh/runtime.ts";

export default defineLayout((_, ctx) => {
    return (
        <div class="text-white pb-4 pt-4 pr-6 pl-6">
            <Partial name="noteBody">
                <ctx.Component />
            </Partial>
        </div>
    );
});
