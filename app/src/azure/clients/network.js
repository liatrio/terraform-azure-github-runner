const { NetworkManagementClient } = require("@azure/arm-network");

const { getAzureCredentials } = require("../credentials");
const { getConfigValue } = require("../config");

let _networkClient;

const createNetworkClient = async () => new NetworkManagementClient(getAzureCredentials(), (await getConfigValue("azure-subscription-id")));

const getNetworkClient = async () => {
    if (!_networkClient) {
        _networkClient = await createNetworkClient();
    }

    return _networkClient;
}

module.exports = {
    getNetworkClient,
}
