import pino from "pino";

let _logger;

export const getLogger = () => {
    if (!_logger) {
        _logger = pino({
            level: process.env.NODE_ENV === "production"
                ? "info"
                : "debug",
            transport: {
                target: "pino-pretty",
            },
        });
    }

    return _logger;
};
