import { parentPort } from "node:worker_threads";
import { setTimeout } from "node:timers/promises";

import Queue from "p-queue";

import { reconcile } from "./controller.js";

const queue = new Queue({
    concurrency: 1,
});

const logger = {
    info: (...args) => parentPort.postMessage({
        level: "info",
        args,
    }),
    error: (...args) => parentPort.postMessage({
        level: "error",
        args,
    }),
    debug: (...args) => parentPort.postMessage({
        level: "debug",
        args,
    }),
};

queue.on("error", (error) => {
    logger.error(error, "Error processing event");
});

await queue.add(async () => {
    await reconcile(logger, undefined);
});

let stop = false;

parentPort.on("message", async (event) => {
    if (event === "stop") {
        stop = true;
    } else {
        await queue.add(async () => {
            // logger.debug(event, "begin processing event");

            await reconcile(logger, event);

            // logger.debug(event, "done processing event");
        });
    }
});

// eslint-disable-next-line no-unmodified-loop-condition
while (!stop) {
    await setTimeout(500);
}

await queue.onIdle();

logger.info("worker thread exiting");

parentPort.close();
