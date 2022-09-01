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

const validateRequest = async (context, request) => {
    const installationId = await getConfigValue("github-installation-id");

    if (installationId !== request.body.installation?.id?.toString()) {
        return false;
    }

    if (!request.body || !request.body.action || !request.body.workflow_job) {
        return false;
    }

    const allRequestedRunnerLabelsMatch = await validateRequestWorkflowJobLabels(request);

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

const getConfigValue = async (key) => {
    if (!config[key]) {
        const appConfigClient = getAppConfigurationClient();

        const { value } = await appConfigClient.getConfigurationSetting({
            key,
        });

        config[key] = value;
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

if (process.env.AZURE_LOG_LEVEL) {
    setLogLevel(process.env.AZURE_LOG_LEVEL);
}

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

module.exports = async function (context, req) {
    context.log.info("JavaScript HTTP trigger function processed a request.");

    const isValid = await validateRequest(context, req);
    const response = isValid
        ? {
            // status: 200, /* Defaults to 200 */
            body: `Valid webhook message received. Queued [${req.body?.workflow_job?.name}] for processing`,
        }
        : {
            status: 403, /* Defaults to 200 */
            body: "Discarding invalid request",
        };
    if (isValid) {
        const sender = await getWebHookEventsQueueSender();

        await sender.sendMessages({
            body: req.body,
        });
    }

    context.res = response;
};
