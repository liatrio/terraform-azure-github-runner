const { AzureCliCredential } = require("@azure/identity");

let _azureCredentials;

const getAzureCredentials = () => {
    if (!_azureCredentials) {
        // TODO: this needs to be able to handle CLI and MSI credentials in the future
        _azureCredentials = new AzureCliCredential();
    }

    return _azureCredentials;
};

module.exports = {
    getAzureCredentials
};
