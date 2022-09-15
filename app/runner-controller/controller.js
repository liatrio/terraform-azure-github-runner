import { WORKFLOW_QUEUED, WORKFLOW_COMPLETED, WORKFLOW_IN_PROGRESS } from "./constants.js";

import { enqueueRunnerForCreation, deleteRunner, fillWarmPool } from "./runner/index.js";
import { getLogger } from "./logger.js";
import { getRunnerState, initializeRunnerState, setRunnerAsBusyInState } from "./runner/state.js";
import { getServiceBusClient } from "./azure/clients/service-bus.js";

const eventQueue = getServiceBusClient({
    concurrency: 1,
});

export const processEvent = (event) => {
    const logger = getLogger();

    eventQueue.add(async () => {
        await reconcile(event);
    }).catch((error) => {
        logger.error(error, "Error processing event");
    });
};

export const waitForEventQueueToDrain = async () => {
    await eventQueue.onIdle();
};

export const reconcile = async (event) => {
    const logger = getLogger();

    if (!event) {
        await initializeRunnerState();

        logger.info(getRunnerState(), "Initial state observed on app start");

        await fillWarmPool();
    }

    logger.info({ action: event?.action }, "Begin processing event");

    if (event?.action === WORKFLOW_QUEUED) {
        const runnerName = await enqueueRunnerForCreation();

        logger.info({ runnerName }, "Enqueued runner in response to GitHub workflow queued");
    }

    if (event?.action === WORKFLOW_IN_PROGRESS) {
        const runnerName = event.workflow_job.runner_name;

        logger.info({ runnerName }, "Workflow run in progress, picked up by runner");

        setRunnerAsBusyInState(runnerName);
    }

    if (event?.action === WORKFLOW_COMPLETED) {
        if (!event.workflow_job.runner_name) {
            logger.debug("Not processing event for cancelled workflow run with no runner assigned");

            return;
        }

        logger.info({ runnerName: event.workflow_job.runner_name }, "Enqueueing delete process for runner");

        deleteRunner(event.workflow_job.runner_name);
    }

    logger.info({
        action: event?.action,
        state: getRunnerState(),
    }, "Finished processing event");
};
