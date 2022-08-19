import { parentPort } from "node:worker_threads";
import { setTimeout } from "node:timers/promises";

import Queue from "p-queue";

import { reconcile } from "./controller.js";

const queue = new Queue({
    concurrency: 1
});

const logger = {
    info: (message, payload) => parentPort.postMessage({ info: { message, payload } }),
    error: (message, payload) => parentPort.postMessage({ error: { message, payload } }),
}

await queue.add(async () => {
    await reconcile(logger, undefined);
});

let stop = false;

parentPort.on("message", async (event) => {
    if (event === "stop") {
        stop = true;
    } else {
        await queue.add(async () => {
            logger.info("begin processing event", event);

            await reconcile(logger, event);

            logger.info("done processing event", event);
        });
    }
});

while (!stop) {
    await setTimeout(500);
}

await queue.onIdle();

logger.info("worker thread exiting");

parentPort.close();
