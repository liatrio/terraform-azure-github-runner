import Hapi from "@hapi/hapi";
import Boom from "@hapi/boom";

import { validateRequest } from "./validate.js";
import { processEvent, waitForEventQueueToDrain } from "./controller.js";
import { getLogger } from "./logger.js";

const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: "0.0.0.0",
});

const logger = getLogger();

server.route({
    method: ["GET", "POST"],
    path: "/",
    handler: async (request) => {
        const isValid = await validateRequest(request);

        if (!isValid) {
            throw Boom.forbidden();
        }

        processEvent(request.payload);

        return "ok";
    },
});

processEvent(undefined);

await server.start();

logger.info(server.info, "Server started");

["SIGINT", "SIGTERM"].forEach((signal) => {
    process.on(signal, async () => {
        logger.info(`Caught ${signal}, exiting...`);

        await server.stop();

        logger.info("Server stopped, waiting for queue to drain...");

        await waitForEventQueueToDrain();

        logger.info("Done");
    });
});
