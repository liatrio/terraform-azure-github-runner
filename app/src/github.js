import { Octokit } from "@octokit/core";
import { createAppAuth } from "@octokit/auth-app";
import { getConfigValue, getSecretValue } from "./azure/config.js";

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
        },
    });
};

const getOctoKit = async () => {
    if (!_octokit) {
        _octokit = await createOctokit();
    }

    return _octokit;
};

export const createRegistrationToken = async () => {
    const octokit = await getOctoKit();
    const org = await getConfigValue("github-organization");

    const response = await octokit.request("POST /orgs/{org}/actions/runners/registration-token", {
        org,
    });

    return response.data.token;
};

export const getRunners = async (idle = true, online = true) => {
    const octokit = await getOctoKit();
    const [org, runnerIdentifierLabel] = await Promise.all([
        getConfigValue("github-organization"),
        getConfigValue("github-runner-identifier-label"),
    ]);

    const response = await octokit.request("GET /orgs/{org}/actions/runners", {
        org,
    });

    return response.data.runners.filter((runner) => {
        if ((runner.status === "online") !== online) {
            return false;
        }

        if (runner.busy === idle) {
            return false;
        }

        return runner.labels.some((label) => label.name === runnerIdentifierLabel);
    });
};
