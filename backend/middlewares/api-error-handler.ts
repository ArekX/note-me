import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";

export const apiErrorHandler = async (
    _req: Request,
    ctx: FreshContext<AppState>,
) => {
    try {
        const response = await ctx.next();
        return response;
    } catch (e) {
        if (e instanceof Deno.errors.InvalidData) {
            return new Response(e.message, {
                status: 422,
                headers: {
                    "Content-Type": "application/json",
                },
            });
        }

        console.error(e);
        return new Response("Server error", {
            status: 500,
        });
    }
};
