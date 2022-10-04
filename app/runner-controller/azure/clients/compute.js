import { ComputeManagementClient } from "@azure/arm-compute";

import { getAzureCredentials } from "../credentials.js";
import { getConfigValue } from "../config.js";

let _computeClient;

const createComputeClient = async () => new ComputeManagementClient(getAzureCredentials(), (await getConfigValue("azure-subscription-id")));

export const getComputeClient = async () => {
    if (!_computeClient) {
        _computeClient = await createComputeClient();
    }

    return _computeClient;
};
