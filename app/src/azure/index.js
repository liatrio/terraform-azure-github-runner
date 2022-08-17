const { ComputeManagementClient } = require("@azure/arm-compute");
const { NetworkManagementClient } = require("@azure/arm-network");
const { KeyVaultManagementClient } = require("@azure/arm-keyvault");
const { getConfigValue, getSecretValue } = require("./config");
const { getAzureCredentials } = require("./credentials");

let _computeClient,
    _networkClient,
    _keyVaultClient;

const createComputeClient = async () => new ComputeManagementClient(getAzureCredentials(), (await getConfigValue("azure-subscription-id")));

const getComputeClient = async () => {
    if (!_computeClient) {
        _computeClient = await createComputeClient();
    }

    return _computeClient;
}

const createNetworkClient = async () => new NetworkManagementClient(getAzureCredentials(), (await getConfigValue("azure-subscription-id")));

const getNetworkClient = async () => {
    if (!_networkClient) {
        _networkClient = await createNetworkClient();
    }

    return _networkClient;
}

const createKeyVaultClient = async () => new KeyVaultManagementClient(getAzureCredentials(), (await getConfigValue("azure-subscription-id")));

const getKeyVaultClient = async () => {
    if (!_keyVaultClient) {
        _keyVaultClient = await createKeyVaultClient();
    }

    return _keyVaultClient;
}

const storeKeyVaultSecret = async (secretName, secretValue) => {
    const client = await getKeyVaultClient();

    const [resourceGroupName, vault] = await Promise.all([
        getConfigValue("azure-resource-group-name"),
        getConfigValue("azure-registration-key-vault-name"),
    ]);

    const response = await client.secrets.createOrUpdate(resourceGroupName, vault, secretName, {
        tags: {
            "managed-by": "terraform-azure-github-runner",
        },
        properties: {
            value: secretValue,
            attributes: {
                enabled: true,
            }
        }
    });

    console.log("response", response);

    return response;
};

const createNetworkInterface = async (name) => {
    const client = await getNetworkClient();

    const [resourceGroupName, location, subnetId] = await Promise.all([
        getConfigValue("azure-resource-group-name"),
        getConfigValue("azure-location"),
        getConfigValue("azure-subnet-id"),
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
                        id: subnetId
                    }
                }
            ],
            tags: {
                "managed-by": "terraform-azure-github-runner",
            }
        }
    );

    return response.id;
};

const createVM = async (name) => {
    const client = await getComputeClient();
    const networkInterface = await createNetworkInterface(name);

    const [resourceGroupName, location, galleryImageId, adminPassword, customData, runnerIdentity] = await Promise.all([
        getConfigValue("azure-resource-group-name"),
        getConfigValue("azure-location"),
        getConfigValue("azure-gallery-image-id"),
        getSecretValue("azure-runner-default-password"),
        getConfigValue("custom-data-script-base64-encoded"),
        getConfigValue("github-runner-identity"),
    ]);

    const response = await client.virtualMachines.beginCreateOrUpdateAndWait(
        resourceGroupName,
        name,
        {
            identity: {
                type: "UserAssigned",
                userAssignedIdentities: {
                    [runnerIdentity]: {}
                }
            },
            location,
            hardwareProfile: {
                vmSize: "Standard_D2_v4"
            },
            storageProfile: {
                imageReference: {
                    id: galleryImageId,
                },
                osDisk: {
                    caching: "ReadWrite",
                    managedDisk: {
                        storageAccountType: "Standard_LRS"
                    },
                    name,
                    createOption: "FromImage"
                },
            },
            networkProfile: {
                networkInterfaces: [
                    {
                        id: networkInterface,
                    }
                ],
            },
            osProfile: {
                computerName: name,
                adminUsername: "runner-admin",
                adminPassword,
                customData,
            },
            tags: {
                "managed-by": "terraform-azure-github-runner",
            }
        }
    );

    console.log("response", response);

    return response;
}

const deleteVM = async (name) => {
    const client = await getComputeClient();
    const resourceGroupName = await getConfigValue("azure-resource-group-name");

    const response = await client.virtualMachines.beginDeleteAndWait(
        resourceGroupName,
        name
    );

    console.log("VM deleted", response);

    await Promise.all([
        deleteNetworkInterface(name),
        deleteOsDisk(name)
    ]);
};

const deleteNetworkInterface = async (name) => {
    const client = await getNetworkClient();
    const resourceGroupName = await getConfigValue("azure-resource-group-name");

    const response = await client.networkInterfaces.beginDeleteAndWait(
        resourceGroupName,
        name
    );

    console.log("NIC deleted", response);
}

const deleteOsDisk = async (name) => {
    const client = await getComputeClient();
    const resourceGroupName = await getConfigValue("azure-resource-group-name");

    const response = await client.disks.beginDeleteAndWait(
        resourceGroupName,
        name
    );

    console.log("Disk deleted", response);
}

module.exports = {
    createVM,
    deleteVM,
    createNetworkInterface,
    storeKeyVaultSecret,
};
