import { zod } from "./index";
import { aiProviderTypes } from "@/types/records";

const providerFields = zod
    .object({
        name: zod
            .string()
            .trim()
            .min(1, "Name must have at least one character")
            .max(255, "Name must have at most 255 characters"),
        type: zod.enum(aiProviderTypes),
        base_url: zod
            .string()
            .trim()
            .max(2048, "Base URL must have at most 2048 characters"),
        model: zod
            .string()
            .trim()
            .min(1, "Model is required")
            .max(255, "Model must have at most 255 characters"),
        api_key: zod.string().optional(),
    })
    .strict();

// A key is required when a provider that needs one is created; on update an
// absent key keeps the stored one.
export const aiProviderSchema = (creating: boolean) =>
    providerFields.superRefine((data, ctx) => {
        if (data.base_url !== "" && !/^https?:\/\//.test(data.base_url)) {
            ctx.addIssue({
                code: "custom",
                path: ["base_url"],
                message: "Base URL must start with http:// or https://",
            });
        }
        if (
            creating &&
            data.type !== "ollama" &&
            !(data.api_key ?? "").trim()
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["api_key"],
                message: "API key is required",
            });
        }
    });

export type AiProviderRequest = zod.infer<typeof providerFields>;

export const aiMessageSchema = zod.object({
    text: zod
        .string()
        .refine(
            (text) => text.trim().length > 0,
            "Message must have at least one character",
        )
        .refine(
            (text) => text.length <= 20000,
            "Message must have at most 20000 characters",
        ),
});
