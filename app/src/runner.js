const { v4: uuidv4 } = require("uuid");

const { createRegistrationToken } = require("./github");
const { createKeyVaultSecret, createVM, deleteVM, deleteKeyVaultSecret } = require("./azure");

const createRunner = async () => {
    const token = await createRegistrationToken();

    const name = "gh-runner-" + uuidv4();

    await createKeyVaultSecret(name, token);
    await createVM(name);

    return name;
};

const deleteRunner = async (name) => {
    await Promise.all([
        deleteKeyVaultSecret(name),
        deleteVM(name)
    ]);
};

module.exports = {
    createRunner,
    deleteRunner
};
