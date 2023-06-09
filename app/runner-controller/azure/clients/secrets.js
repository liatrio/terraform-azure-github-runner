import { getAzureCredentials } from "../credentials.js";
import { SecretClient } from "@azure/keyvault-secrets";

const _secretClients = {};

const createSecretClient = (keyVaultUrl) =>
  new SecretClient(keyVaultUrl, getAzureCredentials());

export const getSecretClient = (keyVaultUrl) => {
  if (!_secretClients[keyVaultUrl]) {
    _secretClients[keyVaultUrl] = createSecretClient(keyVaultUrl);
  }

  return _secretClients[keyVaultUrl];
};
