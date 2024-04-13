import { Command } from "$cli/deps.ts";
import {
    checkIfUserExists,
    createUserRecord,
} from "$backend/repository/user-repository.ts";
import { cliLogger } from "$backend/logger.ts";

export const addUser = new Command()
    .description("Add a user")
    .arguments("<name:string> <username:string> <password:string>")
    .action(
        async (
            _options: unknown,
            name: string,
            username: string,
            password: string,
        ) => {
            if (await checkIfUserExists(username)) {
                cliLogger.warn(
                    `User with username '{username}' already exists!`,
                    { username },
                );
                return;
            }

            cliLogger.info("Creating user...");
            cliLogger.info("Name: {name}", { name });
            cliLogger.info("Username: {username}", { username });
            cliLogger.info("Password: {password}", { password });
            cliLogger.info("Role: admin");
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            cliLogger.info("Timezone: {timezone}", { timezone });
            await createUserRecord({
                name,
                username,
                password,
                role: "admin",
                timezone,
            });
            cliLogger.info("User created!");
        },
    );
