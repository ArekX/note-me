import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { AppState } from "$types";
import { UserLoginRecord } from "../../workers/database/query/user-repository.ts";
import ResetUserPassword from "$islands/profile/ResetUserPassword.tsx";

interface PasswordResetData {
    user: UserLoginRecord;
}

export const handler: Handlers<PasswordResetData> = {
    GET(_req, ctx: FreshContext<AppState, PasswordResetData>) {
        if (!ctx.state.session?.data.user?.is_password_reset_required) {
            return new Response("", {
                status: 302,
                headers: { Location: "/app" },
            });
        }

        return ctx.render({
            user: ctx.state.session.data.user,
        });
    },
};

export default function Page(props: PageProps<PasswordResetData>) {
    const isNewUser = props.data.user.created_at === props.data.user.updated_at;
    return (
        <ResetUserPassword
            isNewUser={isNewUser}
        />
    );
}
