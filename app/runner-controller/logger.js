import pino from "pino";

let _logger;

export const getLogger = () => {
    if (!_logger) {
        _logger = pino({
            level: process.env.LOG_LEVEL || "info",
            transport: process.env.NODE_ENV === "production"
                ? undefined
                : { target: "pino-pretty",
                    colorize: true,
                    options: {
                        ignore: "pid,hostname",
                        translateTime: true,
                    } },
        });
    }

    return _logger;
};
