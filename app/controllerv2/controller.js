import { deleteVM } from "./azure/index.js";
import { JOB_QUEUED, JOB_COMPLETED, JOB_IN_PROGRESS } from "./constants.js";
import { getLogger } from "./logger.js";
import { enqueueRunner } from "./send.js";

export const processWebhookEvents = async (event) => {
    const logger = getLogger();

    logger.debug({ action: event?.action }, "Begin processing event");

    // When queued events are received, they will be processed and added to the runner queue to handle creation
    if (event?.action === JOB_QUEUED) {
        logger.info("Queued Event Received");
        return await enqueueRunner();
    }

    // When in-progress events are received, they will be marked as busy in state and no longer be considered part of the warm-pool
    if (event?.action === JOB_IN_PROGRESS) {
        const runnerName = event.workflow_job.runner_name;

        logger.info({ runnerName }, "Workflow run in progress, picked up by runner");
        return true;
    }

    if (event?.workflow_job?.labels.length == 0) {
        console.debug("Empty label message found: ", event?.workflow_job?.id )
        return true;
    }

    // When completd events are received, remove the runner from state and delete the VM and associated resources
    if (event?.action === JOB_COMPLETED) {
        if (!event.workflow_job.runner_name) {
            logger.debug("Not processing event for cancelled workflow run with no runner assigned");

            return false;
        }
        
        deleteVM(event.workflow_job.runner_name);
        logger.info({ runnerName: event.workflow_job.runner_name }, "Enqueueing delete process for runner");
        return true;
    }


    
    logger.info({
        action: event?.action,
    }, "Finished processing event");
};
