import { getLogger } from "./logger.js";
import { webhookEventReceiver, cleanup } from "./receiver.js";

const logger = getLogger();

if (!process.env.AZURE_APP_CONFIGURATION_ENDPOINT) {
    const error = new Error("AZURE_APP_CONFIGURATION_ENDPOINT environment variable is required");
    logger.error(error);
    throw error;
}

webhookEventReceiver().catch((err) => {
    console.log("Error occurred: ", err);
    process.exit(1);
});

["SIGINT", "SIGTERM"].forEach((signal) => {
    process.on(signal, async () => {
        logger.info(`Caught ${signal}, exiting...`);

        logger.info("Waiting for queue to drain...");

        cleanup();
        await stopRunnerQueue();
        await waitForEventQueueToDrain();

        logger.info("Done");

        process.exit(0);
    });
});
