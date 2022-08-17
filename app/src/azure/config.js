const { parseSecretReference } = require("@azure/app-configuration");
const { parseKeyVaultSecretIdentifier } = require("@azure/keyvault-secrets");

const { getAppConfigurationClient } = require("./clients/app-configuration");
const { getSecretClient } = require("./clients/secrets");

const config = {};

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

        const secretClient = getSecretClient(vaultUrl);
        const { value } = await secretClient.getSecret(secretName);

        config[key] = value;
    }

    return config[key];
};

module.exports = {
    getConfigValue,
    getSecretValue
};
