import type {
    CancelExportOwnDataResponse,
    CreateUserResponse,
    DecryptTextResponse,
    DeleteOwnPasskeyResponse,
    DeleteUserResponse,
    EncryptTextResponse,
    ExportOwnDataFinished,
    ExportOwnDataPercentageUpdate,
    ExportOwnDataResponse,
    FindPickUsersResponse,
    FindUsersResponse,
    GetOwnPasskeysResponse,
    GetPasskeyRegistrationResponse,
    UpdateOnboardingStateResponse,
    UpdateOwnPasskeyResponse,
    UpdateProfilePictureResponse,
    UpdateProfileResponse,
    UpdateUserResponse,
    UserFrontendMessage,
    VerifyOwnPasswordResponse,
    VerifyPasskeyRegistrationResponse,
} from "@/types/messages";
import { roleDefinitions, type Role } from "@/lib/rbac";
import type { SessionResponse } from "@/types/records";
import { contains, nextId, paged, type MockHandlerMap } from "../handler";
import { now, type MockState } from "../state";
import { mcpClientHandlers } from "./mcp-clients";

export const MOCK_PASSWORD = "admin";

// Same text as the server's.
const DECRYPT_ERROR = "Could not decrypt, wrong password or corrupted data.";

export const mockSessionPayload = ({
    currentUser,
}: MockState): SessionResponse => ({
    user: { ...currentUser },
    permissions: [...(roleDefinitions[currentUser.role]?.permissions ?? [])],
    required_steps: currentUser.is_password_reset_required
        ? ["password_reset"]
        : [],
});

const runningExports = new Map<string, ReturnType<typeof setInterval>>();

