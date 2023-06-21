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
                    publicIPAddress: {
                        name: `${name}-pip`,
                        sku: {
                            name: "Basic",
                            tier: "Regional",
                        },
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
        galleryImageType,
        vmSize,
        adminPassword,
        customData,
        runnerIdentity,
        runnerIdentifierLabel,
    ] = await Promise.all([
        getConfigValue("azure-resource-group-name"),
        getConfigValue("azure-location"),
        getConfigValue("azure-gallery-image-id"),
        getConfigValue("azure-gallery-image-type"),
        getConfigValue("azure-vm-size"),
        getSecretValue("azure-runner-default-password"),
        getConfigValue("custom-data-script-base64-encoded"),
        getConfigValue("github-runner-identity"),
        getConfigValue("github-runner-identifier-label"),
    ]);

    // See Azure docs for more info on the different Azure Compute Gallery types:
    // https://learn.microsoft.com/azure/virtual-machines/azure-compute-gallery#sharing
    const GalleryType = Object.freeze({
        Community: "community",
        Shared: "direct-shared",
        RBAC: "rbac",
    });

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
                imageReference: (() => {
                    switch (galleryImageType) {
                    case GalleryType.Community:
                        return {
                            communityGalleryImageId: galleryImageId,
                        };
                    case GalleryType.Shared:
                        return {
                            sharedGalleryImageId: galleryImageId,
                        };
                    case GalleryType.RBAC:
                        return {
                            id: galleryImageId,
                        };
                    default:
                        throw new Error(`Unsupported gallery image type: ${galleryImageType}\n` +
                                `Supported types are: ${Object.values(GalleryType).map((value) => `'${value}'`).join(", ")}\n` +
                                "See Azure docs for more info on the different Azure Compute Gallery types: https://learn.microsoft.com/azure/virtual-machines/azure-compute-gallery#sharing");
                    }
                })(),
                osDisk: {
                    caching: "ReadWrite",
                    managedDisk: {
                        storageAccountType: "Standard_LRS",
                    },
                    name,
                    createOption: "FromImage",
                    deleteOption: "Delete",
                },
            },
            networkProfile: {
                networkInterfaces: [
                    {
                        id: networkInterface,
                        deleteOption: "Delete",
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

    await client.virtualMachines.beginDelete(
        resourceGroupName,
        name,
    );

    logger.debug("Deleting VM:", name);

    return true;
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
        if (vm.tags && vm.tags["managed-by"]) {
            result.push(vm);
        }
    }

    return result
        .filter((vm) => vm.tags["managed-by"] === runnerIdentifierLabel)
        .filter((vm) => !filteredProvisioningVMStates.has(vm.provisioningState));
};
