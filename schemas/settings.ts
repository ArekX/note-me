import { zod } from "$schemas/deps.ts";

export const backupNameSchema = zod.object({
    name: zod.string().regex(/^[a-zA-Z0-9.-]+$/),
});

export const localBackupSettingsSchema = zod.object({
    location: zod.string().min(1, "Location must be set."),
}).strict();

export type LocalBackupSettingsRequest = zod.infer<
    typeof localBackupSettingsSchema
>;

export const s3BackupSettingsSchema = zod.object({
    bucket: zod.string().min(1, "Bucket name must be at least 1 character"),
    region: zod.string().min(1, "Region must be at least 1 character"),
    prefix: zod.string().min(0),
    credentials: zod.union([
        zod.object({
            type: zod.literal("iam_role"),
        }),
        zod.object({
            type: zod.literal("access_key"),
            access_key_id: zod.string().min(
                1,
                "Access key ID must be at least 1 character",
            ),
            secret_access_key: zod.string().min(
                1,
                "Secret access key must be at least 1 character",
            ),
        }),
    ]),
}).strict();

export type S3BackupSettingsRequest = zod.infer<typeof s3BackupSettingsSchema>;

export const backupTargetSchema = zod.union([
    zod.object({
        name: zod.string().min(1, "Name must be at least 1 character"),
        type: zod.literal("local"),
        settings: localBackupSettingsSchema,
    }).strict(),
    zod.object({
        name: zod.string().min(1, "Name must be at least 1 character"),
        type: zod.literal("s3"),
        settings: s3BackupSettingsSchema,
    }).strict(),
]);

export type BackupTargetRequest = zod.infer<typeof backupTargetSchema>;