export const usersHandlers: MockHandlerMap<UserFrontendMessage> = {
    createUser: ({ data }, { state, respond, fail }) => {
        if (state.users.some((u) => u.username === data.username)) {
            return fail("User with this username already exists.");
        }
        const t = now();
        const id = nextId(state);
        state.users.push({
            id,
            name: data.name,
            username: data.username,
            timezone: data.timezone,
            role: data.role as Role,
            created_at: t,
            updated_at: t,
        });
        respond<CreateUserResponse>("createUserResponse", { data: { id } });
    },
    updateUser: ({ id, data }, { state, respond, fail }) => {
        const user = state.users.find((u) => u.id === id);
        if (!user) {
            return fail("User not found.");
        }
        if (id === state.currentUser.id) {
            if (data.role !== state.currentUser.role) {
                return fail("You cannot change your own role.");
            }
            if (data.new_password !== undefined) {
                return fail("Please change your password via profile page.");
            }
        }
        user.name = data.name;
        user.role = data.role as Role;
        user.timezone = data.timezone;
        user.updated_at = now();
        const { new_password: _password, ...updated } = data;
        respond<UpdateUserResponse>("updateUserResponse", {
            updated_id: id,
            updated_data: updated,
        });
    },
    deleteUser: ({ id }, { state, respond, fail }) => {
        if (id === state.currentUser.id) {
            return fail("You cannot delete your own user.");
        }
        if (!state.users.some((u) => u.id === id)) {
            return fail("User not found.");
        }
        state.users = state.users.filter((u) => u.id !== id);
        respond<DeleteUserResponse>("deleteUserResponse", { deleted_id: id });
    },
    findUsers: ({ filters, page }, { state, respond }) =>
        respond<FindUsersResponse>("findUsersResponse", {
            records: paged(
                state.users.filter(
                    (u) =>
                        contains(u.name, filters.name) &&
                        contains(u.username, filters.username) &&
                        (!filters.role || u.role === filters.role),
                ),
                page,
            ),
        }),
    updateProfile: ({ data }, { state, respond, fail }) => {
        if (data.old_password && data.new_password) {
            if (data.old_password === data.new_password) {
                return fail(
                    "New password must be different from the old password.",
                );
            }
            if (data.old_password !== MOCK_PASSWORD) {
                return fail("Old password is incorrect");
            }
        }
        state.currentUser.name = data.name;
        state.currentUser.timezone = data.timezone;
        state.currentUser.preferred_editor =
            data.preferred_editor ?? state.currentUser.preferred_editor;
        state.currentUser.updated_at = now();
        respond<UpdateProfileResponse>("updateProfileResponse", {
            data: {
                name: data.name,
                timezone: data.timezone,
                preferred_editor: data.preferred_editor,
            },
        });
    },
    findPickUsers: ({ filters, page }, { state, respond }) => {
        const name = (filters.name ?? "").trim();
        const username = (filters.username ?? "").trim();
        if (name.length < 2 && username.length < 2) {
            return respond<FindPickUsersResponse>("findPickUsersResponse", {
                records: { results: [], total: 0, page: 1, per_page: 5 },
            });
        }
        respond<FindPickUsersResponse>("findPickUsersResponse", {
            records: paged(
                state.users
                    .filter(
                        (u) =>
                            contains(u.name, name) &&
                            contains(u.username, username),
                    )
                    .filter(
                        (u) =>
                            !filters.user_ids ||
                            filters.user_ids.includes(u.id),
                    )
                    .filter((u) => !filters.exclude_user_ids?.includes(u.id))
                    .map(({ id, name, username }) => ({ id, name, username })),
                page,
                5,
            ),
        });
    },
    updateProfilePicture: ({ identifier }, { state, respond, fail }) => {
        if (identifier !== null) {
            const file = state.files.find((f) => f.identifier === identifier);
            if (!file) {
                return fail("File not found.");
            }
            if (!file.mime_type.startsWith("image/")) {
                return fail("Profile picture must be an image.");
            }
        }
        state.currentUser.profile_picture = identifier;
        respond<UpdateProfilePictureResponse>("updateProfilePictureResponse", {
            identifier,
        });
    },
    updateOnboarding: ({ onboarding_state }, { state, respond }) => {
        state.currentUser.onboarding_state = {
            ...state.currentUser.onboarding_state,
            ...onboarding_state,
        };
        respond<UpdateOnboardingStateResponse>("updateOnboardingResponse", {
            onboarding_state: state.currentUser.onboarding_state,
        });
    },
    verifyOwnPassword: ({ password }, { respond }) =>
        respond<VerifyOwnPasswordResponse>("verifyOwnPasswordResponse", {
            verified: password === MOCK_PASSWORD,
        }),
    encryptText: ({ text, password }, { respond, fail }) => {
        if (password !== MOCK_PASSWORD) {
            return fail(DECRYPT_ERROR);
        }
        respond<EncryptTextResponse>("encryptTextResponse", {
            encrypted: `mock:${btoa(unescape(encodeURIComponent(text)))}`,
        });
    },
    decryptText: ({ encrypted, password }, { respond, fail }) => {
        if (password !== MOCK_PASSWORD || !encrypted.startsWith("mock:")) {
            return fail(DECRYPT_ERROR);
        }
        respond<DecryptTextResponse>("decryptTextResponse", {
            text: decodeURIComponent(escape(atob(encrypted.slice(5)))),
        });
    },
    exportOwnData: ({ user_password }, { respond, push, fail }) => {
        if (user_password !== MOCK_PASSWORD) {
            return fail("Invalid password.");
        }
        const export_id = `export-${Date.now()}`;
        const job_id = `job-${Date.now()}`;
        respond<ExportOwnDataResponse>("exportOwnDataResponse", {
            export_id,
            job_id,
        });

        let percentage = 0;
        const timer = setInterval(() => {
            percentage = Math.min(100, percentage + 20);
            push<ExportOwnDataPercentageUpdate>(
                "users",
                "exportOwnDataPercentage",
                { export_id, percentage },
            );
            if (percentage >= 100) {
                clearInterval(timer);
                runningExports.delete(job_id);
                push<ExportOwnDataFinished>("users", "exportOwnDataFinished", {
                    export_id,
                });
            }
        }, 500);
        runningExports.set(job_id, timer);
    },
    cancelExportOwnData: ({ job_id }, { respond, fail }) => {
        const timer = runningExports.get(job_id);
        if (!timer) {
            return fail("You do not own this export job.");
        }
        clearInterval(timer);
        runningExports.delete(job_id);
        respond<CancelExportOwnDataResponse>("cancelExportOwnDataResponse", {
            job_id,
        });
    },
    getPasskeyRegistrationOptions: ({ password }, { state, respond, fail }) => {
        if (state.passkeyPasswordConfirmedUntil < Date.now()) {
            if (password === undefined) {
                return respond<GetPasskeyRegistrationResponse>(
                    "getPasskeyRegistrationOptionsResponse",
                    { password_required: true },
                );
            }
            if (password !== MOCK_PASSWORD) {
                return fail(
                    JSON.stringify([
                        {
                            code: "custom",
                            path: ["password"],
                            message: "Invalid password.",
                        },
                    ]),
                );
            }
            state.passkeyPasswordConfirmedUntil = Date.now() + 5 * 60 * 1000;
        }
        respond<GetPasskeyRegistrationResponse>(
            "getPasskeyRegistrationOptionsResponse",
            {
                password_required: false,
                options: {
                    challenge: "bW9jay1jaGFsbGVuZ2U",
                    rp: { name: "NoteMe", id: "localhost" },
                    user: {
                        id: "bW9jay11c2Vy",
                        name: state.currentUser.username,
                        displayName: state.currentUser.name,
                    },
                    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                    authenticatorSelection: {
                        residentKey: "required",
                        requireResidentKey: true,
                        userVerification: "preferred",
                    },
                    attestation: "none",
                },
            },
        );
    },
    verifyPasskeyRegistration: ({ response }, { state, respond }) => {
        const t = now();
        const transports = response.response.transports ?? [];
        state.passkeys.unshift({
            id: nextId(state),
            name: transports.includes("internal")
                ? "Platform authenticator (built-in into OS)"
                : "Passkey authenticator",
            transports: transports.join(","),
            created_at: t,
            last_used_at: t,
        });
        respond<VerifyPasskeyRegistrationResponse>(
            "verifyPasskeyRegistrationResponse",
            { success: true },
        );
    },
    getOwnPasskeys: ({ page }, { state, respond }) =>
        respond<GetOwnPasskeysResponse>("getOwnPasskeysResponse", {
            records: paged(state.passkeys, page),
        }),
    deleteOwnPasskey: ({ id }, { state, respond }) => {
        state.passkeys = state.passkeys.filter((p) => p.id !== id);
        respond<DeleteOwnPasskeyResponse>("deleteOwnPasskeyResponse", { id });
    },
    updateOwnPasskey: ({ id, name }, { state, respond, fail }) => {
        const trimmed = name.trim();
        if (!trimmed) {
            return fail(
                JSON.stringify([
                    {
                        code: "too_small",
                        path: ["name"],
                        message: "Name must have at least one character",
                    },
                ]),
            );
        }
        const passkey = state.passkeys.find((p) => p.id === id);
        if (passkey) {
            passkey.name = trimmed;
        }
        respond<UpdateOwnPasskeyResponse>("updateOwnPasskeyResponse", {
            id,
            name: trimmed,
        });
    },
    ...mcpClientHandlers,
};
