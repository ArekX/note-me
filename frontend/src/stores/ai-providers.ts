import { ref } from "vue";
import { defineStore } from "pinia";
import type { AiProviderRequest } from "@/schemas/ai";
import type {
    CreateAiProviderMessage,
    CreateAiProviderResponse,
    DeleteAiProviderMessage,
    DeleteAiProviderResponse,
    GetAiProvidersMessage,
    GetAiProvidersResponse,
    GetAiUserAccessMessage,
    GetAiUserAccessResponse,
    ListAiProviderModelsMessage,
    ListAiProviderModelsResponse,
    SetAiUserAccessMessage,
    SetAiUserAccessResponse,
    SetDefaultAiProviderMessage,
    SetDefaultAiProviderResponse,
    TestAiProviderMessage,
    TestAiProviderResponse,
    UpdateAiProviderMessage,
    UpdateAiProviderResponse,
} from "@/types/messages";
import type {
    AiProviderRecord,
    AiProviderType,
    AiUserAccessRecord,
} from "@/types/records";
import { useSocketStore } from "./socket";

// A provider check makes a short request with one tool, and a slow server
// answers late.
const PROVIDER_CHECK_TIMEOUT_MS = 75_000;

export const useAiProvidersStore = defineStore("aiProviders", () => {
    const providers = ref<AiProviderRecord[]>([]);

    const service = () => useSocketStore().getService();

    const load = async () => {
        const response = await (
            await service()
        ).sendMessage<GetAiProvidersMessage, GetAiProvidersResponse>(
            "ai",
            "getProviders",
            { expect: "getProvidersResponse" },
        );
        providers.value = response.providers;
    };

    const save = async (
        id: number | null,
        data: AiProviderRequest,
        isDefault: boolean,
    ) => {
        const socket = await service();
        const { record } =
            id === null
                ? await socket.sendMessage<
                      CreateAiProviderMessage,
                      CreateAiProviderResponse
                  >("ai", "createProvider", {
                      data: { data },
                      expect: "createProviderResponse",
                  })
                : await socket.sendMessage<
                      UpdateAiProviderMessage,
                      UpdateAiProviderResponse
                  >("ai", "updateProvider", {
                      data: { id, data },
                      expect: "updateProviderResponse",
                  });
        if (isDefault !== record.is_default) {
            await setDefault(isDefault ? record.id : null);
        } else {
            await load();
        }
    };

    const remove = async (id: number) => {
        await (
            await service()
        ).sendMessage<DeleteAiProviderMessage, DeleteAiProviderResponse>(
            "ai",
            "deleteProvider",
            { data: { id }, expect: "deleteProviderResponse" },
        );
        await load();
    };

    const setDefault = async (id: number | null) => {
        await (
            await service()
        ).sendMessage<
            SetDefaultAiProviderMessage,
            SetDefaultAiProviderResponse
        >("ai", "setDefaultProvider", {
            data: { id },
            expect: "setDefaultProviderResponse",
        });
        await load();
    };

    const test = async (id: number) =>
        (await service()).sendMessage<
            TestAiProviderMessage,
            TestAiProviderResponse
        >("ai", "testProvider", {
            data: { id },
            expect: "testProviderResponse",
            timeoutMs: PROVIDER_CHECK_TIMEOUT_MS,
        });

    const listModels = async (
        providerId: number | null,
        providerType: AiProviderType,
        baseUrl: string,
        apiKey: string | null,
    ) =>
        (
            await (
                await service()
            ).sendMessage<
                ListAiProviderModelsMessage,
                ListAiProviderModelsResponse
            >("ai", "listProviderModels", {
                data: {
                    provider_id: providerId,
                    provider_type: providerType,
                    base_url: baseUrl,
                    api_key: apiKey,
                },
                expect: "listProviderModelsResponse",
                timeoutMs: PROVIDER_CHECK_TIMEOUT_MS,
            })
        ).models;

    const getUserAccess = async (userIds: number[]) =>
        userIds.length === 0
            ? []
            : (
                  await (
                      await service()
                  ).sendMessage<
                      GetAiUserAccessMessage,
                      GetAiUserAccessResponse
                  >("ai", "getUserAccess", {
                      data: { user_ids: userIds },
                      expect: "getUserAccessResponse",
                  })
              ).records;

    const setUserAccess = async (record: AiUserAccessRecord) => {
        await (
            await service()
        ).sendMessage<SetAiUserAccessMessage, SetAiUserAccessResponse>(
            "ai",
            "setUserAccess",
            { data: record, expect: "setUserAccessResponse" },
        );
    };

    const defaultProvider = () =>
        providers.value.find((provider) => provider.is_default) ?? null;

    return {
        providers,
        load,
        save,
        remove,
        setDefault,
        test,
        listModels,
        getUserAccess,
        setUserAccess,
        defaultProvider,
    };
});
