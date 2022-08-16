const { AppConfigurationClient, parseSecretReference } = require("@azure/app-configuration");
const { parseKeyVaultSecretIdentifier, SecretClient } = require("@azure/keyvault-secrets");
const { getAzureCredentials } = require("./credentials");

let _appConfigClient;

const config = {};

const createSecretClient = (keyVaultUrl) => new SecretClient(keyVaultUrl, getAzureCredentials());

const createAppConfigurationClient = () => new AppConfigurationClient(process.env.AZURE_APP_CONFIGURATION_ENDPOINT, getAzureCredentials());

const getAppConfigurationClient = () => {
    if (!_appConfigClient) {
        _appConfigClient = createAppConfigurationClient();
    }

    return _appConfigClient;
}

const getConfigValue = async (key) => {
    if (!config[key]) {
        const appConfigClient = getAppConfigurationClient();

        const {value} = await appConfigClient.getConfigurationSetting({
            key
        });

        config[key] = value;
    }

    return config[key];
};

const getSecretValue = async (key) => {
    if (!config[key]) {
        const appConfigClient = getAppConfigurationClient();

        const response = await appConfigClient.getConfigurationSetting({
            key
        });

        const secretReference = parseSecretReference(response);
        const { name: secretName, vaultUrl } = parseKeyVaultSecretIdentifier(secretReference.value.secretId);

        const secretClient = createSecretClient(vaultUrl);
        const { value } = await secretClient.getSecret(secretName);

        config[key] = value;
    }

    return config[key];
};

module.exports = {
    getConfigValue,
    getSecretValue
};
