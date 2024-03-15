import { Handlers } from "$fresh/server.ts";
import { updateOwnProfile } from "$backend/api-handlers/profile/update-own-profile.ts";

export const handler: Handlers = {
  PUT: updateOwnProfile,
};
