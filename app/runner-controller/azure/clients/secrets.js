import { SecretClient } from "@azure/keyvault-secrets";

import { getAzureCredentials } from "../credentials.js";

const _secretClients = {};

const createSecretClient = (keyVaultUrl) => new SecretClient(keyVaultUrl, getAzureCredentials());

export const getSecretClient = (keyVaultUrl) => {
    if (!_secretClients[keyVaultUrl]) {
        _secretClients[keyVaultUrl] = createSecretClient(keyVaultUrl);
    }

    return _secretClients[keyVaultUrl];
};
