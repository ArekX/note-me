import { Command } from "$cli/deps.ts";
import {
    checkIfUserExists,
    createUserRecord,
} from "../workers/database/query/user-repository.ts";
import { logger } from "$backend/logger.ts";

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
                logger.warn(
                    `User with username '{username}' already exists!`,
                    { username },
                );
                return;
            }

            logger.info("Creating user...");
            logger.info("Name: {name}", { name });
            logger.info("Username: {username}", { username });
            logger.info("Password: {password}", { password });
            logger.info("Role: admin");
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            logger.info("Timezone: {timezone}", { timezone });
            await createUserRecord({
                name,
                username,
                password,
                role: "admin",
                timezone,
            });
            logger.info("User created!");
        },
    );
