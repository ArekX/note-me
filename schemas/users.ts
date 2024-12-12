import { zod } from "./deps.ts";
import { roleNames, Roles } from "$backend/rbac/role-definitions.ts";
import { supportedTimezones } from "$lib/time/time-zone.ts";

const userSchema = zod.object({
    name: zod.string().min(1, "Name must have at least one character"),
    username: zod.string().min(1, "Username must have at least one character"),
    password: zod.string().min(8, "Password must have at least 8 characters"),
    role: zod.enum(roleNames as [string, ...string[]]),
    timezone: zod.enum(supportedTimezones as [string, ...string[]]),
});

const addPasswordRefinement = <V extends zod.AnyZodObject>(schema: V) => {
    const refineCheck = (data: zod.infer<V>) => {
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
    };

    return schema.refine(
        refineCheck,
        {
            message:
                "New password must match confirm password and must be at least 8 characters.",
            path: ["new_password"],
        },
    ).refine(
        refineCheck,
        {
            message:
                "Confirm password must match new password and must be at least 8 characters.",
            path: ["confirm_password"],
        },
    );
};

const oldPasswordShape = zod.string().min(1);

export const userProfileSchema = addPasswordRefinement(
    zod.object({
        name: userSchema.shape.name,
        timezone: userSchema.shape.timezone,
        old_password: oldPasswordShape.optional(),
        new_password: userSchema.shape.password.optional(),
        confirm_password: userSchema.shape.password.optional(),
    }).strict(),
);

export type EditUserProfile = zod.infer<typeof userProfileSchema>;

export const addUserSchema = zod.object({
    name: userSchema.shape.name,
    username: userSchema.shape.username,
    password: userSchema.shape.password,
    role: userSchema.shape.role,
    timezone: userSchema.shape.timezone,
}).strict();

export type AddUserRequest = zod.infer<typeof addUserSchema> & { role: Roles };

export const updateUserSchema = zod.object({
    name: userSchema.shape.name,
    new_password: userSchema.shape.password.optional(),
    role: userSchema.shape.role,
    timezone: userSchema.shape.timezone,
}).strict();

export type UpdateUserRequest = zod.infer<typeof updateUserSchema> & {
    role: Roles;
};

export const changeUserPasswordSchema = addPasswordRefinement(
    zod.object({
        old_password: oldPasswordShape,
        new_password: userSchema.shape.password,
        confirm_password: userSchema.shape.password,
    }).strict(),
);

export type ResetPasswordRequest = zod.infer<typeof changeUserPasswordSchema>;
