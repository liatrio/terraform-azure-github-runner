import { getConfigValue, getSecretValue } from "./config.js";
import { getSecretClient } from "./clients/secrets.js";
import { getNetworkClient } from "./clients/network.js";
import { getComputeClient } from "./clients/compute.js";
import { getLogger } from "../logger.js";

export const createKeyVaultSecret = async (secretName, secretValue) => {
    const keyVaultUrl = await getConfigValue("azure-registration-key-vault-url");
    const client = getSecretClient(keyVaultUrl);

    await client.setSecret(secretName, secretValue);
};

export const deleteKeyVaultSecret = async (secretName) => {
    const keyVaultUrl = await getConfigValue("azure-registration-key-vault-url");
    const client = getSecretClient(keyVaultUrl);

    await client.beginDeleteSecret(secretName);
};

const createNetworkInterface = async (name) => {
    const client = await getNetworkClient();

    const [resourceGroupName, location, subnetId, runnerIdentifierLabel] = await Promise.all([
        getConfigValue("azure-resource-group-name"),
        getConfigValue("azure-location"),
        getConfigValue("azure-subnet-id"),
        getConfigValue("github-runner-identifier-label"),
    ]);

    const response = await client.networkInterfaces.beginCreateOrUpdateAndWait(
        resourceGroupName,
        name,
        {
            location,
            ipConfigurations: [
                {
                    name,
                    subnet: {
                        id: subnetId,
                    },
                },
            ],
            tags: {
                "managed-by": runnerIdentifierLabel,
            },
        },
    );

    return response.id;
};

export const createVM = async (name) => {
    const client = await getComputeClient();
    const networkInterface = await createNetworkInterface(name);

    const [
        resourceGroupName,
        location,
        galleryImageId,
        vmSize,
        adminPassword,
        customData,
        runnerIdentity,
        runnerIdentifierLabel,
    ] = await Promise.all([
        getConfigValue("azure-resource-group-name"),
        getConfigValue("azure-location"),
        getConfigValue("azure-gallery-image-id"),
        getConfigValue("azure-vm-size"),
        getSecretValue("azure-runner-default-password"),
        getConfigValue("custom-data-script-base64-encoded"),
        getConfigValue("github-runner-identity"),
        getConfigValue("github-runner-identifier-label"),
    ]);

    await client.virtualMachines.beginCreateOrUpdate(
        resourceGroupName,
        name,
        {
            identity: {
                type: "UserAssigned",
                userAssignedIdentities: {
                    [runnerIdentity]: {},
                },
            },
            location,
            hardwareProfile: {
                vmSize,
            },
            priority: "Spot",
            evictionPolicy: "Delete",
            storageProfile: {
                imageReference: {
                    id: galleryImageId,
                },
                osDisk: {
                    caching: "ReadWrite",
                    managedDisk: {
                        storageAccountType: "Standard_LRS",
                    },
                    name,
                    createOption: "FromImage",
                },
            },
            networkProfile: {
                networkInterfaces: [
                    {
                        id: networkInterface,
                    },
                ],
            },
            osProfile: {
                computerName: name,
                adminUsername: "runner-admin",
                adminPassword,
                customData,
            },
            tags: {
                "managed-by": runnerIdentifierLabel,
            },
        },
    );
};

export const deleteVM = async (name) => {
    const logger = getLogger();
    const client = await getComputeClient();
    const resourceGroupName = await getConfigValue("azure-resource-group-name");

    await client.virtualMachines.beginDeleteAndWait(
        resourceGroupName,
        name,
    );

    await Promise.all([
        deleteNetworkInterface(name),
        deleteOsDisk(name),
    ]);
    logger.debug("Deleting VM:", name);

    return true;
};

const deleteNetworkInterface = async (name) => {
    const client = await getNetworkClient();
    const resourceGroupName = await getConfigValue("azure-resource-group-name");

    await client.networkInterfaces.beginDelete(
        resourceGroupName,
        name,
    );
};

const deleteOsDisk = async (name) => {
    const client = await getComputeClient();
    const resourceGroupName = await getConfigValue("azure-resource-group-name");

    await client.disks.beginDelete(
        resourceGroupName,
        name,
    );
};

export const listAzureRunnerVMs = async () => {
    const client = await getComputeClient();
    const filteredProvisioningVMStates = new Set(["Deleting", "Failed"]);
    const [resourceGroupName, runnerIdentifierLabel] = await Promise.all([
        getConfigValue("azure-resource-group-name"),
        getConfigValue("github-runner-identifier-label"),
    ]);

    const result = [];

    for await (const vm of client.virtualMachines.list(resourceGroupName)) {
        result.push(vm);
    }

    return result
        .filter((vm) => vm.tags["managed-by"] === runnerIdentifierLabel)
        .filter((vm) => !filteredProvisioningVMStates.has(vm.provisioningState));
};
