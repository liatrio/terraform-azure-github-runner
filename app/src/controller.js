import {WORKFLOW_QUEUED, WORKFLOW_IN_PROGRESS, WORKFLOW_COMPLETED} from "./constants.js";

export const reconcile = async (logger, event) => {
    // if there's no event, we're running `reconcile` as the controller starts
    // we need to get the current state of the world, and make changes if necessary
    if (!event) {
        return;
    }

    // if a workflow is queued, we need to start a new agent to keep our warm pool at the correct size
    // if we've already hit our max number of VMs, we need to defer this operation until another workflow is completed
    if (event.action === WORKFLOW_QUEUED) {

    }

    // not sure if anything needs to be done when a workflow is in progress
    if (event.action === WORKFLOW_IN_PROGRESS) {

    }

    // if a workflow is completed, we need to terminate the VM that was running the job
    // if we've previously deferred a scale-up, now is the time to perform that operation
    if (event.action === WORKFLOW_COMPLETED) {

    }
};
