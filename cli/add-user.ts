import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";
import { createUserRecord } from "$repository";

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
      console.log("Creating user...");
      await createUserRecord(name, username, password);
      console.log("User created!");
    },
  );
