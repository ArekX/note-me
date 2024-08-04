import {
    BackupItem,
    BackupStream,
    CreateBackupTarget,
} from "$lib/backup-handler/mod.ts";
import {
    DeleteObjectCommand,
    GetObjectAttributesCommand,
    GetObjectCommand,
    ListObjectsCommand,
    S3Client,
    S3ClientConfig,
    Upload,
} from "$lib/backup-handler/deps.ts";

export interface S3BackupSettings {
    bucket: string;
    prefix: string;
    region: string;
    credentials: {
        type: "iam_role";
    } | {
        type: "access_key";
        access_key_id: string;
        secret_access_key: string;
    };
}

export const s3BackupTarget: CreateBackupTarget<"s3", S3BackupSettings> = {
    type: "s3",
    create: (settings) => {
        const config: S3ClientConfig = {
            region: settings.region,
        };

        if (settings.credentials.type === "access_key") {
            config.credentials = {
                accessKeyId: settings.credentials.access_key_id,
                secretAccessKey: settings.credentials.secret_access_key,
            };
        }

        const client = new S3Client(config);

        return {
            name: "s3",
            setup: () => Promise.resolve(),
            saveBackup: async function (record): Promise<BackupItem> {
                const { inputLocation, identifier } = record;

                const stat = await Deno.stat(inputLocation);

                using file = await Deno.open(inputLocation, { read: true });

                const upload = new Upload({
                    client,
                    params: {
                        Bucket: settings.bucket,
                        Key: `${settings.prefix}/${identifier}`,
                        Body: file.readable,
                    },
                    queueSize: 4,
                    partSize: 1024 * 1024 * 5,
                });

                await upload.done();

                return {
                    identifier,
                    name: identifier,
                    created_at: Math.floor(Date.now() / 1000),
                    size: stat.size,
                };
            },
            deleteBackup: async function (
                identifier,
            ): Promise<void> {
                await client.send(
                    new DeleteObjectCommand({
                        Bucket: settings.bucket,
                        Key: `${settings.prefix}/${identifier}`,
                    }),
                );
            },
            getBackupStream: async function (
                identifier,
            ): Promise<BackupStream> {
                const getResponse = await client.send(
                    new GetObjectCommand({
                        Bucket: settings.bucket,
                        Key: `${settings.prefix}/${identifier}`,
                    }),
                );

                if (!getResponse.Body) {
                    throw new Error("Backup not found");
                }

                const sizeResponse = await client.send(
                    new GetObjectAttributesCommand({
                        Bucket: settings.bucket,
                        Key: `${settings.prefix}/${identifier}`,
                        ObjectAttributes: ["ObjectSize"],
                    }),
                );

                return {
                    identifier,
                    size: sizeResponse.ObjectSize ?? 0,
                    stream: getResponse.Body.transformToWebStream(),
                };
            },
            listBackups: async function (): Promise<BackupItem[]> {
                const response = await client.send(
                    new ListObjectsCommand({
                        Bucket: settings.bucket,
                        Prefix: settings.prefix,
                        MaxKeys: 1000,
                    }),
                );

                return (response.Contents?.map((item) => ({
                    identifier: (item.Key ?? "").replace(
                        `${settings.prefix}/`,
                        "",
                    ),
                    name: (item.Key ?? "").replace(
                        `${settings.prefix}/`,
                        "",
                    ),
                    created_at: Math.floor(
                        (item.LastModified?.getTime() ?? 0) / 1000,
                    ),
                    size: item.Size ?? 0,
                })) ?? []).sort((a, b) => b.created_at - a.created_at);
            },
        };
    },
};
