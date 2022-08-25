import { ServiceBusClient } from "@azure/service-bus";

import { getAzureCredentials } from "../credentials.js";
import { getConfigValue } from "../config.js";

let _serviceBusClient;

const createServiceBusClient = async () => new ServiceBusClient(
    (await getConfigValue("azure-service-bus-namespace-uri")),
    getAzureCredentials()
);

export const getServiceBusClient = async () => {
    if (!_serviceBusClient) {
        _serviceBusClient = await createServiceBusClient();
    }

    return _serviceBusClient;
};
