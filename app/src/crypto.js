const crypto = require("node:crypto");

const { getSecretValue } = require("./azure/config");

const verifyRequestSignature = async (request) => {
    const webhookSecret = await getSecretValue("github-webhook-secret");
    const actualSignature = request.headers["x-hub-signature-256"];

    if (!actualSignature) {
        return false;
    }

    const expectedSignature = "sha256=" + crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(request.payload))
        .digest("hex");

    return expectedSignature === actualSignature;
};

module.exports = {
    verifyRequestSignature
};
