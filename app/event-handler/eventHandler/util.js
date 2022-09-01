const { AzureCliCredential, ManagedIdentityCredential, EnvironmentCredential, ChainedTokenCredential } = require("@azure/identity");
const { setLogLevel } = require("@azure/logger");
const { AppConfigurationClient, parseSecretReference } = require("@azure/app-configuration");
const { SecretClient, parseKeyVaultSecretIdentifier } = require("@azure/keyvault-secrets");
const { ServiceBusClient } = require("@azure/service-bus");
const crypto = require("node:crypto");

const config = {};
const _secretClients = {};

let _appConfigClient;
let _azureCredentials;
let _serviceBusClient;

const defaultRunnerLabels = new Set(["self-hosted", "linux", "windows", "macos", "x64", "arm", "arm64"]);

if (process.env.AZURE_LOG_LEVEL) {
    setLogLevel(process.env.AZURE_LOG_LEVEL);
}

const validateRequest = async (context, request) => {
    context.log.info("Starting validateRequest with request", request);

    let installationId;
    try {
        context.log.info("App Config Endpoint from AZURE_APP_CONFIGURATION_ENDPOINT env var", process.env.AZURE_APP_CONFIGURATION_ENDPOINT);
        installationId = await getConfigValue("github-installation-id", context);
        context.log.info("Retrieved installationId from config", installationId);
    } catch (error) {
        context.log.info("Failure retrieving config value to try to match installation id");
        context.log.info("Exception", error);
    }

    if (installationId !== request.body?.installation?.id?.toString()) {
        context.log.info("Installation ID doesn't match config");

        return false;
    }

    if (!request.body || !request.body.action || !request.body.workflow_job) {
        context.log.info("Lacking body, body.action, or body.workflow_job");

        return false;
    }

    const allRequestedRunnerLabelsMatch = await validateRequestWorkflowJobLabels(request);
    context.log.info("Checked runner label match, with result", allRequestedRunnerLabelsMatch);

    if (!allRequestedRunnerLabelsMatch) {
        context.log.verbose({
            workflowJobId: request.body.workflow_job.id,
            workflowJobLabels: request.body.workflow_job.labels,
        }, "Requested labels do not match labels of self-hosted runners");

        return false;
    }

    return validateRequestSignature(request);
};

const validateRequestWorkflowJobLabels = async (request) => {
    const githubRunnerLabelsString = await getConfigValue("github-runner-labels");
    const githubRunnerLabels = new Set(JSON.parse(githubRunnerLabelsString));
    const { labels } = request.body.workflow_job;

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
        .update(JSON.stringify(request.body))
        .digest("hex")}`;

    return expectedSignature === actualSignature;
};

const createServiceBusClient = async () => new ServiceBusClient(
    (await getConfigValue("azure-service-bus-namespace-uri")),
    getAzureCredentials(),
);

const getServiceBusClient = async () => {
    if (!_serviceBusClient) {
        _serviceBusClient = await createServiceBusClient();
    }

    return _serviceBusClient;
};

const getConfigValue = async (key, context = undefined) => {
    if (!config[key]) {
        if (context) {
            context.log.info("Starting to getConfigValue with key", key);
        }

        const appConfigClient = getAppConfigurationClient();
        if (context) {
            context.log.info("Got appConfigClient");
        }

        const { value } = await appConfigClient.getConfigurationSetting({
            key,
        });
        if (context) {
            context.log.info("Got value back from config", value);
        }

        config[key] = value;
    }

    if (context) {
        context.log.info("Returning config[key]", config[key]);
    }

    return config[key];
};

const getSecretValue = async (key) => {
    if (!config[key]) {
        const appConfigClient = getAppConfigurationClient();

        const response = await appConfigClient.getConfigurationSetting({
            key,
        });

        const secretReference = parseSecretReference(response);
        const { name: secretName, vaultUrl } = parseKeyVaultSecretIdentifier(secretReference.value.secretId);

        const secretClient = getSecretClient(vaultUrl);
        const { value } = await secretClient.getSecret(secretName);

        config[key] = value;
    }

    return config[key];
};

const createSecretClient = (keyVaultUrl) => new SecretClient(keyVaultUrl, getAzureCredentials());

const getSecretClient = (keyVaultUrl) => {
    if (!_secretClients[keyVaultUrl]) {
        _secretClients[keyVaultUrl] = createSecretClient(keyVaultUrl);
    }

    return _secretClients[keyVaultUrl];
};

const createAppConfigurationClient = () => new AppConfigurationClient(
    process.env.AZURE_APP_CONFIGURATION_ENDPOINT,
    getAzureCredentials(),
);

const getAppConfigurationClient = () => {
    if (!_appConfigClient) {
        _appConfigClient = createAppConfigurationClient();
    }

    return _appConfigClient;
};

const getAzureCredentials = () => {
    if (!_azureCredentials) {
        const azureCliCredential = new AzureCliCredential();
        const environmentCredential = new EnvironmentCredential();
        const managedIdentityCredential = new ManagedIdentityCredential();

        _azureCredentials = new ChainedTokenCredential(
            azureCliCredential,
            environmentCredential,
            managedIdentityCredential,
        );
    }

    return _azureCredentials;
};

const getWebHookEventsQueueSender = async () => {
    const serviceBusClient = await getServiceBusClient();
    const queueName = await getConfigValue("azure-github-webhook-events-queue");

    return serviceBusClient.createSender(queueName);
};

module.exports = {
    validateRequest,
    getWebHookEventsQueueSender,
};
