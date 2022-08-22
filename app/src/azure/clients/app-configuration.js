import { AppConfigurationClient } from "@azure/app-configuration";

import { getAzureCredentials } from "../credentials.js";

let _appConfigClient;

const createAppConfigurationClient = () => new AppConfigurationClient(
    process.env.AZURE_APP_CONFIGURATION_ENDPOINT,
    getAzureCredentials(),
);

export const getAppConfigurationClient = () => {
    if (!_appConfigClient) {
        _appConfigClient = createAppConfigurationClient();
    }

    return _appConfigClient;
};
