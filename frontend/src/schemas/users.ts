import { zod } from "./index";
import { roleNames, type Role } from "@/lib/rbac";
import { supportedTimezones } from "@/lib/time-zone";

export const preferredEditors = ["rich", "source"] as const;

const userSchema = zod.object({
    name: zod
        .string()
        .min(1, "Name must have at least one character")
        .max(255, "Name must have at most 255 characters"),
    username: zod
        .string()
        .min(1, "Username must have at least one character")
        .max(60, "Username must have at most 60 characters"),
    password: zod
        .string()
        .min(8, "Password must have at least 8 characters")
        .max(128, "Password must have at most 128 characters"),
    role: zod.enum(roleNames as [string, ...string[]]),
    timezone: zod.enum(supportedTimezones as [string, ...string[]]),
});

const addPasswordRefinement = <V extends zod.ZodObject>(schema: V) => {
    const refineCheck = (data: zod.infer<V>) => {
        const {
            old_password = "",
            new_password = "",
            confirm_password = "",
        } = data as {
            old_password?: string;
            new_password?: string;
            confirm_password?: string;
        };

        if (!old_password) {
            return true;
        }

        if (new_password.length < 8 || confirm_password.length < 8) {
            return false;
        }

        return new_password === confirm_password;
    };

    return schema
        .refine(refineCheck, {
            message:
                "New password must match confirm password and must be at least 8 characters.",
            path: ["new_password"],
        })
        .refine(refineCheck, {
            message:
                "Confirm password must match new password and must be at least 8 characters.",
            path: ["confirm_password"],
        });
};

const oldPasswordShape = zod.string().min(1);

// Not in the original, which saved the profile and silently skipped a new
// password sent without the old one (decision 0.47).
export const userProfileSchema = addPasswordRefinement(
    zod
        .object({
            name: userSchema.shape.name,
            timezone: userSchema.shape.timezone,
            preferred_editor: zod.enum(preferredEditors).optional(),
            old_password: oldPasswordShape.optional(),
            new_password: userSchema.shape.password.optional(),
            confirm_password: userSchema.shape.password.optional(),
        })
        .strict(),
).refine(
    (data) =>
        !!data.old_password || (!data.new_password && !data.confirm_password),
    {
        message: "Old password is required to change the password.",
        path: ["old_password"],
    },
);

export type EditUserProfile = zod.infer<typeof userProfileSchema>;

export const addUserSchema = zod
    .object({
        name: userSchema.shape.name,
        username: userSchema.shape.username,
        password: userSchema.shape.password,
        role: userSchema.shape.role,
        timezone: userSchema.shape.timezone,
    })
    .strict();

export type AddUserRequest = zod.infer<typeof addUserSchema> & { role: Role };

export const updateUserSchema = zod
    .object({
        name: userSchema.shape.name,
        new_password: userSchema.shape.password.optional(),
        role: userSchema.shape.role,
        timezone: userSchema.shape.timezone,
    })
    .strict();

export type UpdateUserRequest = zod.infer<typeof updateUserSchema> & {
    role: Role;
};

export const changeUserPasswordSchema = addPasswordRefinement(
    zod
        .object({
            old_password: oldPasswordShape,
            new_password: userSchema.shape.password,
            confirm_password: userSchema.shape.password,
        })
        .strict(),
);

export type ResetPasswordRequest = zod.infer<typeof changeUserPasswordSchema>;
