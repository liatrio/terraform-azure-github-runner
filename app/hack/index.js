const { getRegistrationToken } = require("../src/github");
const { v4: uuidv4 } = require("uuid");
const { createVM, deleteVM, addKeyVaultAccessPolicyForVM, storeKeyVaultSecret } = require("../src/azure");

(async () => {
    const now = new Date();

    const token = await getRegistrationToken();

    const name = "gh-runner-" + uuidv4();

    const [vmResponse, keyvaultSecretResponse] = await Promise.all([
        createVM(name),
        storeKeyVaultSecret(name,token)
    ]);

    const keyvaultPolicyResponse = await addKeyVaultAccessPolicyForVM(vmResponse.identity);

    // const deleteResponse = await deleteVM(name);

    const then = new Date();

    console.log("Took " + (then - now) / 1000 + " seconds");
})();
