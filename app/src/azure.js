const {v4: uuidv4} = require("uuid");

const { ComputeManagementClient } = require("@azure/arm-compute");
const { NetworkManagementClient } = require("@azure/arm-network");
const { DefaultAzureCredential } = require("@azure/identity");

let _computeClient,
    _networkClient;

const createComputeClient = () => new ComputeManagementClient(new DefaultAzureCredential(), process.env.AZURE_SUBSCRIPTION_ID);

const getComputeClient = () => {
    if (!_computeClient) {
        _computeClient = createComputeClient();
    }

    return _computeClient;
}

const createNetworkClient = () => new NetworkManagementClient(new DefaultAzureCredential(), process.env.AZURE_SUBSCRIPTION_ID);

const getNetworkClient = () => {
    if (!_networkClient) {
        _networkClient = createNetworkClient();
    }

    return _networkClient;
}

const createNetworkInterface = async (name) => {
    const client = getNetworkClient();
    const response = await client.networkInterfaces.beginCreateOrUpdateAndWait(
        process.env.AZURE_RESOURCE_GROUP_NAME,
        name,
        {
            location: process.env.AZURE_LOCATION,
            ipConfigurations: [
                {
                    name,
                    subnet: {
                        id: process.env.AZURE_SUBNET_ID
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

const createVM = async () => {
    const client = getComputeClient();
    const name = "gh-runner-" + uuidv4();

    const networkInterface = await createNetworkInterface(name);

    const response = await client.virtualMachines.beginCreateOrUpdateAndWait(
        process.env.AZURE_RESOURCE_GROUP_NAME,
        name,
        {
            identity: {
                type: "SystemAssigned",
            },
            location: process.env.AZURE_LOCATION,
            hardwareProfile: {
                vmSize: "Standard_D2_v4"
            },
            storageProfile: {
                imageReference: {
                    id: process.env.AZURE_GALLERY_IMAGE_ID
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
                adminUsername: "ubuntu",
                adminPassword: "Aa!1()-xyz",
            },
            tags: {
                "managed-by": "terraform-azure-github-runner",
            }
        }
    );

    console.log("response", response);
}

const deleteVM = async (name) => {
    const client = getComputeClient();

    const response = await client.virtualMachines.beginDeleteAndWait(
        process.env.AZURE_RESOURCE_GROUP_NAME,
        name
    );

    console.log("VM deleted", response);

    await Promise.all([
        deleteNetworkInterface(name),
        deleteOsDisk(name)
    ]);
};

const deleteNetworkInterface = async (name) => {
    const client = getNetworkClient();

    const response = await client.networkInterfaces.beginDeleteAndWait(
        process.env.AZURE_RESOURCE_GROUP_NAME,
        name
    );

    console.log("NIC deleted", response);
}

const deleteOsDisk = async (name) => {
    const client = getComputeClient();

    const response = await client.disks.beginDeleteAndWait(
        process.env.AZURE_RESOURCE_GROUP_NAME,
        name
    );

    console.log("Disk deleted", response);
}

module.exports = {
    createVM,
    deleteVM,
    createNetworkInterface
};
