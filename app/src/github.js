const { Octokit } = require("@octokit/core");
const { createAppAuth } = require("@octokit/auth-app");
const { getConfigValue, getSecretValue } = require("./azure/config");

let _octokit;

const createOctokit = async () => {
    const [installationId, appId, privateKey, clientId, clientSecret] = await Promise.all([
        getConfigValue("github-installation-id"),
        getConfigValue("github-app-id"),
        getSecretValue("github-private-key"),
        getConfigValue("github-client-id"),
        getSecretValue("github-client-secret"),
    ]);

    return new Octokit({
        authStrategy: createAppAuth,
        auth: {
            installationId,
            appId,
            privateKey,
            clientId,
            clientSecret,
        }
    });
};

const getOctoKit = async () => {
    if (!_octokit) {
        _octokit = await createOctokit();
    }

    return _octokit;
}

const getRegistrationToken = async () => {
    const octokit = await getOctoKit();
    const org = await getConfigValue("github-organization");

    const response = await octokit.request('POST /orgs/{org}/actions/runners/registration-token', {
        org,
    });

    console.log("response", response);
}

module.exports = {
    getRegistrationToken
};
