import pino from "pino";

let _logger;

export const getLogger = () => {
    if (!_logger) {
        _logger = pino({
            level: process.env.LOG_LEVEL || "debug",
            transport: process.env.NODE_ENV === "production"
                ? undefined
                : { target: "pino-pretty" },
        });
    }

    return _logger;
};
