import {
    getUserById,
    updateUserProfile,
} from "$backend/repository/user-repository.ts";
import { validateRequest } from "$schemas/mod.ts";
import { UserProfile, userProfileSchema } from "$schemas/users.ts";
import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { validateUserPassword } from "$backend/repository/user-repository.ts";
import { toUpdated } from "$backend/api-responses.ts";

export const updateOwnProfile = async (
    req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const data: UserProfile = await req.json();

    const userId = ctx.state.session?.getUserId()!;

    const profileSchema = userProfileSchema.refine(
        async (data) => {
            if (!data.old_password) {
                return true;
            }

            return await validateUserPassword(userId, data.old_password);
        },
        { message: "Old password is incorrect", path: ["old_password"] },
    );

    await validateRequest(profileSchema, data);

    const result = await updateUserProfile(userId, data);

    if (result) {
        await ctx.state.session?.patch({
            user: (await getUserById(userId))!,
        });
    }

    return toUpdated(result);
};
