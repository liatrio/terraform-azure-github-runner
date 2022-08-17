const { SecretClient } = require("@azure/keyvault-secrets");

const { getAzureCredentials } = require("../credentials");

let _secretClients = {};

const createSecretClient = (keyVaultUrl) => new SecretClient(keyVaultUrl, getAzureCredentials());

const getSecretClient = (keyVaultUrl) => {
    if (!_secretClients[keyVaultUrl]) {
        _secretClients[keyVaultUrl] = createSecretClient(keyVaultUrl);
    }

    return _secretClients[keyVaultUrl];
}

module.exports = {
    getSecretClient,
};
