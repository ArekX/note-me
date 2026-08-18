import { FreshContext, page, PageProps } from "fresh";
import { AppState } from "$types";
import { UserLoginRecord } from "$db";
import ResetUserPassword from "$islands/profile/ResetUserPassword.tsx";
import { Handlers } from "fresh/compat";

interface PasswordResetData {
    user: UserLoginRecord;
}

export const handler: Handlers<PasswordResetData> = {
    GET(ctx: FreshContext<AppState>) {
        if (!ctx.state.session?.data.user?.is_password_reset_required) {
            return new Response("", {
                status: 302,
                headers: { Location: "/app" },
            });
        }

        return page({
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
