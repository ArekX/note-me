import {
  getUserById,
  updateUserProfile,
  UserProfile,
} from "$backend/repository/user-repository.ts";
import { validateRequest } from "$schemas/mod.ts";
import { userProfileSchema } from "$schemas/users.ts";
import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";

export const updateOwnProfile = async (
  req: Request,
  ctx: FreshContext<AppState>,
): Promise<Response> => {
  const data: UserProfile = await req.json();
  await validateRequest(userProfileSchema, data);

  const { id: userId = -1 } = ctx.state.session?.data.user ?? {};

  const result = await updateUserProfile(userId, data);

  if (result) {
    await ctx.state.session?.patch({
      user: (await getUserById(userId))!,
    });
  }

  return new Response(
    JSON.stringify({
      success: result,
    }),
    {
      status: 200,
    },
  );
};
