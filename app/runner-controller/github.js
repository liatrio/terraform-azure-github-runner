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
    const [org, repo] = await Promise.all([
        getConfigValue("github-organization"),
        getConfigValue("github-repository"),
    ]);

    let req;
    let response;
    if (repo) {
        req = "POST /repos/{org}/{repo}/actions/runners/registration-token";
        response = await octokit.request(req, {
            org,
            repo,
        });
    } else {
        req = "POST /orgs/{org}/actions/runners/registration-token";
        response = await octokit.request(req, {
            org,
        });
    }

    return response.data.token;
};

const listGitHubRunners = async () => {
    const octokit = await getOctoKit();
    const [org, repo, runnerIdentifierLabel] = await Promise.all([
        getConfigValue("github-organization"),
        getConfigValue("github-repository"),
        getConfigValue("github-runner-identifier-label"),
    ]);

    let req;
    let response;
    if (repo) {
        req = "GET /repos/{org}/{repo}/actions/runners";
        response = await octokit.request(req, {
            org,
            repo,
        });
    } else {
        req = "GET /orgs/{org}/actions/runners";
        response = await octokit.request(req, {
            org,
        });
    }

    // only return runners that have our special label
    return response.data.runners.filter(({ labels }) => labels.some(({ name }) => name === runnerIdentifierLabel));
};

export const listIdleGitHubRunners = async () => {
    const runners = await listGitHubRunners();

    return runners.filter((runner) => !runner.busy);
};

export const listBusyGitHubRunners = async () => {
    const runners = await listGitHubRunners();

    return runners.filter((runner) => runner.busy);
};
