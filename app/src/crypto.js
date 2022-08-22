import crypto from "node:crypto";

import { getSecretValue } from "./azure/config.js";

export const verifyRequestSignature = async (request) => {
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
