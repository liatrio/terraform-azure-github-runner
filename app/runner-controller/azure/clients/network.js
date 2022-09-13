import { NetworkManagementClient } from "@azure/arm-network";

import { getAzureCredentials } from "../credentials.js";
import { getConfigValue } from "../config.js";

let _networkClient;

const createNetworkClient = async () => new NetworkManagementClient(getAzureCredentials(), (await getConfigValue("azure-subscription-id")));

export const getNetworkClient = async () => {
    if (!_networkClient) {
        _networkClient = await createNetworkClient();
    }

    return _networkClient;
};
