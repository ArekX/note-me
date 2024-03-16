import { zod } from "./deps.ts";
import { roleNames } from "$backend/rbac/role-definitions.ts";

const userSchema = zod.object({
    name: zod.string().min(1, "Name must have at least one character"),
    username: zod.string().min(1, "Username must have at least one character"),
    password: zod.string().min(8, "Password must have at least 8 characters"),
    role: zod.enum(roleNames as [string, ...string[]]),
    timezone: zod.enum(
        Intl.supportedValuesOf("timeZone") as [string, ...string[]],
    ),
});

export const userProfileSchema = zod.object({
    name: userSchema.shape.name,
    timezone: userSchema.shape.timezone,
    old_password: zod.string().min(1).optional(),
    new_password: userSchema.shape.password.optional(),
    confirm_password: userSchema.shape.password.optional(),
}).refine(
    (data) => {
        const {
            old_password = "",
            new_password = "",
            confirm_password = "",
        } = data;

        if (!old_password) {
            return true;
        }

        if (
            (new_password.length < 8) ||
            (confirm_password.length < 8)
        ) {
            return false;
        }

        return new_password === confirm_password;
    },
    {
        message:
            "New password and confirm password must match and must be at least 8 characters.",
        path: ["confirm_password", "new_password"],
    },
);

export type UserProfile = zod.infer<typeof userProfileSchema>;
