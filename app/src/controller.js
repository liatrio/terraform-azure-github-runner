import { WORKFLOW_QUEUED, WORKFLOW_IN_PROGRESS, WORKFLOW_COMPLETED } from "./constants.js";

import { createRunner, deleteRunner } from "../src/runner.js";
import { getRunners } from "../src/github.js";

export const reconcile = async (logger, event) => {
    // if there's no event, we're running `reconcile` as the controller starts
    // we need to get the current state of the world, and make changes if necessary
    const runners = await getRunners(true, true);

    if (!event) {
        return;
    }


    // if a workflow is queued, we need to start a new agent to keep our warm pool at the correct size
    // if we've already hit our max number of VMs, we need to defer this operation until another workflow is completed
    if (event.action === WORKFLOW_QUEUED && runners.length === 0) {
        logger.info("No runner available, about to execute createRunner");
        const name = await createRunner();
        logger.info("Created runner", name);
    }

    // not sure if anything needs to be done when a workflow is in progress
    if (event.action === WORKFLOW_IN_PROGRESS) {
        logger.info("workflow in progress");
    }

    // if a workflow is completed, we need to terminate the VM that was running the job
    // if we've previously deferred a scale-up, now is the time to perform that operation
    if (event.action === WORKFLOW_COMPLETED) {
        logger.info("Workflow completed, about to execute deleteRunner");
        await deleteRunner(event.workflow_job.runner_name);
        logger.info("Runner deleted - ", event.workflow_job.runner_name);
    }
};
