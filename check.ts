import { dirname } from "$std/path/dirname.ts";

const ignore = [
    "_fresh",
    "node_modules",
    ".git",
    ".vscode",
    ".github",
    ".zed",
    "backups",
    "temp",
    "static",
];

const variations: string[] = [
    "/**/*.ts",
    "/**/*.tsx",
    "/*.ts",
    "/*.tsx",
];

const checkUrl = dirname(import.meta.url);

for await (const entry of Deno.readDir(".")) {
    if (!entry.isDirectory || ignore.includes(entry.name)) {
        continue;
    }

    console.log(`deno check ${entry.name}/**/*/{ts, tsx}...`);

    const promises = [];

    for (const variation of variations) {
        promises.push((async () => {
            const command = new Deno.Command("sh", {
                args: ["-c", `deno check ${entry.name}${variation}`],
                stdin: "inherit",
                stdout: "inherit",
                stderr: "piped",
            });

            const removeLine =
                `Module not found "${checkUrl}/${entry.name}${variation}"`;

            const { stderr } = await command.output();
            if (stderr.byteLength > 0) {
                const text = new TextDecoder().decode(stderr)
                    .replace(/\r/g, "")
                    .split("\n")
                    .filter((line) => {
                        if (line.trim().length === 0) {
                            return false;
                        }

                        if (
                            line.includes(
                                removeLine,
                            )
                        ) {
                            return false;
                        }
                        return true;
                    });

                if (text.length > 0) {
                    console.log(text.join("\n"));
                    Deno.exit(1);
                }
            }
        })());
    }

    await Promise.all(promises);
}

console.log("Done!");
