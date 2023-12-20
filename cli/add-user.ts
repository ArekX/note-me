import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";
import { checkIfUserExists, createUserRecord } from "$repository";

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
        console.log(`User with username '${username}' already exists!`);
        return;
      }

      console.log("Creating user...");
      console.log("Name:", name);
      console.log("Username:", username);
      console.log("Password:", password);
      await createUserRecord({ name, username, password });
      console.log("User created!");
    },
  );
