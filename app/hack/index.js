const { getRegistrationToken } = require("../src/github");
const { v4: uuidv4 } = require("uuid");
const { createVM, deleteVM, storeKeyVaultSecret } = require("../src/azure");

(async () => {
    const now = new Date();

    const token = await getRegistrationToken();

    const name = "gh-runner-" + uuidv4();

    await storeKeyVaultSecret(name,token);
    await createVM(name);

    // const deleteResponse = await deleteVM(name);

    const then = new Date();

    console.log("Took " + (then - now) / 1000 + " seconds");
})();
