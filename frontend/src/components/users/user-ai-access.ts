import type { AiProviderRecord, AiUserAccessRecord } from "@/types/records";

// One dropdown value per setting: "default", "none" or "provider:<id>".
export type AiAccessValue = string;

export const accessValue = (record: AiUserAccessRecord | undefined) =>
    record?.access === "provider"
        ? `provider:${record.provider_id}`
        : (record?.access ?? "default");

export const accessRecord = (
    userId: number,
    value: AiAccessValue,
): AiUserAccessRecord =>
    value.startsWith("provider:")
        ? {
              user_id: userId,
              access: "provider",
              provider_id: Number(value.slice("provider:".length)),
          }
        : {
              user_id: userId,
              access: value === "none" ? "none" : "default",
              provider_id: null,
          };

export const accessItems = (providers: AiProviderRecord[]) => {
    const fallback = providers.find((provider) => provider.is_default);
    return [
        {
            value: "default",
            label: `Default (${fallback?.name ?? "none set"})`,
        },
        ...providers.map((provider) => ({
            value: `provider:${provider.id}`,
            label: provider.name,
        })),
        { value: "none", label: "No AI" },
    ];
};

export const accessLabel = (
    record: AiUserAccessRecord | undefined,
    providers: AiProviderRecord[],
) => {
    if (!record || record.access === "default") {
        return "Default";
    }
    if (record.access === "none") {
        return "No AI";
    }
    return (
        providers.find((provider) => provider.id === record.provider_id)
            ?.name ?? "No AI"
    );
};
