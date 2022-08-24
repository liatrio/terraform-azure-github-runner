import { AzureCliCredential, ManagedIdentityCredential, ChainedTokenCredential } from "@azure/identity";

let _azureCredentials;

export const getAzureCredentials = () => {
    if (!_azureCredentials) {
        const azureCliCredential = new AzureCliCredential();
        const managedIdentityCredential = new ManagedIdentityCredential();

        _azureCredentials = new ChainedTokenCredential(azureCliCredential, managedIdentityCredential);
    }

    return _azureCredentials;
};
