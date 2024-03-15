import { zod } from "./deps.ts";
import { roleNames } from "$backend/rbac/role-definitions.ts";

const userSchema = zod.object({
  name: zod.string().min(1, "Name must have at least one character"),
  username: zod.string().min(1, "Username must have at least one character"),
  password: zod.string().min(1, "Password must have at least one character"),
  role: zod.enum(roleNames as [string, ...string[]]),
  timezone: zod.enum(
    Intl.supportedValuesOf("timeZone") as [string, ...string[]],
  ),
});

export const userProfileSchema = zod.object({
  name: userSchema.shape.name,
  timezone: userSchema.shape.timezone,
  old_password: userSchema.shape.password.optional(),
  new_password: userSchema.shape.password.optional(),
  confirm_password: userSchema.shape.password.optional(),
});

export type UserProfile = zod.infer<typeof userProfileSchema>;

userProfileSchema.refine(
  (data) => data.new_password && data.new_password !== data.confirm_password,
  {
    message: "New password and confirm password must match",
    path: ["confirm_password", "new_password"],
  },
);
