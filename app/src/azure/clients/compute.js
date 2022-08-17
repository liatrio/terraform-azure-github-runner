const { ComputeManagementClient } = require("@azure/arm-compute");

const { getAzureCredentials } = require("../credentials");
const { getConfigValue } = require("../config");

let _computeClient;

const createComputeClient = async () => new ComputeManagementClient(getAzureCredentials(), (await getConfigValue("azure-subscription-id")));

const getComputeClient = async () => {
    if (!_computeClient) {
        _computeClient = await createComputeClient();
    }

    return _computeClient;
}

module.exports = {
    getComputeClient
};
