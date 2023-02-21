import { v4 as uuidv4 } from "uuid";

import { deleteVM } from "./azure/index.js";
import { JOB_QUEUED, JOB_COMPLETED, JOB_IN_PROGRESS } from "./constants.js";
import { getLogger } from "./logger.js";
import { runnerQueueSender } from "./send.js";
import {
    getRunnerState,
    initializeRunnerState,
    removeRunnerFromState,
    setRunnerAsBusyInState,
} from "./runner/state.js";
import { fillWarmPool } from "./runner/index.js";

// eslint-disable-next-line consistent-return
export const processWebhookEvents = async (event) => {
    const logger = getLogger();

    logger.debug({ action: event?.action }, "Begin processing event");

    // When queued events are received, they will be processed and added to the runner queue to handle creation
    if (event?.action === JOB_QUEUED) {
        const runnerName = `runner-${uuidv4().slice(0, 8)}`;

        logger.info("Queued Event Received", runnerName);

        return runnerQueueSender(runnerName, event?.action);
    }

    // When in-progress events are received
    // They will be marked as busy in state and no longer be considered part of the warm-pool
    if (event?.action === JOB_IN_PROGRESS) {
        const runnerName = event.workflow_job.runner_name;

        setRunnerAsBusyInState(event.workflow_job.runner_name);

        logger.info({ runnerName }, "Workflow run in progress, picked up by runner");

        return true;
    }

    if (event?.workflow_job?.labels.length === 0) {
        logger.debug("Empty label message found: ", event?.workflow_job?.id);

        return true;
    }

    // When completd events are received, remove the runner from state and delete the VM and associated resources
    if (event?.action === JOB_COMPLETED) {
        if (!event.workflow_job.runner_name) {
            logger.debug("Not processing event for cancelled workflow run with no runner assigned");

            return false;
        }

        logger.info({ runnerName: event.workflow_job.runner_name }, "Enqueueing delete process for runner");

        return runnerQueueSender(event.workflow_job.runner_name, event?.action);
    }

    logger.info({
        action: event?.action,
    }, "Finished processing event");
};

export const processStateQueueEvents = async (name) => {
    const logger = getLogger();

    logger.debug({ action: name }, "Begin state queue");

    if (name.length > 0) {
        await deleteVM(name);
        removeRunnerFromState(name);

        return true;
    }

    logger.warn({ runnerName: name }, "Deletion failed");

    return false;
};

export const reconcile = async () => {
    const logger = getLogger();

    await initializeRunnerState();
    logger.info(getRunnerState(), "Initial state observed on app start");
    await fillWarmPool();

    logger.info({
        action: "reconcile",
        state: getRunnerState(),
    }, "Finished processing event");
};
