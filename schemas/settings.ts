import { zod } from "$schemas/deps.ts";

const settings = zod.object({
    is_auto_backup_enabled: zod.number().min(0).max(1),
    max_backup_days: zod.number().min(1),
});

export type Settings = zod.infer<typeof settings>;

const settingKeys = zod.enum(["is_auto_backup_enabled", "max_backup_days"]);

export type SettingsKey = zod.infer<typeof settingKeys>;

export const getSettingsSchema = zod.object({
    keys: zod.array(settingKeys),
});

export type GetSetttings = zod.infer<typeof getSettingsSchema>;

export const backupSettingsSchema = zod.object({
    is_auto_backup_enabled: settings.shape.is_auto_backup_enabled,
    max_backup_days: settings.shape.max_backup_days,
});

export type BackupSettings = zod.infer<typeof backupSettingsSchema>;
