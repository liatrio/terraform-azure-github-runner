import { WORKFLOW_QUEUED, WORKFLOW_COMPLETED, WORKFLOW_IN_PROGRESS } from "./constants.js";
import { getLogger } from "./logger.js";

export const processWebhookEvents = async (event) => {
    const logger = getLogger();

    logger.debug({ action: event?.action }, "Begin processing event");

    // When queued events are received, they will be processed and added to the runner queue to handle creation
    if (event?.action === WORKFLOW_QUEUED) {
        logger.info("Queued Event Received");

        sendtoq
        processmessage
    }

    // When in-progress events are received, they will be marked as busy in state and no longer be considered part of the warm-pool
    if (event?.action === WORKFLOW_IN_PROGRESS) {
        const runnerName = event.workflow_job.runner_name;

        logger.info({ runnerName }, "Workflow run in progress, picked up by runner");
    }

    // When completd events are received, remove the runner from state and delete the VM and associated resources
    if (event?.action === WORKFLOW_COMPLETED) {
        if (!event.workflow_job.runner_name) {
            logger.debug("Not processing event for cancelled workflow run with no runner assigned");

            return;
        }

        logger.info({ runnerName: event.workflow_job.runner_name }, "Enqueueing delete process for runner");
    }

    logger.info({
        action: event?.action,
    }, "Finished processing event");
};
