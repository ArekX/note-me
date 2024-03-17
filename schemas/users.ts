import { zod } from "./deps.ts";
import { roleNames } from "$backend/rbac/role-definitions.ts";
import { supportedTimezones } from "$backend/time.ts";

const userSchema = zod.object({
    name: zod.string().min(1, "Name must have at least one character"),
    username: zod.string().min(1, "Username must have at least one character"),
    password: zod.string().min(8, "Password must have at least 8 characters"),
    role: zod.enum(roleNames as [string, ...string[]]),
    timezone: zod.enum(supportedTimezones as [string, ...string[]]),
});

export const userProfileSchema = zod.object({
    name: userSchema.shape.name,
    timezone: userSchema.shape.timezone,
    old_password: zod.string().min(1).optional(),
    new_password: userSchema.shape.password.optional(),
    confirm_password: userSchema.shape.password.optional(),
}).strict().refine(
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

export const addUserSchema = zod.object({
    name: userSchema.shape.name,
    username: userSchema.shape.username,
    password: userSchema.shape.password,
    role: userSchema.shape.role,
    timezone: userSchema.shape.timezone,
}).strict();

export type AddUserRequest = zod.infer<typeof addUserSchema>;

export const updateUserSchema = zod.object({
    name: userSchema.shape.name.optional(),
    new_password: userSchema.shape.password.optional(),
    role: userSchema.shape.role.optional(),
    timezone: userSchema.shape.timezone.optional(),
}).strict();

export type UpdateUserRequest = zod.infer<typeof updateUserSchema>;
