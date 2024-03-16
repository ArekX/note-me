import { load } from "$std/dotenv/mod.ts";
import { createHandler, ServeHandlerInfo } from "$fresh/server.ts";
import config from "../fresh.config.ts";
import manifest from "../fresh.gen.ts";
import { setupTestDatabase } from "$backend/database.ts";
import { migrator, setupTestMigrator } from "$backend/migration-manager.ts";

await load({ envPath: "/tests/.env.test", export: true });

export const url = "http://127.0.0.1:8000";

const CONN_INFO: ServeHandlerInfo = {
    remoteAddr: { hostname: "127.0.0.1", port: 53496, transport: "tcp" },
};

export type ClientHandler = (
    req: Request,
    connInfo?: ServeHandlerInfo | undefined,
) => Promise<Response>;

export const createClient = (): Promise<ClientHandler> =>
    createHandler(manifest, config);

export const createRequest = (
    resource: string,
    init?: RequestInit | undefined,
) => new Request(`${url}${resource}`, init);

export const createFormRequest = (
    resource: string,
    body: Record<string, string>,
) => createRequest(resource, {
    method: "post",
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
    },
    body: Object.entries(body).map(([key, value]) => `${key}=${value}`).join(
        "&",
    ),
});

export const sendRequest = (clientHandler: ClientHandler, request: Request) =>
    clientHandler(request, CONN_INFO);

const runBeforeTest = async () => {
    setupTestDatabase();
    setupTestMigrator();
    await migrator.migrateUp();
    // TODO: seed data?
};

const runAfterTest = async () => {
};

export type AddStepTestMethod = (
    name: string,
    stepFn: () => Promise<void>,
) => Promise<void>;

export const defineTest = (
    name: string,
    testFn: (
        addStep: AddStepTestMethod,
        client: ClientHandler,
    ) => Promise<void>,
) => {
    Deno.test(name, async (t) => {
        const client = await createClient();

        const addStep = async (
            name: string,
            stepFn: () => Promise<void>,
        ) => {
            await t.step(name, async () => {
                await runBeforeTest();
                await stepFn();
                await runAfterTest();
            });
        };

        await testFn(addStep, client);
    });
};
