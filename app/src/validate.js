import crypto from "node:crypto";

import { getConfigValue, getSecretValue } from "./azure/config.js";
import { getLogger } from "./logger.js";

const defaultRunnerLabels = new Set(["self-hosted", "linux", "windows", "macos", "x64", "arm", "arm64"]);

export const validateRequest = async (request) => {
    const logger = getLogger();
    const installationId = await getConfigValue("github-installation-id");

    if (installationId !== request.payload.installation?.id?.toString()) {
        return false;
    }

    if (!request.payload || !request.payload.action || !request.payload.workflow_job) {
        return false;
    }

    const allRequestedRunnerLabelsMatch = await validateRequestWorkflowJobLabels(request);

    if (!allRequestedRunnerLabelsMatch) {
        logger.debug({
            workflowJobId: request.payload.workflow_job.id,
            workflowJobLabels: request.payload.workflow_job.labels,
        }, "Requested labels do not match labels of self-hosted runners");

        return false;
    }

    return validateRequestSignature(request);
};

const validateRequestWorkflowJobLabels = async (request) => {
    const githubRunnerLabelsString = await getConfigValue("github-runner-labels");
    const githubRunnerLabels = new Set(JSON.parse(githubRunnerLabelsString));
    const { labels } = request.payload.workflow_job;

    return labels.every((label) => defaultRunnerLabels.has(label.toLowerCase()) || githubRunnerLabels.has(label));
};

const validateRequestSignature = async (request) => {
    const webhookSecret = await getSecretValue("github-webhook-secret");
    const actualSignature = request.headers["x-hub-signature-256"];

    if (!actualSignature) {
        return false;
    }

    const expectedSignature = `sha256=${crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(request.payload))
        .digest("hex")}`;

    return expectedSignature === actualSignature;
};
