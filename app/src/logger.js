import pino from "pino";

let _logger;

export const getLogger = () => {
    if (!_logger) {
        _logger = pino({
            level: "debug",
            transport: process.env.NODE_ENV === "production"
                ? {}
                : {
                    target: "pino-pretty",
                },
        });
    }

    return _logger;
};
