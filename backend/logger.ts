import "$std/dotenv/load.ts";
import { log } from "$backend/deps.ts";

const formatMessage: log.FormatterFunction = (
    { loggerName, levelName, datetime, msg, args },
) => {
    const [params] = args.length > 0 ? args : [{}];

    for (
        const [key, value] of Object.entries(params as Record<string, string>)
    ) {
        msg = msg.replaceAll(`{${key}}`, value);
    }

    return `[${
        loggerName === "default" ? "webserver" : loggerName
    }|${levelName}|${datetime.toISOString()}]: ${msg}`;
};

const loggingLevel: log.LevelName =
    (Deno.env.get("LOGGING_LEVEL") || "DEBUG") as log.LevelName;

const showLogColors = Deno.env.get("SHOW_LOG_COLORS") ?? null;

const logHandlers: log.LogConfig["handlers"] = {
    default: new log.ConsoleHandler(loggingLevel, {
        useColors: showLogColors !== null
            ? !!parseInt(showLogColors, 10)
            : Deno.stdin.isTerminal(),
        formatter: formatMessage,
    }),
};

const logToFile = Deno.env.get("LOG_TO_FILE") ?? null;

let fileHandler: log.FileHandler | null = null;
const logTargets = ["default"];

if (logToFile) {
    fileHandler = new log.FileHandler(loggingLevel, {
        filename: logToFile,
        mode: "a",
        formatter: (record) => {
            return `${formatMessage(record)}||${
                JSON.stringify({
                    ...record,
                    args: record.args,
                })
            }`;
        },
    });
    logTargets.push("file");
    logHandlers.file = fileHandler;
}

log.setup({
    loggers: {
        default: {
            level: loggingLevel,
            handlers: logTargets,
        },
        worker: {
            level: loggingLevel,
            handlers: logTargets,
        },
        cli: {
            level: loggingLevel,
            handlers: logTargets,
        },
    },
    handlers: logHandlers,
});

export const flushFileLogs = () => fileHandler?.flush();
export const cliLogger = log.getLogger("cli");
export const workerLogger = log.getLogger("worker");
export const webLogger = log.getLogger();
