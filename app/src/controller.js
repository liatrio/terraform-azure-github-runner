import Queue from "p-queue";

import { WORKFLOW_QUEUED, WORKFLOW_COMPLETED, WORKFLOW_IN_PROGRESS } from "./constants.js";

import { createRunner, deleteRunner, getRunnerWarmPool } from "./runner.js";
import { getConfigValue } from "./azure/config.js";
import { getLogger } from "./logger.js";
import { listBusyGitHubRunners } from "./github.js";

const eventQueue = new Queue({
    concurrency: 1,
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

const managedRunners = new Set();

export const waitForQueueToDrain = async () => {
    await eventQueue.onIdle();
};

const reconcile = async (event) => {
    const logger = getLogger();

    // if there's no event, we're running `reconcile` as the controller starts
    // we need to get the current state of the world, and make changes if necessary
    const warmPoolDesiredSize = Number(await getConfigValue("github-runner-warm-pool-size"));
    const runnerMaxCount = Number(await getConfigValue("github-runner-maximum-count"));

    if (!event) {
        const warmPool = await getRunnerWarmPool();

        logger.debug({ warmPool }, "Fetched current warm pool");

        for (let i = 0; i < (warmPoolDesiredSize - warmPool.length); i++) {
            const runnerName = await createRunner();

            logger.info({ runnerName }, "Created runner to fill warm pool");

            managedRunners.add(runnerName);
        }

        const busyRunners = await listBusyGitHubRunners();

        logger.debug({ busyRunners }, "Fetched busy runners");

        busyRunners.forEach((runner) => {
            managedRunners.add(runner.name);
        });

        warmPool.forEach((runner) => {
            managedRunners.add(runner);
        });

        logger.info({ managedRunners: [...managedRunners] }, "Finished initializing state");

        return;
    }

    logger.debug({ action: event.action }, "Processing event");

    // if a workflow is queued, we need to start a new agent to keep our warm pool at the correct size
    // if we've already hit our max number of VMs, we need to defer this operation until another workflow is completed
    if (event.action === WORKFLOW_QUEUED) {
        if (managedRunners.size >= runnerMaxCount) {
            logger.info({ managedRunners: [...managedRunners] }, "Reached maximum allowed runner count, deferring runner creation to next workflow completion");

            return;
        }

        const runnerName = await createRunner();

        logger.info({ runnerName }, "Created runner in response to workflow queued");
        managedRunners.add(runnerName);
    }

    if (event.action === WORKFLOW_IN_PROGRESS) {
        logger.info({ runnerName: event.workflow_job.runner_name }, "Workflow run in progress, picked up by runner");
    }

    // if a workflow is completed, we need to terminate the VM that was running the job
    // if we've previously deferred a scale-up, now is the time to perform that operation
    if (event.action === WORKFLOW_COMPLETED) {
        // check if pool size is at max, and if so, create a replacement runner for the one being deleted
        // but don't create a replacement runner if we're already at our desired warm pool size

        if (!event.workflow_job.runner_name) {
            logger.debug("Not processing event for cancelled workflow run with no runner assigned");

            return;
        }

        if (managedRunners.size >= runnerMaxCount) {
            const warmPool = await getRunnerWarmPool();
            if (warmPool.length < warmPoolDesiredSize) {
                const runnerName = await createRunner();
                logger.info({ runnerName }, "Created max count replacement runner");
                managedRunners.add(runnerName);
            } else {
                logger.info({ warmPool }, "Not creating a replacement runner, warm pool desired size has been met");
            }
        }

        managedRunners.delete(event.workflow_job.runner_name);

        logger.info({ runnerName: event.workflow_job.runner_name }, "Queueing delete process for runner");

        // we're using .then() / .catch() syntax here because we don't want our reconcile loop
        // to have to wait for this promise to finish before allowing a new event to process
        deleteRunner(event.workflow_job.runner_name)
            .then(() => {
                logger.info({ runnerName: event.workflow_job.runner_name }, "Runner successfully deleted");
            })
            .catch((error) => {
                logger.error(error);
            });
    }
};
