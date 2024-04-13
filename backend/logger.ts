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

const logToFile = Deno.env.get("LOG_TO_FILE") ?? null;

let fileHandler: log.FileHandler | null = null;

if (logToFile) {
    fileHandler = new log.FileHandler(loggingLevel, {
        filename: logToFile,
        mode: "a",
        formatter: (record) =>
            `${formatMessage(record)}||${JSON.stringify(record)}`,
    });
}

const logHandlers = logToFile ? ["default", "file"] : ["default"];

log.setup({
    loggers: {
        default: {
            level: loggingLevel,
            handlers: logHandlers,
        },
        worker: {
            level: loggingLevel,
            handlers: logHandlers,
        },
        cli: {
            level: loggingLevel,
            handlers: ["default"],
        },
    },
    handlers: {
        default: new log.ConsoleHandler(loggingLevel, {
            useColors: showLogColors !== null
                ? !!parseInt(showLogColors, 10)
                : Deno.stdin.isTerminal(),
            formatter: formatMessage,
        }),
        ...(logToFile ? { file: fileHandler! } : {}),
    },
});

export const cliLogger = log.getLogger("cli");
export const workerLogger = log.getLogger("worker");
export const webLogger = log.getLogger();
