import { createUserRecord } from "$backend/repository/user-repository.ts";

export const initializeFirstRun = async () => {
    console.log("Creating administrator user...");
    await createUserRecord({
        name: "Administrator",
        username: "admin",
        password: "admin",
        role: "admin",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    console.log("First time setup complete!");
};
