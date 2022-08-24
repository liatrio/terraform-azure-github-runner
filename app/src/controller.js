import Queue from "p-queue";

import { WORKFLOW_QUEUED, WORKFLOW_COMPLETED, WORKFLOW_IN_PROGRESS } from "./constants.js";

import { enqueueRunnerForCreation, deleteRunner } from "./runner/index.js";
import { getConfigValue } from "./azure/config.js";
import { getLogger } from "./logger.js";
import {
    getNumberOfRunnersInWarmPoolFromState,
    getRunnerState,
    initializeRunnerState,
    setRunnerAsBusyInState,
} from "./runner/state.js";

const eventQueue = new Queue({
    concurrency: 1,
});

export const processEvent = (event) => {
    const logger = getLogger();

    eventQueue.add(async () => {
        logger.info({ action: event?.action }, "Begin processing event");

        await reconcile(event);

        logger.info({
            action: event?.action,
            state: getRunnerState(),
        }, "Finished processing event");
    }).catch((error) => {
        logger.error(error, "Error processing event");
    });
};

export const waitForEventQueueToDrain = async () => {
    await eventQueue.onIdle();
};

const reconcile = async (event) => {
    const logger = getLogger();
    const warmPoolDesiredSize = Number(await getConfigValue("github-runner-warm-pool-size"));

    if (!event) {
        await initializeRunnerState();

        logger.info(getRunnerState(), "Initial state observed on app start");

        const numberOfRunnersInWarmPool = getNumberOfRunnersInWarmPoolFromState();

        for (let i = 0; i < (warmPoolDesiredSize - numberOfRunnersInWarmPool); i++) {
            const runnerName = await enqueueRunnerForCreation();

            logger.info({ runnerName }, "Enqueued runner to fill warm pool");
        }

        return;
    }

    if (event.action === WORKFLOW_QUEUED) {
        const runnerName = await enqueueRunnerForCreation();

        logger.info({ runnerName }, "Enqueued runner in response to GitHub workflow queued");
    }

    if (event.action === WORKFLOW_IN_PROGRESS) {
        const runnerName = event.workflow_job.runner_name;

        logger.info({ runnerName }, "Workflow run in progress, picked up by runner");

        setRunnerAsBusyInState(runnerName);
    }

    if (event.action === WORKFLOW_COMPLETED) {
        if (!event.workflow_job.runner_name) {
            logger.debug("Not processing event for cancelled workflow run with no runner assigned");

            return;
        }

        logger.info({ runnerName: event.workflow_job.runner_name }, "Enqueueing delete process for runner");

        deleteRunner(event.workflow_job.runner_name);
    }
};
