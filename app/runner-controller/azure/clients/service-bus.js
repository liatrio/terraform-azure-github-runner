import { ServiceBusClient, ServiceBusAdministrationClient } from "@azure/service-bus";

import { getAzureCredentials } from "../credentials.js";
import { getConfigValue } from "../config.js";

let _serviceBusClient, _serviceBusAdminClient;

const createServiceBusClient = async () => new ServiceBusClient(
    (await getConfigValue("azure-service-bus-namespace-uri")),
    getAzureCredentials(),
);

export const getServiceBusClient = async () => {
    if (!_serviceBusClient) {
        _serviceBusClient = await createServiceBusClient();
    }

    return _serviceBusClient;
};

const createServiceBusAdministrationClient = async () => new ServiceBusAdministrationClient(
    (await getConfigValue("azure-service-bus-namespace-uri")),
    getAzureCredentials(),
);

export const getServiceBusAdministrationClient = async () => {
    if (!_serviceBusAdminClient) {
        _serviceBusAdminClient = await createServiceBusAdministrationClient();
    }

    return _serviceBusAdminClient;
};
