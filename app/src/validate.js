import crypto from "node:crypto";

import { getConfigValue, getSecretValue } from "./azure/config.js";

export const validateRequest = async (request) => {
    const installationId = await getConfigValue("github-installation-id");

    if (installationId !== request.payload.installation.id.toString()) {
        return false;
    }

    if (!request.payload || !request.payload.action || !request.payload.workflow_job) {
        return false;
    }

    return validateRequestSignature(request);
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
