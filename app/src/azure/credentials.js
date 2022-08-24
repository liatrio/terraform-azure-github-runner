import { AzureCliCredential, ManagedIdentityCredential, EnvironmentCredential, ChainedTokenCredential } from "@azure/identity";

let _azureCredentials;

export const getAzureCredentials = () => {
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
