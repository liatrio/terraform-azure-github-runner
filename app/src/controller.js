import Queue from "p-queue";

import { WORKFLOW_QUEUED, WORKFLOW_IN_PROGRESS, WORKFLOW_COMPLETED } from "./constants.js";

import { createRunner, deleteRunner, getRunnerWarmPool } from "./runner.js";
import { getConfigValue } from "./azure/config.js";
import { getLogger } from "./logger.js";

const eventQueue = new Queue({
    concurrency: 1
});

eventQueue.on("error", (error) => {
    const logger = getLogger();

    logger.error(error, "Error processing event");
});

export const processEvent = async (event) => {
    await eventQueue.add(async () => {
         await reconcile(event);
    });
};

export const waitForQueueToDrain = async () => {
    await eventQueue.onIdle();
};

const reconcile = async (event) => {
    const logger = getLogger();

    // if there's no event, we're running `reconcile` as the controller starts
    // we need to get the current state of the world, and make changes if necessary
    const warmPoolDesiredSize = Number(await getConfigValue("github-runner-warm-pool-size"));

    if (!event) {
        const warmPool = await getRunnerWarmPool();


        logger.debug({ warmPool }, "Fetching current warm pool");


        for (let i = 0; i < (warmPoolDesiredSize - warmPool.length); i++) {
            const runnerName = await createRunner();


            logger.info({ runnerName }, "Created runner");
        }

        return;
    }

    logger.debug({ event }, "Received event from GitHub");

    // if a workflow is queued, we need to start a new agent to keep our warm pool at the correct size
    // if we've already hit our max number of VMs, we need to defer this operation until another workflow is completed
    if (event.action === WORKFLOW_QUEUED) {
        const runnerName = await createRunner();

        logger.info({ runnerName }, "Created runner");
    }

    // not sure if anything needs to be done when a workflow is in progress
    if (event.action === WORKFLOW_IN_PROGRESS) {
        // logger.debug("workflow in progress");
    }

    // if a workflow is completed, we need to terminate the VM that was running the job
    // if we've previously deferred a scale-up, now is the time to perform that operation
    if (event.action === WORKFLOW_COMPLETED) {
        await deleteRunner(event.workflow_job.runner_name);

        logger.info({ name: event.workflow_job.runner_name }, "Runner deleted");
    }
};
