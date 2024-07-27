import { log } from "$backend/deps.ts";
import { loadEnvironment } from "$backend/env.ts";

loadEnvironment();

let loggerName: string = "default";

export const setLoggerName = (name: string) => {
    loggerName = name;
};

const formatMessage: log.FormatterFunction = (
    { levelName, datetime, msg, args },
) => {
    const [params] = args.length > 0 ? args : [{}];

    for (
        const [key, value] of Object.entries(params as Record<string, string>)
    ) {
        msg = msg.replaceAll(`{${key}}`, value);
    }

    return `[${loggerName}|${levelName}|${datetime.toISOString()}]: ${msg}`;
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

log.setup({
    loggers: {
        default: {
            level: loggingLevel,
            handlers: ["default"],
        },
        worker: {
            level: loggingLevel,
            handlers: ["default"],
        },
        cli: {
            level: loggingLevel,
            handlers: ["default"],
        },
    },
    handlers: logHandlers,
});

export const logger = log.getLogger();
