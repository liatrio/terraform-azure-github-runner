import { parseSecretReference } from "@azure/app-configuration";
import { parseKeyVaultSecretIdentifier } from "@azure/keyvault-secrets";

import { getAppConfigurationClient } from "./clients/app-configuration.js";
import { getSecretClient } from "./clients/secrets.js";

const config = {};

export const getConfigValue = async (key) => {
    if (!config[key]) {
        const appConfigClient = getAppConfigurationClient();

        const { value } = await appConfigClient.getConfigurationSetting({
            key,
        });

        config[key] = value;
    }

    return config[key];
};

export const getSecretValue = async (key) => {
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
