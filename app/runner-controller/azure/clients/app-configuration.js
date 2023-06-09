import { getAzureCredentials } from "../credentials.js";
import { AppConfigurationClient } from "@azure/app-configuration";

let _appConfigClient;

const createAppConfigurationClient = () =>
  new AppConfigurationClient(
    process.env.AZURE_APP_CONFIGURATION_ENDPOINT,
    getAzureCredentials()
  );

export const getAppConfigurationClient = () => {
  if (!_appConfigClient) {
    _appConfigClient = createAppConfigurationClient();
  }

  return _appConfigClient;
};
