import { reconcile } from "./controller.js";
import { processRunnerQueue, stopRunnerQueue } from "./runner/index.js";
import { getLogger } from "./logger.js";
import { processWebhookEventQueue, cleanup as receiverCleanup } from "./receiver.js";
import { processStateEventQueue as processStateEventQueue, cleanup as stateReceiverCleanup} from "./state-receiver.js";

const logger = getLogger();

if (!process.env.AZURE_APP_CONFIGURATION_ENDPOINT) {
    const error = new Error("AZURE_APP_CONFIGURATION_ENDPOINT environment variable is required");
    logger.error(error);
    throw error;
}

// On initial launch, create warm pool
await reconcile();

processRunnerQueue().catch((error) => {
    logger.error(error);
    process.exit(1);
});

processWebhookEventQueue().catch((err) => {
    logger.error("Error occurred: ", err);
    process.exit(1);
});

processStateEventQueue().catch((err) => {
    logger.error("Error occurred: ", err);
    process.exit(1);
});

await new Promise((resolve) => {
    ["SIGINT", "SIGTERM"].forEach((signal) => {
        process.on(signal, async () => {
            logger.info(`Caught ${signal}, exiting...`);
    
            logger.info("Waiting for queue to drain...");
    
            receiverCleanup();
            stateReceiverCleanup();
            await stopRunnerQueue();
            await waitForEventQueueToDrain();
    
            logger.info("Done");

            resolve();
        });
    });
});

process.exit(0);
