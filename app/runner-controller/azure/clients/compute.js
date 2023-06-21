import { getConfigValue } from "../config.js";
import { getAzureCredentials } from "../credentials.js";
import { ComputeManagementClient } from "@azure/arm-compute";

let _computeClient;

const createComputeClient = async () =>
  new ComputeManagementClient(
    getAzureCredentials(),
    await getConfigValue("azure-subscription-id")
  );

export const getComputeClient = async () => {
  if (!_computeClient) {
    _computeClient = await createComputeClient();
  }

  return _computeClient;
};
