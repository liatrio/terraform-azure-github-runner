const { AppConfigurationClient } = require("@azure/app-configuration");

const { getAzureCredentials } = require("../credentials");

let _appConfigClient;

const createAppConfigurationClient = () => new AppConfigurationClient(process.env.AZURE_APP_CONFIGURATION_ENDPOINT, getAzureCredentials());

const getAppConfigurationClient = () => {
    if (!_appConfigClient) {
        _appConfigClient = createAppConfigurationClient();
    }

    return _appConfigClient;
}

module.exports = {
    getAppConfigurationClient,
}
