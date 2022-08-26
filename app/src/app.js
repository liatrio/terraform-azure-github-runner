import Hapi from "@hapi/hapi";
import Boom from "@hapi/boom";

import { validateRequest } from "./validate.js";
import { processEvent, reconcile, waitForEventQueueToDrain } from "./controller.js";
import { getLogger } from "./logger.js";
import { processRunnerQueue, stopRunnerQueue } from "./runner/index.js";

const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: "0.0.0.0",
});

const logger = getLogger();

if (!process.env.AZURE_APP_CONFIGURATION_ENDPOINT) {
    const error = new Error("AZURE_APP_CONFIGURATION_ENDPOINT environment variable is required");
    logger.error(error);
    throw error;
}

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

await reconcile(undefined);

processRunnerQueue().catch((error) => {
    logger.error(error);
});

await server.start();

logger.info(server.info, "Server started");

["SIGINT", "SIGTERM"].forEach((signal) => {
    process.on(signal, async () => {
        logger.info(`Caught ${signal}, exiting...`);

        await server.stop();

        logger.info("Server stopped, waiting for queue to drain...");

        await stopRunnerQueue();
        await waitForEventQueueToDrain();

        logger.info("Done");

        process.exit(0);
    });
});
